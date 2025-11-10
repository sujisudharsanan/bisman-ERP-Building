//go:build standalone
// +build standalone

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/sajari/fuzzy"
)

// ChatBot handles ERP queries
type ChatBot struct {
	conversationHistory map[string][]Message
	spellChecker        *fuzzy.Model
	mutex               sync.RWMutex
	backendURL          string
}

// QueryRequest represents incoming query
type QueryRequest struct {
	Query  string `json:"query"`
	UserID string `json:"user_id"`
	Token  string `json:"token"`
}

// QueryResponse represents the response
type QueryResponse struct {
	Response string `json:"response"`
	Success  bool   `json:"success"`
}

// Message represents a conversation message
type Message struct {
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// NewChatBot creates a new chatbot instance
func NewChatBot(backendURL string) *ChatBot {
	bot := &ChatBot{
		conversationHistory: make(map[string][]Message),
		spellChecker:        fuzzy.NewModel(),
		backendURL:          backendURL,
	}
	bot.initializeSpellChecker()
	return bot
}

// Initialize spell checker with ERP terms
func (bot *ChatBot) initializeSpellChecker() {
	erpTerms := []string{
		// Core ERP
		"invoice", "invoices", "payment", "payments", "approval", "approvals",
		"leave", "leaves", "attendance", "salary", "payroll", "employee", "employees",
		"customer", "customers", "vendor", "vendors", "supplier", "suppliers",
		"product", "products", "inventory", "stock", "warehouse",
		"order", "orders", "purchase", "sales", "quotation", "quotations",

		// Accounting
		"ledger", "journal", "account", "accounts", "balance", "debit", "credit",
		"expense", "expenses", "revenue", "profit", "loss", "tax", "taxes",
		"receipt", "receipts", "voucher", "vouchers", "transaction", "transactions",

		// HR
		"department", "departments", "designation", "shift", "shifts",
		"overtime", "bonus", "deduction", "resignation", "appraisal",

		// Status
		"pending", "approved", "rejected", "completed", "cancelled", "draft",
		"active", "inactive", "overdue", "paid", "unpaid",

		// Actions
		"create", "update", "delete", "submit", "approve", "reject",
		"generate", "report", "reports", "dashboard", "summary",

		// Time
		"today", "yesterday", "tomorrow", "week", "month", "year",
		"daily", "weekly", "monthly", "quarterly", "yearly",
	}

	bot.spellChecker.Train(erpTerms)
}

// Spell check and correct query
func (bot *ChatBot) correctSpelling(query string) string {
	words := strings.Fields(strings.ToLower(query))
	corrected := make([]string, len(words))

	for i, word := range words {
		cleaned := strings.Trim(word, ".,!?;:")
		suggestions := bot.spellChecker.Suggestions(cleaned, false)

		if len(suggestions) > 0 && suggestions[0] != cleaned {
			// Only replace if confidence is reasonable
			corrected[i] = strings.Replace(word, cleaned, suggestions[0], 1)
		} else {
			corrected[i] = word
		}
	}

	return strings.Join(corrected, " ")
}

// Add message to conversation history (max 100 messages)
func (bot *ChatBot) addToHistory(userID string, role string, content string) {
	bot.mutex.Lock()
	defer bot.mutex.Unlock()

	if bot.conversationHistory[userID] == nil {
		bot.conversationHistory[userID] = make([]Message, 0, 100)
	}

	msg := Message{
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
	}

	bot.conversationHistory[userID] = append(bot.conversationHistory[userID], msg)

	// Keep only last 100 messages
	if len(bot.conversationHistory[userID]) > 100 {
		bot.conversationHistory[userID] = bot.conversationHistory[userID][1:]
	}
}

// Get conversation context (last 10 messages)
func (bot *ChatBot) getContext(userID string) []Message {
	bot.mutex.RLock()
	defer bot.mutex.RUnlock()

	history := bot.conversationHistory[userID]
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
func (bot *ChatBot) detectIntent(query string) string {
	query = strings.ToLower(query)

	// Invoice queries
	if strings.Contains(query, "invoice") {
		if strings.Contains(query, "pending") || strings.Contains(query, "unpaid") {
			return "invoice_pending"
		}
		if strings.Contains(query, "paid") || strings.Contains(query, "completed") {
			return "invoice_paid"
		}
		return "invoice_status"
	}

	// Leave queries
	if strings.Contains(query, "leave") {
		if strings.Contains(query, "balance") || strings.Contains(query, "remaining") {
			return "leave_balance"
		}
		if strings.Contains(query, "apply") || strings.Contains(query, "request") {
			return "leave_apply"
		}
		return "leave_status"
	}

	// Approval queries
	if strings.Contains(query, "approval") || strings.Contains(query, "approve") {
		return "approval_pending"
	}

	// Profile queries
	if strings.Contains(query, "profile") || strings.Contains(query, "my info") {
		return "user_info"
	}

	// Dashboard queries
	if strings.Contains(query, "dashboard") || strings.Contains(query, "overview") || strings.Contains(query, "summary") {
		return "dashboard"
	}

	return "general"
}

// Query backend API
func (bot *ChatBot) queryBackend(intent string, userID string, token string) (string, error) {
	reqData := map[string]string{
		"intent":  intent,
		"user_id": userID,
	}

	jsonData, _ := json.Marshal(reqData)

	req, err := http.NewRequest("POST", bot.backendURL+"/api/mattermost/query", strings.NewReader(string(jsonData)))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if response, ok := result["response"].(string); ok {
		return response, nil
	}

	return "I couldn't fetch that information right now.", nil
}

// Process query
func (bot *ChatBot) processQuery(query string, userID string, token string) string {
	// Spell check
	correctedQuery := bot.correctSpelling(query)

	// Add to history
	bot.addToHistory(userID, "user", correctedQuery)

	// Get context
	context := bot.getContext(userID)

	// Detect intent
	intent := bot.detectIntent(correctedQuery)

	var response string

	// For specific intents, query backend
	if intent != "general" {
		backendResp, err := bot.queryBackend(intent, userID, token)
		if err == nil {
			response = backendResp
		} else {
			// Fallback to local response
			response = bot.generateLocalResponse(intent, context)
		}
	} else {
		response = bot.generateLocalResponse(intent, context)
	}

	// Add response to history
	bot.addToHistory(userID, "assistant", response)

	return response
}

// Generate local response (fallback)
func (bot *ChatBot) generateLocalResponse(intent string, context []Message) string {
	responses := map[string]string{
		"invoice_pending":  "I can help you check pending invoices. Please connect to the backend for real-time data.",
		"invoice_paid":     "I can show you paid invoices. Please connect to the backend for real-time data.",
		"leave_balance":    "I can check your leave balance. Please connect to the backend for real-time data.",
		"approval_pending": "I can show pending approvals. Please connect to the backend for real-time data.",
		"general":          "Hello! I'm your ERP assistant. I can help you with invoices, leaves, approvals, and more. What would you like to know?",
	}

	if resp, ok := responses[intent]; ok {
		return resp
	}

	return "I'm here to help with your ERP queries. Try asking about invoices, leaves, or approvals."
}

// HTTP Handler
func (bot *ChatBot) handleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	response := bot.processQuery(req.Query, req.UserID, req.Token)

	resp := QueryResponse{
		Response: response,
		Success:  true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (bot *ChatBot) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// RunStandalone starts the standalone chatbot server
// To run: go run -tags standalone standalone.go
func RunStandalone() {
	// Backend URL from environment or default
	backendURL := "http://localhost:3000"

	bot := NewChatBot(backendURL)

	http.HandleFunc("/query", bot.handleQuery)
	http.HandleFunc("/health", bot.handleHealth)

	port := ":8065"
	fmt.Printf("ERP ChatBot server starting on %s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
