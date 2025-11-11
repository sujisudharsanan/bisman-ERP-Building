package main

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/sajari/fuzzy"
)

// Plugin implements the interface expected by the Mattermost server
type Plugin struct {
	plugin.MattermostPlugin
	botID               string
	fuzzyModel          *fuzzy.Model
	lastContext         map[string]string                // userID -> last topic for context
	conversationHistory map[string][]ConversationMessage // userID -> message history (expanded to 50 messages)
	typingDelay         bool                             // Simulate human typing
	userPreferences     map[string]UserPreference        // userID -> preferences
	conversationState   map[string]ConversationState     // userID -> current conversation state
}

// UserPreference stores user-specific settings
type UserPreference struct {
	PreferredLanguage string
	DetailLevel       string // "brief", "normal", "detailed"
	ShowEmojis        bool
	RememberContext   bool
}

// ConversationState tracks multi-turn conversations
type ConversationState struct {
	Topic         string
	SubTopic      string
	AwaitingInput bool
	LastQuestion  string
	FollowUpCount int
}

// ConversationMessage represents a single message in the conversation history
type ConversationMessage struct {
	Role      string    // "user" or "assistant"
	Content   string    // The message content
	Timestamp time.Time // When the message was sent
}

// Entity represents a detected entity in user input
type Entity struct {
	Type  string // "module", "action", "document_type"
	Value string
}

// IntentAnalysis contains parsed information from user message
type IntentAnalysis struct {
	Intent     string
	Entities   []Entity
	Confidence float64
}

// ERP vocabulary for spell correction
var erpVocabulary = []string{
	// Common ERP terms
	"invoice", "invoices", "purchase", "order", "orders", "vendor", "vendors",
	"customer", "customers", "payment", "payments", "receipt", "receipts",
	"attendance", "leave", "leaves", "salary", "payroll", "employee", "employees",
	"inventory", "stock", "product", "products", "warehouse", "dispatch",
	"billing", "quotation", "estimate", "approval", "approvals", "workflow",
	"report", "reports", "dashboard", "analytics", "finance", "accounting",
	"asset", "assets", "depreciation", "journal", "ledger", "balance",
	"petty", "cash", "expense", "expenses", "reimbursement", "claim",
	"timesheet", "timesheets", "overtime", "shift", "shifts", "roster",
	"grn", "goods", "received", "note", "delivery", "challan",

	// Common actions
	"create", "creating", "make", "making", "add", "adding", "delete", "deleting",
	"edit", "editing", "update", "updating", "view", "viewing", "search", "searching",
	"approve", "approving", "reject", "rejecting", "submit", "submitting",
	"export", "exporting", "print", "printing", "download", "downloading",

	// Common questions
	"how", "what", "where", "when", "who", "why", "which",
	"help", "need", "want", "show", "find", "get",
}

// OnActivate is called when the plugin is activated
func (p *Plugin) OnActivate() error {
	// Initialize maps
	p.lastContext = make(map[string]string)
	p.conversationHistory = make(map[string][]ConversationMessage)
	p.userPreferences = make(map[string]UserPreference)
	p.conversationState = make(map[string]ConversationState)

	// Initialize and train fuzzy model
	p.fuzzyModel = fuzzy.NewModel()
	p.fuzzyModel.SetThreshold(1) // Allow some spelling mistakes
	p.fuzzyModel.SetDepth(2)     // Check up to 2 character changes

	// Train with ERP vocabulary
	p.fuzzyModel.Train(erpVocabulary)

	// Ensure bot user exists or create it
	const botUsername = "erpbot"
	if user, appErr := p.API.GetUserByUsername(botUsername); appErr == nil && user != nil {
		p.botID = user.Id
	} else {
		bot := &model.Bot{
			Username:    botUsername,
			DisplayName: "ERP Assistant",
			Description: "Internal ERP helper bot",
		}
		if created, cerr := p.API.CreateBot(bot); cerr == nil && created != nil {
			p.botID = created.UserId
		} else if user2, gerr := p.API.GetUserByUsername(botUsername); gerr == nil && user2 != nil {
			// Race-safe fallback if created concurrently
			p.botID = user2.Id
		} else {
			p.API.LogError("Failed to ensure erpbot user", "error", cerr)
		}
	}

	p.API.LogInfo("ERP Assistant plugin activated successfully", "bot_id", p.botID)
	return nil
}

// MessageHasBeenPosted handles new posts and replies when appropriate
func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Safety checks
	if post == nil || post.Id == "" || post.UserId == "" {
		return
	}
	// Ignore our own posts
	if p.botID != "" && post.UserId == p.botID {
		return
	}

	// Fetch channel to decide if DM
	ch, err := p.API.GetChannel(post.ChannelId)
	if err != nil || ch == nil {
		return
	}

	lower := strings.ToLower(post.Message)
	addressed := false

	// Respond if in a DM with the bot
	if ch.Type == model.ChannelTypeDirect {
		addressed = true
	}

	// Or if bot is mentioned by name
	if !addressed {
		if strings.Contains(lower, "@erpbot") || strings.Contains(lower, "erpbot") {
			addressed = true
		}
	}

	if !addressed {
		return
	}

	// Update conversation history (store latest user message)
	userID := post.UserId
	p.conversationHistory[userID] = append(p.conversationHistory[userID], ConversationMessage{
		Role:      "user",
		Content:   post.Message,
		Timestamp: time.Now(),
	})

	// Analyze and compose reply
	ctx := p.getConversationContext(userID)
	analysis := p.analyzeIntent(post.Message)
	reply := p.generateFriendlyReply(ctx, analysis)

	// Create threaded reply from bot
	if p.botID == "" {
		// As a fallback, do nothing if botID not set
		p.API.LogWarn("Bot ID not set; skipping reply")
		return
	}

	resp := &model.Post{
		UserId:    p.botID,
		ChannelId: post.ChannelId,
		Message:   reply,
		RootId:    post.Id,
	}
	if _, appErr := p.API.CreatePost(resp); appErr != nil {
		p.API.LogError("Failed to post bot reply", "error", appErr.Error())
		return
	}

	// Store assistant reply in history
	p.conversationHistory[userID] = append(p.conversationHistory[userID], ConversationMessage{
		Role:      "assistant",
		Content:   reply,
		Timestamp: time.Now(),
	})
}

// ERP modules and their aliases
var moduleAliases = map[string][]string{
	"finance":     {"finance", "billing", "accounting", "money", "payment"},
	"procurement": {"procurement", "purchase", "buying", "vendor", "supplier"},
	"hr":          {"hr", "human", "resources", "employee", "staff", "people"},
	"inventory":   {"inventory", "stock", "warehouse", "goods", "items"},
	"workflow":    {"workflow", "approval", "process", "task"},
	"reports":     {"reports", "analytics", "dashboard", "stats"},
}

// Document type patterns
var documentTypes = map[string][]string{
	"invoice":        {"invoice", "bill", "billing"},
	"purchase_order": {"purchase", "order", "po"},
	"leave":          {"leave", "vacation", "time", "off", "absent"},
	"attendance":     {"attendance", "present", "check", "in"},
	"receipt":        {"receipt", "payment", "proof"},
	"quotation":      {"quotation", "quote", "estimate"},
}

// Friendly openers
var openers = []string{
	"Sure thing! 😊",
	"Got it!",
	"Happy to help! 🎯",
	"Right away —",
	"Let me help you with that!",
	"No problem!",
	"I'm on it! 💪",
	"Absolutely!",
	"Coming right up!",
	"Of course! ✨",
	"Let's fix that!",
	"Sure —",
}

// Friendly closers
var closers = []string{
	"Anything else I can help with?",
	"Want me to show you the details?",
	"Need a link to that page?",
	"Would you like a quick walkthrough?",
	"Should I explain any of the fields?",
	"Let me know if you need more info! 📝",
	"Feel free to ask if you get stuck!",
	"Just ping me anytime! 💬",
	"Need anything else?",
	"Want a summary?",
}

// (removed unused spellCorrectSentence)

// Extract entities from message using lightweight pattern matching
func (p *Plugin) extractEntities(message string) []Entity {
	entities := []Entity{}
	lowerMessage := strings.ToLower(message)

	// Detect modules
	for module, aliases := range moduleAliases {
		for _, alias := range aliases {
			if strings.Contains(lowerMessage, alias) {
				entities = append(entities, Entity{Type: "module", Value: module})
				break
			}
		}
	}

	// Detect document types
	for docType, aliases := range documentTypes {
		for _, alias := range aliases {
			if strings.Contains(lowerMessage, alias) {
				entities = append(entities, Entity{Type: "document", Value: docType})
				break
			}
		}
	}

	// Detect actions
	actions := []string{"create", "view", "edit", "delete", "update", "search", "approve", "reject"}
	for _, action := range actions {
		if strings.Contains(lowerMessage, action) {
			entities = append(entities, Entity{Type: "action", Value: action})
			break
		}
	}

	return entities
}

// Calculate confidence score based on matches
func (p *Plugin) calculateConfidence(message string, intent string, entities []Entity) float64 {
	score := 0.5 // Base score

	// Boost if entities found
	if len(entities) > 0 {
		score += 0.2
	}
	if len(entities) > 1 {
		score += 0.1
	}

	// Boost for exact keywords
	lowerMessage := strings.ToLower(message)
	if strings.Contains(lowerMessage, intent) {
		score += 0.2
	}

	if score > 1.0 {
		score = 1.0
	}

	return score
}

// Analyze intent with entity extraction (lightweight NLP alternative to prose)
func (p *Plugin) analyzeIntent(message string) IntentAnalysis {
	lowerMessage := strings.ToLower(message)
	entities := p.extractEntities(message)

	// Determine intent from keywords
	intent := "general"
	if strings.Contains(lowerMessage, "create") || strings.Contains(lowerMessage, "make") || strings.Contains(lowerMessage, "add") {
		intent = "create"
	} else if strings.Contains(lowerMessage, "view") || strings.Contains(lowerMessage, "show") || strings.Contains(lowerMessage, "see") {
		intent = "view"
	} else if strings.Contains(lowerMessage, "edit") || strings.Contains(lowerMessage, "update") || strings.Contains(lowerMessage, "change") {
		intent = "edit"
	} else if strings.Contains(lowerMessage, "delete") || strings.Contains(lowerMessage, "remove") {
		intent = "delete"
	} else if strings.Contains(lowerMessage, "approve") || strings.Contains(lowerMessage, "approval") {
		intent = "approve"
	} else if strings.Contains(lowerMessage, "report") || strings.Contains(lowerMessage, "dashboard") {
		intent = "report"
	} else if strings.Contains(lowerMessage, "help") || strings.Contains(lowerMessage, "how") {
		intent = "help"
	}

	confidence := p.calculateConfidence(message, intent, entities)

	return IntentAnalysis{
		Intent:     intent,
		Entities:   entities,
		Confidence: confidence,
	}
}

// Get random opener for human-like responses
func randomOpener() string {
	return openers[rand.Intn(len(openers))]
}

// Get random closer for human-like responses
func randomCloser() string {
	return closers[rand.Intn(len(closers))]
}

// Generate friendly human-like response with emojis and context
func (p *Plugin) generateFriendlyReply(_ string, analysis IntentAnalysis) string {
	opener := randomOpener()
	closer := randomCloser()

	// Extract module and document from entities
	var module, document string
	for _, entity := range analysis.Entities {
		if entity.Type == "module" {
			module = entity.Value
		} else if entity.Type == "document" {
			document = entity.Value
		}
	}

	// Generate contextual response based on intent and entities
	var body string

	switch analysis.Intent {
	case "create":
		if module != "" && document != "" {
			body = fmt.Sprintf("To create a new %s in the %s module:\n\n1. Go to **%s Module** 🎯\n2. Click on **%s** section\n3. Hit the **+ Create** button\n4. Fill in the required details\n5. Click **Save** when done!\n\nThe system will auto-generate the document number and notify relevant approvers.",
				document, module, strings.Title(module), strings.Title(document))
		} else if module != "" {
			body = fmt.Sprintf("In the **%s module**, you can create:\n• Invoices 📄\n• Purchase Orders 📦\n• Reports 📊\n\nJust navigate to the module and look for the **+ Create** button!",
				strings.Title(module))
		} else {
			body = "You can create:\n• **Invoices** (Finance Module)\n• **Purchase Orders** (Procurement)\n• **Leave Requests** (HR)\n• **Attendance Records** (HR)\n\nWhich would you like to create?"
		}

	case "view", "show":
		if module != "" {
			body = fmt.Sprintf("To view records in **%s**:\n\n1. Click the **%s** module in the sidebar 📋\n2. You'll see a list/table of all records\n3. Use filters and search to find specific items\n4. Click any row to see full details\n\nYou can also export to Excel or PDF from the top-right corner! 📥",
				strings.Title(module), strings.Title(module))
		} else {
			body = "You can view:\n• **Invoices** 📄\n• **Purchase Orders** 📦\n• **Attendance Records** ⏰\n• **Reports & Analytics** 📊\n\nWhich module are you interested in?"
		}

	case "approve":
		body = "For **approvals**, here's the workflow:\n\n1. Go to **Workflow** or **Approvals** section 📝\n2. You'll see pending items in **My Tasks**\n3. Click to review details\n4. Add comments if needed 💬\n5. Click **Approve** ✅ or **Reject** ❌\n\nThe system will notify the next approver or requester automatically!"

	case "report":
		body = "Access **Reports** from:\n\n1. **Dashboard** → Real-time analytics 📊\n2. **Reports Module** → Detailed reports\n3. **Finance** → Financial reports 💰\n4. **HR** → Attendance & payroll reports\n\nYou can filter by date, department, and export to Excel/PDF!"

	case "help":
		if module != "" {
			body = fmt.Sprintf("**%s Module** helps you:\n• Manage all %s-related tasks\n• Track records and approvals\n• Generate reports\n• Handle workflows\n\nWhat specific task do you need help with?",
				strings.Title(module), module)
		} else {
			body = "I can help you with:\n• Creating invoices, POs, leaves 📝\n• Viewing and searching records 🔍\n• Approvals and workflows ✅\n• Generating reports 📊\n• Navigating modules 🧭\n\nWhat would you like to know more about?"
		}

	default:
		body = "I understand you're looking for help with the ERP system! 😊\n\nI can assist with:\n• **Finance** - Invoices, payments, billing 💰\n• **Procurement** - Purchase orders, vendors 📦\n• **HR** - Attendance, leave, payroll 👥\n• **Inventory** - Stock, warehouse 📊\n• **Workflows** - Approvals, tasks ✅\n\nCould you tell me more about what you need?"
	}

	return fmt.Sprintf("%s %s\n\n%s", opener, body, closer)
}

// (removed unused detectIntent; analyzeIntent supersedes it)

// storeConversationMessage adds a message to user's conversation history
// (removed unused storeConversationMessage)

// getConversationContext returns recent conversation for context (enhanced)
func (p *Plugin) getConversationContext(userID string) string {
	history := p.conversationHistory[userID]
	if len(history) == 0 {
		return ""
	}

	// ✅ MAXIMUM CONTEXT: Build context from last 10 user messages
	// Provides much richer context for better AI understanding
	var context strings.Builder
	count := 0
	for i := len(history) - 1; i >= 0 && count < 10; i-- {
		if history[i].Role == "user" {
			context.WriteString(history[i].Content)
			context.WriteString(" ")
			count++
		}
	}

	return context.String()
}

// ✅ MAXIMUM CHAT CAPACITY: Advanced conversation features

// detectFollowUp checks if message is a follow-up question
func (p *Plugin) detectFollowUp(userID, message string) bool {
	lowerMsg := strings.ToLower(message)
	followUpPhrases := []string{
		"more", "tell me more", "explain", "how about", "what about",
		"can you", "also", "and", "details", "elaborate", "continue",
		"yes", "okay", "sure", "go on", "next", "then what",
	}

	for _, phrase := range followUpPhrases {
		if strings.Contains(lowerMsg, phrase) {
			return true
		}
	}

	// Check if message is very short (likely a follow-up)
	words := strings.Fields(message)
	if len(words) <= 3 && p.lastContext[userID] != "" {
		return true
	}

	return false
}

// getDetailedExplanation provides in-depth explanations
func (p *Plugin) getDetailedExplanation(topic string) string {
	detailedResponses := map[string]string{
		"invoice": `📝 **Complete Invoice Guide**

**What is an Invoice?**
An invoice is a commercial document that itemizes and records a transaction between a buyer and a seller. It's essentially a bill requesting payment.

**Creating an Invoice:**
1. Navigate to **Finance → Billing → New Invoice**
2. Select customer from dropdown or create new
3. Add invoice details:
   - Invoice date (auto-filled with today)
   - Due date (configurable: Net 30, Net 60, etc.)
   - Payment terms
4. Add line items:
   - Product/Service name
   - Description
   - Quantity
   - Unit price
   - Tax rate (auto-calculated)
5. Review totals:
   - Subtotal
   - Tax amount
   - Discount (if applicable)
   - Final total
6. Click **Save & Send**

**Advanced Features:**
✨ **Templates** - Save frequently used invoice formats
✨ **Recurring Invoices** - Auto-generate monthly/weekly invoices
✨ **Multi-currency** - Bill in any currency with real-time rates
✨ **Payment Integration** - Accept online payments directly
✨ **Auto-reminders** - Send payment reminders automatically

**Best Practices:**
✅ Always add invoice notes for special instructions
✅ Use clear item descriptions
✅ Set realistic payment terms
✅ Track payment status regularly
✅ Follow up on overdue invoices promptly

Need help with any specific part?`,

		"leave": `🏖️ **Complete Leave Management Guide**

**Types of Leave:**
1. **Sick Leave** - Medical emergencies, illness
2. **Casual Leave** - Personal reasons, family events
3. **Annual Leave** - Vacation, planned time off
4. **Unpaid Leave** - Extended absences
5. **Compensatory Off** - For overtime work
6. **Maternity/Paternity Leave** - New parents

**Applying for Leave:**
1. Go to **HR → Leave Management → Apply Leave**
2. Select leave type from dropdown
3. Choose dates:
   - Start date
   - End date
   - Half day option available
4. Calculate total days (auto-calculated)
5. Add reason (be specific and professional)
6. Attach documents if needed (medical certificate, etc.)
7. Submit for approval

**Approval Workflow:**
Manager Review → HR Review → Final Approval

**Leave Balance:**
- View remaining leave in **My Profile → Leave Balance**
- Different types have different quotas
- Unused leave may roll over (depends on company policy)

**Pro Tips:**
✅ Apply well in advance (1 week minimum)
✅ Plan leaves around project deadlines
✅ Keep manager informed
✅ Provide handover notes for extended leave
✅ Check team calendar for conflicts

**Emergency Leave:**
For sudden emergencies, you can apply retrospectively with proper justification and documents.

Want to know more about specific leave types?`,

		"approval": `✅ **Complete Approval Workflow Guide**

**What Gets Approved:**
- Purchase Orders over threshold
- Leave requests
- Expense claims
- Invoice payments
- Budget allocations
- Resource requests

**Approval Levels:**
1. **First Level** - Immediate manager/supervisor
2. **Second Level** - Department head
3. **Final Level** - Finance/Executive (for high-value items)

**Approval Process:**
1. Navigate to **Workflow → My Tasks** or **Approvals**
2. See pending items with:
   - Request type
   - Requester name
   - Amount (if applicable)
   - Submitted date
   - Priority
3. Click on item to review:
   - Full details
   - Attachments
   - Comments/notes
   - History/audit trail
4. Take action:
   - **Approve** ✅ - Move to next level
   - **Reject** ❌ - Send back with reason
   - **Request Changes** 📝 - Ask for modifications
   - **Defer** ⏸️ - Need more time/info

**Email Notifications:**
📧 Get instant emails for:
- New approval requests
- Status updates
- Escalations (if delayed)
- Final decisions

**Mobile App:**
📱 Approve on-the-go from mobile app

**Best Practices:**
✅ Review within 24-48 hours
✅ Add clear comments if rejecting
✅ Check attached documents thoroughly
✅ Verify budget availability
✅ Consider business impact
✅ Maintain audit trail

**Escalation:**
If no action taken within SLA:
- Auto-escalates to next level
- Sends reminders
- Flags in dashboard

Need help with a specific approval type?`,
	}

	if detailed, exists := detailedResponses[topic]; exists {
		return detailed
	}

	return "I can provide detailed information! What would you like to know more about? (invoice, leave, approval, purchase order, etc.)"
}

// generateContextualReply creates intelligent replies using conversation history and NLP
// (removed unused generateContextualReply)
