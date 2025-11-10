package main

import (
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/sajari/fuzzy"
)

const (
	BOT_USER_NAME    = "erpbot"
	BOT_DISPLAY_NAME = "ERP Assistant"
	BOT_DESCRIPTION  = "Your friendly ERP assistant for invoices, leave, and approvals."
)

// Plugin implements the interface expected by the Mattermost server to communicate between the server and plugin.
type Plugin struct {
	plugin.MattermostPlugin

	// BotId is the user id of the bot
	BotId string

	// Fuzzy model for spell correction
	fuzzyModel *fuzzy.Model
}

// OnActivate sets up the bot and the fuzzy model
func (p *Plugin) OnActivate() error {
	// Ensure bot user exists
	p.ensureBotUser()

	command := &model.Command{
		Trigger:          "erp",
		AutoComplete:     true,
		AutoCompleteDesc: "Interact with the ERP Assistant",
		AutoCompleteHint: "[command]",
	}

	if err := p.API.RegisterCommand(command); err != nil {
		return err
	}

	// Setup the fuzzy model for spell correction
	p.setupFuzzyModel()

	p.API.LogInfo("✅ ERP Assistant Plugin activated successfully!")

	return nil
}

// setupFuzzyModel initializes and trains the spell checker
func (p *Plugin) setupFuzzyModel() {
	p.fuzzyModel = fuzzy.NewModel()

	// Train with common ERP terms, commands, and typical typos
	// More words can be added for better accuracy
	trainingData := []string{
		"hello", "hi", "hey", "help", "thanks", "thank you", "bye",
		"invoice", "invoices", "invocie", "incoive", "bill", "payment", "paid", "unpaid", "pending", "overdue", "status",
		"leave", "lev", "vacation", "time off", "balance", "requests", "apply", "days",
		"approval", "approvals", "approve", "pending", "requests",
		"profile", "my info", "details", "employee id",
		"dashboard", "overview", "summary",
		"show", "list", "get", "find", "check", "what", "how many", "when",
		// Expanded vocabulary
		"account", "accounting", "asset", "assets", "audit", "balance sheet", "bank",
		"budget", "cash flow", "chart of accounts", "compliance", "cost", "credit", "customer",
		"debit", "debt", "department", "deposit", "depreciation", "discount", "document",
		"employee", "expense", "financial", "fixed asset", "forecast", "general ledger",
		"goods receipt", "hr", "human resources", "income", "inventory", "journal entry",
		"liability", "loan", "logistics", "management", "margin", "material", "module",
		"net income", "order", "payroll", "personnel", "po", "price", "procurement",
		"product", "profit", "project", "purchase order", "purchasing", "receipt", "reconciliation",
		"record", "report", "requisition", "revenue", "salary", "sales", "shipment",
		"statement", "stock", "supplier", "supply chain", "tax", "timesheet", "transaction",
		"trial balance", "vendor", "warehouse", "workflow", "workforce",
		// Common typos
		"invoce", "invoic", "pemding", "pendin", "balence", "balanc", "aproval", "aprov",
		"profil", "detals", "sumary", "owervew", "hellp", "helo", "thnks", "thanku",
	}

	p.fuzzyModel.Train(trainingData)
}

// Ensure bot user exists
func (p *Plugin) ensureBotUser() {
	bot := &model.Bot{
		Username:    "erpbot",
		DisplayName: "ERP Assistant",
		Description: "Internal ERP assistant for invoices, leaves, and approvals",
	}
	
	if botUser, err := p.API.GetUserByUsername(bot.Username); err == nil {
		p.BotId = botUser.Id
	} else {
		if createdBot, err := p.API.CreateBot(bot); err == nil {
			p.BotId = createdBot.UserId
		}
	}
}

// MessageHasBeenPosted is invoked when a message is posted to a channel
func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Ignore posts from the bot itself
	if post.UserId == p.BotId {
		return
	}

	// Check if the bot is mentioned
	if !strings.Contains(post.Message, "@"+BOT_USER_NAME) {
		return
	}

	// Clean the message and correct spelling
	cleanedMessage := strings.ToLower(strings.Replace(post.Message, "@"+BOT_USER_NAME, "", -1))
	correctedMessage := p.correctSpelling(cleanedMessage)

	// Generate and post the response
	response := p.generateResponse(correctedMessage)
	p.postBotResponse(post.ChannelId, response)
}

// correctSpelling uses the fuzzy model to fix typos in the message
func (p *Plugin) correctSpelling(message string) string {
	// Split message into words, correct each one, and rejoin
	words := strings.Fields(message)
	correctedWords := []string{}
	for _, word := range words {
		// Find the best match for the word.
		// The second parameter is the maximum distance to search.
		corrected := p.fuzzyModel.SpellCheck(word)
		correctedWords = append(correctedWords, corrected)
	}
	return strings.Join(correctedWords, " ")
}

// postBotResponse sends a message from the bot to the specified channel
func (p *Plugin) postBotResponse(channelId, message string) {
	replyPost := &model.Post{
		ChannelId: channelId,
		UserId:    p.BotId,
		Message:   message,
	}

	if _, err := p.API.CreatePost(replyPost); err != nil {
		p.API.LogError("Failed to create post", "error", err.Error())
	}
}

// Generate response based on message content
func (p *Plugin) generateResponse(message string) string {
	// Greetings - warm and friendly
	greetings := []string{"hello", "hi", "hey"}
	for _, greeting := range greetings {
		if strings.Contains(message, greeting) {
			responses := []string{
				"Hey there! 👋 Great to see you! I'm here to make your ERP tasks super easy.",
				"Hello! 😊 Ready to help you tackle those work tasks!",
				"Hi! 👋 What can I help you with today?",
			}
			response := responses[len(message)%len(responses)]

			return response + "\n\n" +
				"I'm pretty good at:\n" +
				"💰 Finding invoices and payment info\n" +
				"🏖️ Checking your leave balance\n" +
				"✅ Showing what needs approval\n" +
				"👤 Looking up your profile details\n\n" +
				"Just ask me naturally! Like \"*show my pending invoices*\" or \"*how many leave days do I have?*\""
		}
	}

	// Thank you responses
	thanks := []string{"thank", "thanks", "thanku"}
	for _, thank := range thanks {
		if strings.Contains(message, thank) {
			return "You're very welcome! 😊 Happy to help anytime. Just ping me if you need anything else!"
		}
	}

	// Help requests
	if strings.Contains(message, "help") || strings.Contains(message, "what can you do") {
		return "I'd love to help! 🌟 Here's what I'm great at:\n\n" +
			"**Money Matters** 💰\n" +
			"• \"Show my pending invoices\"\n" +
			"• \"Which invoices are overdue?\"\n" +
			"• \"Payment status for invoice #123\"\n\n" +
			"**Time Off** 🏖️\n" +
			"• \"How many leave days do I have?\"\n" +
			"• \"Show my leave requests\"\n" +
			"• \"When was my last leave?\"\n\n" +
			"**Approvals** ✅\n" +
			"• \"What's pending my approval?\"\n" +
			"• \"Show me approval requests\"\n\n" +
			"**Your Info** 👤\n" +
			"• \"My profile details\"\n" +
			"• \"What's my employee ID?\"\n\n" +
			"Just chat naturally - I'll understand! 😊"
	}
	
	// Invoice queries
	if strings.Contains(message, "invoice") || strings.Contains(message, "bill") {
		if strings.Contains(message, "pending") || strings.Contains(message, "unpaid") || strings.Contains(message, "overdue") {
			return "Looking up your pending invoices... 📄\n\n" +
				"Oops! I need to connect to the backend to pull that data. Make sure the ERP backend is running, and I'll get you those numbers right away! 🚀\n\n" +
				"_(Backend should be at `http://localhost:3000`)_"
		}
		if strings.Contains(message, "paid") || strings.Contains(message, "completed") {
			return "Let me check your paid invoices! ✅\n\n" +
				"Hmm, I need the backend connection to fetch that. Once it's up, I'll show you the complete list! 💪\n\n" +
				"_(Need help starting the backend? Just ask!)_"
		}
		return "I can totally help with invoices! 💰 Try asking me:\n\n" +
			"• \"Show my pending invoices\"\n" +
			"• \"Which invoices are paid?\"\n" +
			"• \"Status of invoice #INV-123\"\n" +
			"• \"Any overdue invoices?\"\n\n" +
			"Just ask away!"
	}
	
	// Leave queries
	if strings.Contains(message, "leave") || strings.Contains(message, "vacation") || strings.Contains(message, "time off") {
		if strings.Contains(message, "balance") || strings.Contains(message, "how many") || strings.Contains(message, "days") {
			return "Let me check your leave balance! 🏖️\n\n" +
				"I'll need to connect to the backend to get your exact numbers. Once that's running, I'll tell you how many days you have left! 😊\n\n" +
				"_(Connecting to `http://localhost:3000`)_"
		}
		if strings.Contains(message, "request") || strings.Contains(message, "apply") {
			return "Looking at your leave requests! 📋\n\n" +
				"I can show you all your requests once I connect to the backend. Give me a sec to get that data! 🏃‍♂️\n\n" +
				"_(Backend connection needed)_"
		}
		return "Time off questions? I've got you! 🏖️\n\n" +
			"You can ask me:\n" +
			"• \"How many leave days do I have?\"\n" +
			"• \"Show my leave requests\"\n" +
			"• \"What's my leave balance?\"\n" +
			"• \"When was my last vacation?\"\n\n" +
			"What would you like to know?"
	}
	
	// Approval queries
	if strings.Contains(message, "approval") || strings.Contains(message, "approve") || (strings.Contains(message, "pending") && strings.Contains(message, "request")) {
		return "Checking what needs your attention! ✅\n\n" +
			"I'll grab your pending approvals from the backend. Just need that connection to be live! 🔄\n\n" +
			"_(Looking for backend at `http://localhost:3000`)_\n\n" +
			"Once connected, I'll show you everything waiting for your approval!"
	}

	// Profile queries
	if strings.Contains(message, "profile") || strings.Contains(message, "my info") || strings.Contains(message, "my details") {
		return "Let me pull up your profile! 👤\n\n" +
			"I need to connect to the backend to get your latest info. Once that's ready, I'll show you everything! 📊\n\n" +
			"_(Connecting to backend...)_"
	}
	
	// Dashboard/overview
	if strings.Contains(message, "dashboard") || strings.Contains(message, "overview") || strings.Contains(message, "summary") {
		return "Getting your dashboard ready! 📊✨\n\n" +
			"I'll compile all your key stats once the backend is connected. You'll see invoices, leave, approvals - the whole picture! 🎯\n\n" +
			"_(Need backend connection first)_"
	}
	
	// Confused/unclear queries
	if strings.Contains(message, "?") || len(strings.Fields(message)) < 3 {
		return "Hmm, I'm not quite sure what you're asking about! 🤔\n\n" +
			"Could you rephrase that? Or maybe start with:\n" +
			"• \"show my invoices\"\n" +
			"• \"check my leave\"\n" +
			"• \"what needs approval?\"\n\n" +
			"I'm here to help - just tell me what you need! 😊"
	}

	// Default response - friendly and encouraging
	return "Hey! 👋 I'm your friendly ERP assistant!\n\n" +
		"I can help you with all kinds of work stuff:\n\n" +
		"💰 **Money & Invoices**\n" +
		"\"Show my pending invoices\" or \"payment status\"\n\n" +
		"🏖️ **Leave & Time Off**\n" +
		"\"How many leave days?\" or \"my vacation balance\"\n\n" +
		"✅ **Approvals**\n" +
		"\"What needs my approval?\" or \"pending requests\"\n\n" +
		"👤 **Your Profile**\n" +
		"\"My details\" or \"employee information\"\n\n" +
		"Don't be shy - just ask me naturally! I'm here to make your day easier. 😊✨"
}

func main() {
	plugin.ClientMain(&Plugin{})
}
