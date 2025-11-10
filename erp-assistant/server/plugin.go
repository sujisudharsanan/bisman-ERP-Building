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
	botID          string
	fuzzyModel     *fuzzy.Model
	lastContext    map[string]string                // userID -> last topic for context
	conversationHistory map[string][]ConversationMessage // userID -> message history
	typingDelay    bool                             // Simulate human typing
}

// ConversationMessage stores user messages for context
type ConversationMessage struct {
	Role      string
	Content   string
	Timestamp time.Time
}

// Entity represents a detected entity in user input
type Entity struct {
	Type  string // "module", "action", "document_type"
	Value string
}

// IntentAnalysis contains parsed information from user message
type IntentAnalysis struct {
	Intent    string
	Entities  []Entity
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

// OnActivate is invoked when the plugin is activated
func (p *Plugin) OnActivate() error {
	p.API.LogInfo("🚀 ERP Assistant plugin activating...")
	
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())
	
	// Initialize context memory
	p.lastContext = make(map[string]string)
	p.conversationHistory = make(map[string][]ConversationMessage)
	p.API.LogInfo("✅ Context memory initialized")
	
	// Initialize fuzzy spell checker
	p.fuzzyModel = fuzzy.NewModel()
	p.fuzzyModel.SetThreshold(1) // Allow 1 character difference
	p.fuzzyModel.SetDepth(2)     // Check 2-letter combinations
	
	// Train the model with ERP vocabulary
	p.API.LogInfo("Training fuzzy model with ERP vocabulary...", "words", len(erpVocabulary))
	p.fuzzyModel.Train(erpVocabulary)
	p.API.LogInfo("✅ Fuzzy model training complete")
	
	// Create or find bot user
	bot := &model.Bot{
		Username:    "erpbot",
		DisplayName: "ERP Assistant",
		Description: "🤖 Your friendly ERP helper - I understand typos and speak human! 100% internal, no external APIs.",
	}
	
	p.API.LogInfo("Looking for bot user 'erpbot'...")
	createdBot, err := p.API.CreateBot(bot)
	if err != nil {
		p.API.LogWarn("Bot creation returned error, checking if bot exists", "error", err.Error())
		user, userErr := p.API.GetUserByUsername(bot.Username)
		if userErr != nil {
			p.API.LogError("Failed to find existing bot", "error", userErr.Error())
			return userErr
		}
		if user.IsBot {
			p.botID = user.Id
			p.API.LogInfo("✅ Found existing ERP Assistant bot", "botID", p.botID)
		} else {
			p.API.LogError("User 'erpbot' exists but is not a bot!")
			return fmt.Errorf("erpbot user exists but is not a bot")
		}
	} else {
		p.botID = createdBot.UserId
		p.API.LogInfo("✅ Created new ERP Assistant bot", "botID", p.botID)
	}
	
	p.API.LogInfo("🎉 ERP Assistant plugin activated successfully!", "botID", p.botID, "vocabulary", len(erpVocabulary))
	
	return nil
}

// spellCorrectSentence corrects spelling errors in a sentence
func (p *Plugin) spellCorrectSentence(sentence string) string {
	words := strings.Fields(sentence)
	corrected := make([]string, 0, len(words))
	
	for _, word := range words {
		// Keep punctuation
		cleaned := strings.ToLower(strings.Trim(word, ",.!?;:"))
		if cleaned == "" {
			corrected = append(corrected, word)
			continue
		}
		
		// Try to find suggestion
		suggestions := p.fuzzyModel.Suggestions(cleaned, false)
		if len(suggestions) > 0 {
			// Use best suggestion
			corrected = append(corrected, suggestions[0])
		} else {
			// Keep original if no suggestion
			corrected = append(corrected, word)
		}
	}
	
	return strings.Join(corrected, " ")
}

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
func (p *Plugin) generateFriendlyReply(message string, analysis IntentAnalysis) string {
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

// detectIntent determines what the user is asking about (lightweight version)
func detectIntent(message string) string {
	m := strings.ToLower(message)
	
	// Check for specific topics
	if strings.Contains(m, "invoice") || strings.Contains(m, "billing") {
		return "invoice"
	}
	if strings.Contains(m, "purchase") || strings.Contains(m, "order") || strings.Contains(m, "po") {
		return "purchase_order"
	}
	if strings.Contains(m, "leave") || strings.Contains(m, "absent") {
		return "leave"
	}
	if strings.Contains(m, "attendance") || strings.Contains(m, "timesheet") {
		return "attendance"
	}
	if strings.Contains(m, "inventory") || strings.Contains(m, "stock") || strings.Contains(m, "warehouse") {
		return "inventory"
	}
	if strings.Contains(m, "customer") || strings.Contains(m, "client") {
		return "customer"
	}
	if strings.Contains(m, "vendor") || strings.Contains(m, "supplier") {
		return "vendor"
	}
	if strings.Contains(m, "payment") || strings.Contains(m, "pay") {
		return "payment"
	}
	if strings.Contains(m, "report") || strings.Contains(m, "analytics") {
		return "reports"
	}
	if strings.Contains(m, "user") || strings.Contains(m, "employee") {
		return "users"
	}
	if strings.Contains(m, "approval") || strings.Contains(m, "approve") {
		return "approvals"
	}
	if strings.Contains(m, "help") || strings.Contains(m, "support") || strings.Contains(m, "assist") {
		return "help"
	}
	
	return "general"
}

// storeConversationMessage adds a message to user's conversation history
func (p *Plugin) storeConversationMessage(userID, role, content string) {
	if p.conversationHistory == nil {
		p.conversationHistory = make(map[string][]ConversationMessage)
	}
	
	history := p.conversationHistory[userID]
	history = append(history, ConversationMessage{
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
	})
	
	// Keep only last 5 messages (10 total with bot responses)
	if len(history) > 10 {
		history = history[len(history)-10:]
	}
	
	p.conversationHistory[userID] = history
}

// getConversationContext returns recent conversation for context
func (p *Plugin) getConversationContext(userID string) string {
	history := p.conversationHistory[userID]
	if len(history) == 0 {
		return ""
	}
	
	// Build context from last 3 user messages
	var context strings.Builder
	count := 0
	for i := len(history) - 1; i >= 0 && count < 3; i-- {
		if history[i].Role == "user" {
			context.WriteString(history[i].Content)
			context.WriteString(" ")
			count++
		}
	}
	
	return context.String()
}

// generateContextualReply creates intelligent replies using conversation history and NLP
func (p *Plugin) generateContextualReply(userID, message string) string {
	// Use new lightweight NLP system
	analysis := p.analyzeIntent(message)
	
	// Generate friendly human-like response
	reply := p.generateFriendlyReply(message, analysis)
	
	// Remember context for follow-ups
	p.lastContext[userID] = analysis.Intent
	
	// Log analysis for debugging
	p.API.LogDebug("Intent Analysis", 
		"intent", analysis.Intent, 
		"confidence", fmt.Sprintf("%.2f", analysis.Confidence),
		"entities", len(analysis.Entities))
	
	return reply
}

// detectIntent determines what the user is asking about (lightweight version)
func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Ignore our own messages
	if post.UserId == p.botID {
		p.API.LogDebug("Ignoring bot's own message")
		return
	}
	
	// Get channel to check if it's a DM
	channel, appErr := p.API.GetChannel(post.ChannelId)
	if appErr != nil {
		p.API.LogError("Failed to get channel", "error", appErr.Error())
		return
	}
	
	isDM := channel.Type == model.ChannelTypeDirect
	isMentioned := strings.Contains(post.Message, "@erpbot")
	
	p.API.LogDebug("Message received", 
		"channelType", channel.Type, 
		"isDM", isDM, 
		"isMentioned", isMentioned,
		"message", post.Message)
	
	// Only respond to DMs or mentions
	if !isDM && !isMentioned {
		p.API.LogDebug("Not a DM and not mentioned, ignoring")
		return
	}
	
	// Clean message (remove @mentions)
	message := strings.ReplaceAll(post.Message, "@erpbot", "")
	message = strings.TrimSpace(message)
	
	if message == "" {
		p.API.LogDebug("Empty message after cleanup, ignoring")
		return
	}
	
	// Log original message
	p.API.LogInfo("Processing message", "original", message, "userId", post.UserId)
	
	// Store conversation history (keep last 5 messages)
	p.storeConversationMessage(post.UserId, "user", message)
	
	// Step 1: Spell correction
	corrected := p.spellCorrectSentence(message)
	if corrected != message {
		p.API.LogInfo("Spell corrected", "from", message, "to", corrected)
	}
	
	// Step 2: Generate contextual reply (100% internal - no external APIs)
	reply := p.generateContextualReply(post.UserId, corrected)
	
	p.API.LogInfo("Generated reply", "length", len(reply))
	
	// Store bot response in history
	p.storeConversationMessage(post.UserId, "assistant", reply)
	
	// Step 3: Send reply
	replyPost := &model.Post{
		ChannelId: post.ChannelId,
		RootId:    post.Id,
		Message:   reply,
	}
	
	if _, createErr := p.API.CreatePost(replyPost); createErr != nil {
		p.API.LogError("Failed to create reply", "error", createErr.Error())
	} else {
		p.API.LogInfo("✅ Reply sent successfully")
	}
}
