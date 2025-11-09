package main

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/jdkato/prose/v2"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/sajari/fuzzy"
)

// Plugin implements the interface expected by the Mattermost server
type Plugin struct {
	plugin.MattermostPlugin
	botID       string
	fuzzyModel  *fuzzy.Model
	lastContext map[string]string // userID -> last topic for context
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
}

// OnActivate is invoked when the plugin is activated
func (p *Plugin) OnActivate() error {
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())
	
	// Initialize context memory
	p.lastContext = make(map[string]string)
	
	// Initialize fuzzy spell checker
	p.fuzzyModel = fuzzy.NewModel()
	p.fuzzyModel.SetThreshold(1) // Allow 1 character difference
	p.fuzzyModel.SetDepth(2)     // Check 2-letter combinations
	
	// Train the model with ERP vocabulary
	p.API.LogInfo("Training fuzzy model with ERP vocabulary...")
	p.fuzzyModel.Train(erpVocabulary)
	p.API.LogInfo("Fuzzy model training complete", "words", len(erpVocabulary))
	
	// Create bot user
	bot := &model.Bot{
		Username:    "erpbot",
		DisplayName: "ERP Assistant",
		Description: "🤖 Your friendly ERP helper - I understand typos and speak human!",
	}
	
	createdBot, err := p.API.CreateBot(bot)
	if err != nil {
		p.API.LogInfo("Bot might already exist, checking...")
		user, userErr := p.API.GetUserByUsername(bot.Username)
		if userErr == nil && user.IsBot {
			p.botID = user.Id
			p.API.LogInfo("Found existing ERP Assistant bot", "botID", p.botID)
			return nil
		}
		return err
	}
	
	p.botID = createdBot.UserId
	p.API.LogInfo("🎉 ERP Assistant bot activated successfully!", "botID", p.botID)
	
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

// analyzeWithProse uses lightweight NLP to extract tokens and entities
func analyzeWithProse(text string) (tokens []string, entities map[string]bool, err error) {
	doc, err := prose.NewDocument(text)
	if err != nil {
		return nil, nil, err
	}
	
	entities = make(map[string]bool)
	
	// Extract tokens
	for _, tok := range doc.Tokens() {
		tokens = append(tokens, strings.ToLower(tok.Text))
	}
	
	// Extract named entities (optional - for better context)
	for _, ent := range doc.Entities() {
		entities[strings.ToLower(ent.Text)] = true
	}
	
	return tokens, entities, nil
}

// detectIntent determines what the user is asking about
func detectIntent(tokens []string) string {
	tokenSet := make(map[string]bool)
	for _, t := range tokens {
		tokenSet[t] = true
	}
	
	// Check for specific topics
	if tokenSet["invoice"] || tokenSet["invoices"] || tokenSet["billing"] {
		return "invoice"
	}
	if tokenSet["purchase"] || tokenSet["order"] || tokenSet["po"] {
		return "purchase_order"
	}
	if tokenSet["leave"] || tokenSet["leaves"] || tokenSet["absent"] {
		return "leave"
	}
	if tokenSet["attendance"] || tokenSet["timesheet"] {
		return "attendance"
	}
	if tokenSet["inventory"] || tokenSet["stock"] || tokenSet["warehouse"] {
		return "inventory"
	}
	if tokenSet["customer"] || tokenSet["customers"] || tokenSet["client"] {
		return "customer"
	}
	if tokenSet["vendor"] || tokenSet["vendors"] || tokenSet["supplier"] {
		return "vendor"
	}
	if tokenSet["payment"] || tokenSet["payments"] || tokenSet["pay"] {
		return "payment"
	}
	if tokenSet["report"] || tokenSet["reports"] || tokenSet["analytics"] {
		return "reports"
	}
	if tokenSet["user"] || tokenSet["users"] || tokenSet["employee"] {
		return "users"
	}
	if tokenSet["approval"] || tokenSet["approvals"] || tokenSet["approve"] {
		return "approvals"
	}
	if tokenSet["help"] || tokenSet["support"] || tokenSet["assist"] {
		return "help"
	}
	
	return "general"
}

// generateFriendlyReply creates a human-like response with variety
func (p *Plugin) generateFriendlyReply(userID, corrected string, tokens []string, entities map[string]bool) string {
	intent := detectIntent(tokens)
	
	// Remember context
	p.lastContext[userID] = intent
	
	// Random opener
	opener := openers[rand.Intn(len(openers))]
	
	// Random closer
	closer := closers[rand.Intn(len(closers))]
	
	// Core response based on intent
	var core string
	
	switch intent {
	case "invoice":
		responses := []string{
			"To create an invoice, head to **Finance → Billing → New Invoice**. Fill in customer details, add line items, and hit save!",
			"Creating invoices is easy! Go to the **Billing** module, click **New Invoice**, select your customer, and add the items you're billing for.",
			"You can make a new invoice from **Finance → Invoices → Create New**. Just pick the customer and add your line items! 🧾",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "purchase_order":
		responses := []string{
			"For purchase orders, navigate to **Procurement → Purchase Orders → Create PO**. Select your vendor, add items, and submit for approval!",
			"Making a PO? Go to **Procurement → New PO**, choose the vendor, add what you need, and send it for approval. Easy! 📦",
			"You'll find PO creation under **Procurement → Purchase Orders**. Pick a vendor, list the items, and submit!",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "leave":
		responses := []string{
			"To apply for leave, visit **HR → Leave Management → Apply Leave**. Choose your dates, select leave type, and submit!",
			"Requesting time off? Head to **Leave Management**, click **Apply**, pick your dates and reason, then submit for approval.",
			"You can apply for leave from **HR → Leaves**. Just fill in the dates, type of leave, and any notes! 🏖️",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "attendance":
		responses := []string{
			"Check attendance in **HR → Attendance Tracking**. You can view daily logs, mark attendance, or export reports!",
			"Attendance is managed under **HR → Attendance**. Mark present/absent, view logs, and generate reports from there.",
			"Find attendance tracking in the **HR module**. You can log attendance, view history, and pull reports! ⏰",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "inventory":
		responses := []string{
			"Inventory management is in **Warehouse → Stock Management**. Track stock levels, add items, or check movement history!",
			"Managing stock? Go to **Inventory → Warehouse**, where you can see current levels, add products, and track transfers.",
			"You'll find inventory tools under **Warehouse → Inventory**. Check stock, add new items, or view transactions! 📊",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "customer":
		responses := []string{
			"Customer management is under **CRM → Customers**. Add new customers, update details, or view transaction history!",
			"Head to **CRM → Customer Directory** to add customers, edit info, or see their purchase history.",
			"You can manage customers from **Sales → CRM**. Create records, update contacts, and track interactions! 👥",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "vendor":
		responses := []string{
			"Vendor info is in **Procurement → Vendor Management**. Add vendors, update details, or view purchase history!",
			"Managing suppliers? Visit **Procurement → Vendors** to add new ones, edit info, or check past orders.",
			"Find vendor management under **Procurement**. You can create vendor profiles and track all purchases! 🏢",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "payment":
		responses := []string{
			"Process payments from **Finance → Payments**. Record payments, link to invoices, and track payment status!",
			"To make a payment, go to **Finance → Payment Processing**. Select invoice, enter amount, and mark as paid.",
			"Payment processing is under **Finance → Payments**. You can record, track, and reconcile all payments there! 💳",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "reports":
		responses := []string{
			"Reports are available in **Analytics → Reports**. Choose from financial, inventory, HR, or custom reports!",
			"Need reports? Head to **Reports & Analytics** where you'll find pre-built reports or can create custom ones.",
			"You can generate reports from **Dashboard → Reports**. Tons of options for finance, sales, HR, and more! 📈",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "users":
		responses := []string{
			"User management is in **Settings → Users & Permissions**. Add users, assign roles, and manage access!",
			"Managing team members? Go to **Admin → User Management** to create accounts and set permissions.",
			"Find user admin tools under **Settings → Users**. Add people, assign roles, and control access! 👨‍💼",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "approvals":
		responses := []string{
			"Approvals are tracked in **Workflow → Approval Queue**. Review pending items, approve/reject, and add comments!",
			"Check your approval queue under **Workflow → Approvals**. You can approve, reject, or request changes.",
			"The approval system is in **Workflow Management**. See pending requests, take action, and track history! ✅",
		}
		core = responses[rand.Intn(len(responses))]
		
	case "help":
		core = "I'm here to help with all things ERP! Ask me about:\n\n" +
			"💰 **Finance**: Invoices, payments, billing\n" +
			"📦 **Procurement**: Purchase orders, vendors, GRN\n" +
			"👥 **HR**: Leave, attendance, payroll\n" +
			"📊 **Inventory**: Stock, warehouse, products\n" +
			"🔄 **Workflows**: Approvals, processes\n" +
			"📈 **Reports**: Analytics, dashboards\n\n" +
			"Just type your question naturally - I understand typos! 😊"
		
	default:
		responses := []string{
			"Hmm, I'm not quite sure about that one. Could you rephrase? Maybe mention what module you're working in (Finance, HR, Inventory, etc.)?",
			"I didn't quite catch that! Try asking about specific features like invoices, leave, inventory, or reports.",
			"Not sure I understood! 🤔 Are you asking about invoices, purchase orders, attendance, or something else?",
		}
		core = responses[rand.Intn(len(responses))]
		closer = "Type **help** to see what I can assist with!"
	}
	
	// Build final message with variation
	if intent == "help" {
		return fmt.Sprintf("%s\n\n%s", opener, core)
	}
	
	return fmt.Sprintf("%s\n\n%s\n\n%s", opener, core, closer)
}

// MessageHasBeenPosted is invoked when a message is posted
func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Ignore our own messages
	if post.UserId == p.botID {
		return
	}
	
	// Get channel to check if it's a DM
	channel, appErr := p.API.GetChannel(post.ChannelId)
	if appErr != nil {
		return
	}
	
	isDM := channel.Type == model.ChannelTypeDirect
	isMentioned := strings.Contains(post.Message, "@erpbot")
	
	// Only respond to DMs or mentions
	if !isDM && !isMentioned {
		return
	}
	
	// Clean message (remove @mentions)
	message := strings.ReplaceAll(post.Message, "@erpbot", "")
	message = strings.TrimSpace(message)
	
	// Log original message
	p.API.LogDebug("Received message", "original", message)
	
	// Step 1: Spell correction
	corrected := p.spellCorrectSentence(message)
	if corrected != message {
		p.API.LogDebug("Spell corrected", "from", message, "to", corrected)
	}
	
	// Step 2: NLP analysis
	tokens, entities, err := analyzeWithProse(corrected)
	if err != nil {
		p.API.LogError("Prose analysis failed", "error", err.Error())
		tokens = strings.Fields(strings.ToLower(corrected))
		entities = make(map[string]bool)
	}
	
	p.API.LogDebug("NLP analysis", "tokens", tokens, "entities", entities)
	
	// Step 3: Generate friendly reply
	reply := p.generateFriendlyReply(post.UserId, corrected, tokens, entities)
	
	// Step 4: Send reply
	replyPost := &model.Post{
		ChannelId: post.ChannelId,
		RootId:    post.Id,
		Message:   reply,
	}
	
	if _, createErr := p.API.CreatePost(replyPost); createErr != nil {
		p.API.LogError("Failed to create reply", "error", createErr.Error())
	}
}
