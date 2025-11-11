package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// AIPlugin implements an AI-powered ERP assistant
type AIPlugin struct {
	plugin.MattermostPlugin
	botID         string
	openAIKey     string
	openAIModel   string
	contextMemory map[string][]ChatMessage // userID -> conversation history
}

// ChatMessage represents a message in the conversation
type ChatMessage struct {
	Role    string `json:"role"`    // "system", "user", or "assistant"
	Content string `json:"content"`
}

// OpenAIRequest represents the request to OpenAI API
type OpenAIRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

// OpenAIResponse represents the response from OpenAI API
type OpenAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Choices []struct {
		Index   int         `json:"index"`
		Message ChatMessage `json:"message"`
		Finish  string      `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

// System prompt that defines the AI assistant's personality and knowledge
const systemPrompt = `You are an ERP Assistant for BISMAN ERP system, a friendly and knowledgeable AI helper.

**Your Knowledge Base:**

1. **BISMAN ERP Modules:**
   - Finance: Invoice management, payments, ledger, bank reconciliation
   - HR: Attendance, leave management, payroll, employee records
   - Inventory: Stock management, purchase orders, goods receipt notes (GRN)
   - Procurement: Vendor management, purchase requests, approvals
   - Common: Tasks, notifications, reports, dashboard

2. **Common Tasks:**
   - Creating invoices: Go to Finance > Invoices > Click "New Invoice"
   - Managing attendance: HR > Attendance > Mark present/absent
   - Checking stock: Inventory > Stock Levels > View by product
   - Creating purchase orders: Procurement > New PO > Select vendor
   - Generating reports: Reports > Select module > Choose report type

3. **Quick Tips:**
   - Use filters to find specific records quickly
   - Export data using the Export button (CSV, PDF, Excel)
   - Set up approval workflows in Settings > Workflows
   - Check notifications bell icon for pending approvals
   - Use search (Ctrl+K) to quickly navigate

**Your Personality:**
- Friendly and helpful, like a colleague
- Use emojis occasionally 😊
- Keep responses concise but complete
- If you don't know something, suggest checking the help docs or contacting support
- Proactively offer related help ("Would you also like to know how to...?")

**Response Format:**
- Start with a quick acknowledgment
- Provide step-by-step instructions when needed
- End with a follow-up question or offer for more help

Remember: You're here to make users' work easier and faster!`

// OnActivate is invoked when the plugin is activated
func (p *AIPlugin) OnActivate() error {
	p.API.LogInfo("🤖 AI ERP Assistant plugin activating...")
	
	// Get OpenAI API key from environment
	p.openAIKey = os.Getenv("OPENAI_API_KEY")
	if p.openAIKey == "" {
		p.API.LogWarn("⚠️  OPENAI_API_KEY not set - AI features will be limited")
	} else {
		p.API.LogInfo("✅ OpenAI API key loaded")
	}
	
	// Set model (default to gpt-3.5-turbo for cost-effectiveness)
	p.openAIModel = os.Getenv("OPENAI_MODEL")
	if p.openAIModel == "" {
		p.openAIModel = "gpt-3.5-turbo"
	}
	p.API.LogInfo("Using OpenAI model:", "model", p.openAIModel)
	
	// Initialize context memory
	p.contextMemory = make(map[string][]ChatMessage)
	p.API.LogInfo("✅ Context memory initialized")
	
	// Create or find bot user
	bot := &model.Bot{
		Username:    "erpbot",
		DisplayName: "🤖 AI ERP Assistant",
		Description: "Your intelligent ERP helper - powered by AI, understands natural language!",
	}
	
	botID, err := p.API.EnsureBotUser(bot)
	if err != nil {
		return fmt.Errorf("failed to ensure bot: %w", err)
	}
	p.botID = botID
	p.API.LogInfo("✅ Bot user ready", "botID", botID, "username", bot.Username)
	
	// Set bot profile image (optional)
	_ = p.setBotProfileImage()
	
	p.API.LogInfo("🎉 AI ERP Assistant is ready!")
	return nil
}

// MessageHasBeenPosted is invoked when any message is posted
func (p *AIPlugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Ignore bot's own messages
	if post.UserId == p.botID {
		return
	}
	
	// Check if bot was mentioned
	message := strings.TrimSpace(post.Message)
	isBotMentioned := strings.Contains(message, "@erpbot") || strings.Contains(message, p.botID)
	
	// Check if it's a direct message to the bot
	channel, err := p.API.GetChannel(post.ChannelId)
	if err != nil {
		p.API.LogError("Failed to get channel", "error", err.Error())
		return
	}
	isDM := channel.Type == model.ChannelTypeDirect && strings.Contains(channel.Name, p.botID)
	
	// Only respond if mentioned or in DM
	if !isBotMentioned && !isDM {
		return
	}
	
	// Clean up the message (remove @mentions)
	cleanMessage := strings.ReplaceAll(message, "@erpbot", "")
	cleanMessage = strings.TrimSpace(cleanMessage)
	
	if cleanMessage == "" {
		p.reply(post.ChannelId, "Hi! 👋 How can I help you today?")
		return
	}
	
	// Get AI response
	response := p.getAIResponse(post.UserId, cleanMessage)
	p.reply(post.ChannelId, response)
}

// getAIResponse gets a response from OpenAI API
func (p *AIPlugin) getAIResponse(userID, userMessage string) string {
	// If no API key, fall back to simple responses
	if p.openAIKey == "" {
		return p.getFallbackResponse(userMessage)
	}
	
	// Get or initialize conversation history
	history, exists := p.contextMemory[userID]
	if !exists {
		// Start new conversation with system prompt
		history = []ChatMessage{
			{Role: "system", Content: systemPrompt},
		}
	}
	
	// Add user message
	history = append(history, ChatMessage{
		Role:    "user",
		Content: userMessage,
	})
	
	// Keep only last 10 messages (5 exchanges) to save tokens
	if len(history) > 11 { // 1 system + 10 messages
		history = append(history[:1], history[len(history)-10:]...)
	}
	
	// Prepare API request
	reqBody := OpenAIRequest{
		Model:       p.openAIModel,
		Messages:    history,
		Temperature: 0.7,
		MaxTokens:   500,
	}
	
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		p.API.LogError("Failed to marshal request", "error", err.Error())
		return "Sorry, I'm having trouble processing your request. 😅"
	}
	
	// Make API request
	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		p.API.LogError("Failed to create request", "error", err.Error())
		return "Sorry, I'm having trouble connecting to my AI brain. 🤖"
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.openAIKey)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		p.API.LogError("Failed to call OpenAI API", "error", err.Error())
		return "Sorry, I couldn't reach my AI brain right now. Please try again! 🔌"
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		p.API.LogError("Failed to read response", "error", err.Error())
		return "Sorry, I got a garbled response from my AI brain. 🤷"
	}
	
	// Parse response
	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		p.API.LogError("Failed to parse OpenAI response", "error", err.Error(), "body", string(body))
		return "Sorry, I couldn't understand the response from my AI brain. 😕"
	}
	
	// Check for API errors
	if openAIResp.Error != nil {
		p.API.LogError("OpenAI API error", "type", openAIResp.Error.Type, "message", openAIResp.Error.Message)
		if strings.Contains(openAIResp.Error.Type, "invalid_api_key") {
			return "Sorry, my AI brain isn't configured properly. Please contact your admin! 🔧"
		}
		return fmt.Sprintf("Sorry, my AI brain said: %s 😔", openAIResp.Error.Message)
	}
	
	// Extract assistant's response
	if len(openAIResp.Choices) == 0 {
		return "Sorry, I didn't get any response from my AI brain. 🤔"
	}
	
	assistantMessage := openAIResp.Choices[0].Message.Content
	
	// Save conversation history
	history = append(history, ChatMessage{
		Role:    "assistant",
		Content: assistantMessage,
	})
	p.contextMemory[userID] = history
	
	// Log usage for monitoring
	p.API.LogInfo("AI response generated",
		"tokens", openAIResp.Usage.TotalTokens,
		"model", p.openAIModel,
		"userID", userID)
	
	return assistantMessage
}

// getFallbackResponse provides simple responses when AI is not available
func (p *AIPlugin) getFallbackResponse(message string) string {
	msg := strings.ToLower(message)
	
	// Invoice queries
	if strings.Contains(msg, "invoice") {
		return "📄 **Creating an Invoice:**\n\n1. Go to **Finance** module\n2. Click **Invoices** > **New Invoice**\n3. Fill in customer details\n4. Add line items (products/services)\n5. Click **Save** or **Save & Send**\n\nNeed help with a specific step?"
	}
	
	// Attendance queries
	if strings.Contains(msg, "attendance") || strings.Contains(msg, "leave") {
		return "👥 **Attendance & Leave:**\n\n**Mark Attendance:**\n- HR > Attendance > Mark Present/Absent\n\n**Apply for Leave:**\n- HR > Leave > New Leave Request\n- Select dates and leave type\n- Submit for approval\n\nWhat would you like to do?"
	}
	
	// Stock/Inventory queries
	if strings.Contains(msg, "stock") || strings.Contains(msg, "inventory") {
		return "📦 **Inventory Management:**\n\n**Check Stock:**\n- Inventory > Stock Levels\n- Use filters to find products\n\n**Add Stock:**\n- Inventory > New GRN (Goods Receipt Note)\n\n**Issue Stock:**\n- Inventory > Stock Issue\n\nNeed more details?"
	}
	
	// Purchase order queries
	if strings.Contains(msg, "purchase") || strings.Contains(msg, "po") {
		return "🛒 **Purchase Orders:**\n\n1. Procurement > New PO\n2. Select vendor\n3. Add items and quantities\n4. Set delivery date\n5. Submit for approval\n\n**Track PO:**\n- Procurement > PO List > Search by PO number\n\nWhat else can I help with?"
	}
	
	// Report queries
	if strings.Contains(msg, "report") {
		return "📊 **Generating Reports:**\n\n1. Go to **Reports** module\n2. Select module (Finance/HR/Inventory)\n3. Choose report type\n4. Set date range and filters\n5. Click **Generate**\n6. Export as PDF/Excel if needed\n\nWhich report are you looking for?"
	}
	
	// Default help
	return "👋 Hi! I'm your ERP Assistant.\n\n**I can help you with:**\n- 📄 Creating invoices and payments\n- 👥 Attendance and leave management\n- 📦 Inventory and stock control\n- 🛒 Purchase orders and procurement\n- 📊 Reports and analytics\n\n*What would you like to know?*\n\n_(💡 Tip: For smarter responses, ask your admin to configure my AI brain with an OpenAI API key!)_"
}

// reply sends a message to the specified channel
func (p *AIPlugin) reply(channelID, message string) {
	post := &model.Post{
		ChannelId: channelID,
		UserId:    p.botID,
		Message:   message,
	}
	
	if _, err := p.API.CreatePost(post); err != nil {
		p.API.LogError("Failed to create post", "error", err.Error())
	}
}

// setBotProfileImage sets a profile image for the bot
func (p *AIPlugin) setBotProfileImage() error {
	// This would set a custom profile image if you have one
	// For now, just return nil
	return nil
}
