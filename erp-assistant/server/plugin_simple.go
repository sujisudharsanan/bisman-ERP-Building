package main

import (
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// Plugin implements the Mattermost plugin interface
type Plugin struct {
	plugin.MattermostPlugin
	botUserID string
}

// OnActivate is called when the plugin is activated
func (p *Plugin) OnActivate() error {
	// Ensure bot user exists
	p.ensureBotUser()
	p.API.LogInfo("✅ ERP Assistant Plugin activated successfully!")
	return nil
}

// Ensure bot user exists
func (p *Plugin) ensureBotUser() {
	bot := &model.Bot{
		Username:    "erpbot",
		DisplayName: "ERP Assistant",
		Description: "Internal ERP assistant for invoices, leaves, and approvals",
	}
	
	if botUser, err := p.API.GetUserByUsername(bot.Username); err == nil {
		p.botUserID = botUser.Id
	} else {
		if createdBot, err := p.API.CreateBot(bot); err == nil {
			p.botUserID = createdBot.UserId
		}
	}
}

// MessageHasBeenPosted is called when a message is posted
func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Don't respond to our own messages
	if post.UserId == p.botUserID {
		return
	}
	
	// Check if message mentions the bot
	message := strings.ToLower(post.Message)
	if !strings.Contains(message, "erpbot") && !strings.Contains(message, "erp bot") {
		return
	}
	
	// Generate response
	response := p.generateResponse(message)
	
	// Create reply post
	replyPost := &model.Post{
		ChannelId: post.ChannelId,
		RootId:    post.Id,
		UserId:    p.botUserID,
		Message:   response,
	}
	
	if _, err := p.API.CreatePost(replyPost); err != nil {
		p.API.LogError("Failed to create post", "error", err.Error())
	}
}

// Generate response based on message content
func (p *Plugin) generateResponse(message string) string {
	if strings.Contains(message, "hello") || strings.Contains(message, "hi") {
		return "Hello! 👋 I'm your ERP Assistant. I can help you with:\n" +
			"• Invoice queries (pending, paid, status)\n" +
			"• Leave information (balance, requests)\n" +
			"• Approval workflows\n" +
			"• Profile information\n\n" +
			"Try asking: *show my pending invoices* or *check my leave balance*"
	}
	
	if strings.Contains(message, "invoice") {
		if strings.Contains(message, "pending") {
			return "📄 **Pending Invoices:**\nTo show your pending invoices, I need to connect to the backend at `http://localhost:3000`. Please ensure the ERP backend is running."
		}
		return "📄 I can help with invoices! Try asking:\n• Show my pending invoices\n• List paid invoices\n• Invoice status for #INV123"
	}
	
	if strings.Contains(message, "leave") {
		if strings.Contains(message, "balance") {
			return "🏖️ **Leave Balance:**\nTo check your leave balance, I need to connect to the backend. Please ensure the ERP backend is running at `http://localhost:3000`."
		}
		return "🏖️ I can help with leave queries! Try asking:\n• Check my leave balance\n• Show my leave requests\n• Apply for leave"
	}
	
	if strings.Contains(message, "approval") {
		return "✅ **Approvals:**\nTo show pending approvals, I need to connect to the backend. Please ensure the ERP backend is running at `http://localhost:3000`."
	}
	
	return "I'm your ERP Assistant! 🤖\n\n" +
		"I can help you with:\n" +
		"• **Invoices** - pending, paid, status\n" +
		"• **Leave** - balance, requests, applications\n" +
		"• **Approvals** - pending workflows\n" +
		"• **Profile** - your information\n\n" +
		"Just mention me with your query! Example: `@erpbot show my pending invoices`"
}

func main() {
	plugin.ClientMain(&Plugin{})
}
