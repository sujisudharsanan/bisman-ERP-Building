package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/mattermost/mattermost-server/v6/model"
	"github.com/mattermost/mattermost-server/v6/plugin"
	"github.com/sajari/fuzzy"
)

// Plugin implements the Mattermost plugin interface
type Plugin struct {
	plugin.MattermostPlugin
	conversationHistory map[string][]Message
	spellChecker        *fuzzy.Model
	mutex               sync.RWMutex
	backendURL          string
}

// Message represents a chat message
type Message struct {
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// OnActivate is called when the plugin is activated
func (p *Plugin) OnActivate() error {
	p.conversationHistory = make(map[string][]Message)
	p.spellChecker = fuzzy.NewModel()
	p.backendURL = "http://localhost:3000" // Your backend URL
	p.initializeSpellChecker()
	
	p.API.LogInfo("ERP Assistant Plugin activated successfully")
	return nil
}

// Initialize spell checker with ERP terms
func (p *Plugin) initializeSpellChecker() {
	erpTerms := []string{
		"invoice", "invoices", "payment", "payments", "approval", "approvals",
		"leave", "leaves", "attendance", "salary", "payroll", "employee", "employees",
		"customer", "customers", "vendor", "vendors", "supplier", "suppliers",
		"product", "products", "inventory", "stock", "warehouse",
		"order", "orders", "purchase", "sales", "quotation", "quotations",
		"ledger", "journal", "account", "accounts", "balance", "debit", "credit",
		"expense", "expenses", "revenue", "profit", "loss", "tax", "taxes",
		"receipt", "receipts", "voucher", "vouchers", "transaction", "transactions",
		"department", "departments", "designation", "shift", "shifts",
		"overtime", "bonus", "deduction", "resignation", "appraisal",
		"pending", "approved", "rejected", "completed", "cancelled", "draft",
		"active", "inactive", "overdue", "paid", "unpaid",
		"create", "update", "delete", "submit", "approve", "reject",
		"generate", "report", "reports", "dashboard", "summary",
		"today", "yesterday", "tomorrow", "week", "month", "year",
		"daily", "weekly", "monthly", "quarterly", "yearly",
	}
	
	p.spellChecker.Train(erpTerms)
}

// MessageHasBeenPosted is called when a message is posted
func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Ignore bot messages
	if post.UserId == p.botUserID() {
		return
	}
	
	// Check if bot is mentioned
	if !strings.Contains(post.Message, "@erpbot") && !strings.Contains(post.Message, "@erpassistant") {
		return
	}
	
	// Remove bot mention from message
	query := strings.ReplaceAll(post.Message, "@erpbot", "")
	query = strings.ReplaceAll(query, "@erpassistant", "")
	query = strings.TrimSpace(query)
	
	if query == "" {
		return
	}
	
	// Process the query
	response := p.processQuery(query, post.UserId)
	
	// Post response
	replyPost := &model.Post{
		ChannelId: post.ChannelId,
		RootId:    post.Id,
		UserId:    p.botUserID(),
		Message:   response,
	}
	
	if _, err := p.API.CreatePost(replyPost); err != nil {
		p.API.LogError("Failed to create post", "error", err.Error())
	}
}

// Get bot user ID
func (p *Plugin) botUserID() string {
	// Get bot user - create if doesn't exist
	bot := &model.Bot{
		Username:    "erpbot",
		DisplayName: "ERP Assistant",
		Description: "Internal ERP assistant for invoices, leaves, and approvals",
	}
	
	botUser, err := p.API.GetUserByUsername(bot.Username)
	if err != nil {
		// Bot doesn't exist, create it
		createdBot, createErr := p.API.CreateBot(bot)
		if createErr != nil {
			p.API.LogError("Failed to create bot", "error", createErr.Error())
			return ""
		}
		return createdBot.UserId
	}
	
	return botUser.Id
}

// Spell check and correct query
func (p *Plugin) correctSpelling(query string) string {
	words := strings.Fields(strings.ToLower(query))
	corrected := make([]string, len(words))
	
	for i, word := range words {
		cleaned := strings.Trim(word, ".,!?;:")
		suggestions := p.spellChecker.Suggestions(cleaned, false)
		
		if len(suggestions) > 0 && suggestions[0] != cleaned {
			corrected[i] = strings.Replace(word, cleaned, suggestions[0], 1)
		} else {
			corrected[i] = word
		}
	}
	
	return strings.Join(corrected, " ")
}

// Add message to conversation history
func (p *Plugin) addToHistory(userID string, role string, content string) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	
	if p.conversationHistory[userID] == nil {
		p.conversationHistory[userID] = make([]Message, 0, 100)
	}
	
	msg := Message{
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
	}
	
	p.conversationHistory[userID] = append(p.conversationHistory[userID], msg)
	
	// Keep only last 100 messages
	if len(p.conversationHistory[userID]) > 100 {
		p.conversationHistory[userID] = p.conversationHistory[userID][1:]
	}
}

// Get conversation context
func (p *Plugin) getContext(userID string) []Message {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	
	history := p.conversationHistory[userID]
	if len(history) == 0 {
		return []Message{}
	}
	
	start := len(history) - 10
	if start < 0 {
		start = 0
	}
	
	return history[start:]
}

// Detect query intent
func (p *Plugin) detectIntent(query string) string {
	query = strings.ToLower(query)
	
	if strings.Contains(query, "invoice") {
		if strings.Contains(query, "pending") || strings.Contains(query, "unpaid") {
			return "invoice_pending"
		}
		return "invoice_status"
	}
	
	if strings.Contains(query, "leave") {
		if strings.Contains(query, "balance") {
			return "leave_balance"
		}
		return "leave_status"
	}
	
	if strings.Contains(query, "approval") {
		return "approval_pending"
	}
	
	if strings.Contains(query, "profile") {
		return "user_info"
	}
	
	if strings.Contains(query, "dashboard") || strings.Contains(query, "overview") {
		return "dashboard"
	}
	
	return "general"
}

// Query backend API
func (p *Plugin) queryBackend(intent string, userID string) (string, error) {
	reqData := map[string]string{
		"intent":  intent,
		"user_id": userID,
	}
	
	jsonData, _ := json.Marshal(reqData)
	
	req, err := http.NewRequest("POST", p.backendURL+"/api/mattermost/query", strings.NewReader(string(jsonData)))
	if err != nil {
		return "", err
	}
	
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	
	if response, ok := result["response"].(string); ok {
		return response, nil
	}
	
	return "I couldn't fetch that information right now.", nil
}

// Process query
func (p *Plugin) processQuery(query string, userID string) string {
	// Spell check
	correctedQuery := p.correctSpelling(query)
	
	// Add to history
	p.addToHistory(userID, "user", correctedQuery)
	
	// Detect intent
	intent := p.detectIntent(correctedQuery)
	
	var response string
	
	// For specific intents, query backend
	if intent != "general" {
		backendResp, err := p.queryBackend(intent, userID)
		if err == nil {
			response = backendResp
		} else {
			response = p.generateLocalResponse(intent)
		}
	} else {
		response = p.generateLocalResponse(intent)
	}
	
	// Add response to history
	p.addToHistory(userID, "assistant", response)
	
	return response
}

// Generate local response (fallback)
func (p *Plugin) generateLocalResponse(intent string) string {
	responses := map[string]string{
		"invoice_pending": "To check pending invoices, I'll need to connect to the backend. Please ensure the ERP backend is running.",
		"leave_balance":   "To check your leave balance, I'll need to connect to the backend. Please ensure the ERP backend is running.",
		"approval_pending": "To show pending approvals, I'll need to connect to the backend. Please ensure the ERP backend is running.",
		"general":         "Hello! I'm your ERP assistant. I can help you with:\n- Invoice queries (pending, paid, status)\n- Leave information (balance, requests)\n- Approval workflows\n- Profile information\n\nTry asking: *show my pending invoices* or *check my leave balance*",
	}
	
	if resp, ok := responses[intent]; ok {
		return resp
	}
	
	return "I'm here to help with your ERP queries. Ask me about invoices, leaves, or approvals!"
}

func main() {
	plugin.ClientMain(&Plugin{})
}
