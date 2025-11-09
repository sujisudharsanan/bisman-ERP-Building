# 🤖 ERP Assistant - Mattermost Plugin

## 📋 Overview

The **ERP Assistant** is a native Mattermost plugin that provides instant help with common ERP tasks. Users can message `@erpbot` in any channel or send a direct message to get guidance on invoices, purchase orders, attendance, inventory, and more!

**Key Features:**
- ✅ **No External APIs** - 100% internal, rule-based responses
- ✅ **Zero Cost** - No API fees, completely free
- ✅ **Instant Responses** - Real-time chat assistance
- ✅ **Single Chat Box** - Seamless integration with Mattermost
- ✅ **Smart Detection** - Responds to @mentions and DMs automatically

---

## 🎯 What the Bot Can Help With

The ERP Assistant understands questions about:

### 💼 Finance & Accounting
- 🧾 **Invoices** - "How do I create an invoice?"
- 💰 **Payments** - "Where can I record payments?"
- 📈 **Reports** - "Show me financial reports"

### 📦 Procurement & Inventory
- 📦 **Purchase Orders** - "How do I create a PO?"
- 📊 **Inventory** - "Check stock levels"
- 🏢 **Vendors** - "Manage suppliers"

### 👥 HR & People
- 🕒 **Attendance** - "How do I mark attendance?"
- 🌴 **Leave** - "Apply for leave"
- 👤 **Employees** - "Manage employee records"

### 🔄 Workflow
- ✅ **Approvals** - "View pending approvals"
- 👥 **Customers** - "Add new customer"
- 🔧 **General Help** - "What can you help me with?"

---

## 📦 Installation

### Step 1: Build the Plugin ✅ (Already Done!)

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/erp-assistant"
make dist
```

**Output:** `dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz`

### Step 2: Upload to Mattermost

1. **Open Mattermost:**
   - URL: https://mattermost-production-84fd.up.railway.app
   - Login as System Admin

2. **Navigate to System Console:**
   - Click **Main Menu** (☰) → **System Console**
   - Go to **Plugins** → **Plugin Management**

3. **Upload Plugin:**
   - Click **Upload Plugin**
   - Select file: `dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz`
   - Click **Upload**

4. **Enable Plugin:**
   - Find "ERP Assistant" in the plugin list
   - Click **Enable**
   - Click **Activate** if needed

---

## 🚀 Usage

### Method 1: Direct Message (DM)

1. Open Mattermost
2. Click **Direct Messages**
3. Search for `@erpbot`
4. Start chatting!

**Example:**
```
You: How do I create an invoice?

@erpbot: 🧾 Invoice Management

To create an invoice, navigate to:
→ Finance → Billing → New Invoice

For viewing existing invoices:
→ Finance → Billing → Invoice List
```

### Method 2: Mention in Channels

In any channel, mention the bot:

```
You: Hey @erpbot, how do I apply for leave?

@erpbot: 🕒 Attendance & Leave

Manage your attendance:
→ HR → Attendance → My Records

Apply for leave:
→ HR → Leave Management → Apply Leave
```

### Method 3: Ask for Help

```
You: @erpbot help

@erpbot: 🤖 Hi! I'm your ERP Assistant

I can help you with:
• 🧾 Invoices & Billing
• 📦 Purchase Orders
• 🕒 Attendance & Leave
• 📊 Inventory & Stock
• 👥 Customers & Vendors
• 💰 Payments
• 📈 Reports & Analytics
• ✅ Approvals

Just ask me about any of these topics!
```

---

## 📝 Example Questions

### Finance
- "How do I create an invoice?"
- "Where can I see payment history?"
- "Show me financial reports"
- "How to record a payment?"

### Procurement
- "Create a purchase order"
- "Check stock levels"
- "Manage vendors"
- "View inventory"

### HR
- "How do I mark attendance?"
- "Apply for leave"
- "View employee list"
- "Manage my attendance records"

### Workflow
- "View pending approvals"
- "Add new customer"
- "Create new user"

---

## 🔧 Technical Details

### Plugin Information
- **Plugin ID:** `com.bisman.erp.assistant`
- **Name:** ERP Assistant
- **Description:** Internal ERP helper bot
- **Version:** 0.5.0
- **Min Server Version:** 6.2.1

### Bot Details
- **Username:** `@erpbot`
- **Display Name:** ERP Assistant
- **Type:** Mattermost Bot Account

### Architecture
- **Language:** Go
- **Framework:** Mattermost Plugin SDK
- **Response Type:** Rule-based (no external APIs)
- **Deployment:** Uploaded as .tar.gz plugin file

### How It Works

1. **Message Detection:**
   - Listens to all messages in Mattermost
   - Responds to:
     - Direct messages to `@erpbot`
     - @mentions in public/private channels

2. **Response Generation:**
   - Analyzes message content
   - Matches keywords (invoice, PO, attendance, etc.)
   - Returns pre-defined helpful responses

3. **Reply Posting:**
   - Posts response in same channel/thread
   - Tags original message (threaded reply)

---

## 🎨 Customization

### Adding New Responses

Edit `erp-assistant/server/plugin.go` and add new cases:

```go
case strings.Contains(m, "your-keyword"):
    return "Your custom response here"
```

### Rebuild After Changes

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/erp-assistant"
make dist
```

Then re-upload the new `.tar.gz` file to Mattermost.

---

## 🐛 Troubleshooting

### Bot Doesn't Respond

**Problem:** Bot doesn't reply to messages

**Solutions:**
1. Check if plugin is enabled:
   - System Console → Plugins → Plugin Management
   - Verify "ERP Assistant" shows as "Enabled"

2. Check bot exists:
   - System Console → User Management
   - Search for `@erpbot`
   - Should show as "Bot Account"

3. Restart plugin:
   - System Console → Plugins → Plugin Management
   - Disable → Enable ERP Assistant

### Bot Not Found

**Problem:** Can't find `@erpbot` in user list

**Solutions:**
1. Deactivate and reactivate plugin
2. Check Mattermost logs:
   ```bash
   railway logs -s mattermost
   ```
3. Look for: "ERP Assistant bot activated successfully"

### Plugin Upload Fails

**Problem:** Error uploading plugin

**Solutions:**
1. Verify file: `com.bisman.erp.assistant-*.tar.gz`
2. Check file size (should be < 50MB)
3. Ensure system admin permissions
4. Enable plugin uploads:
   - System Console → Plugin Management
   - Enable "Enable Plugins"
   - Enable "Enable uploading"

---

## 📊 Plugin File Structure

```
dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz
├── plugin.json                    # Plugin metadata
├── assets/
│   └── starter-template-icon.svg  # Plugin icon
├── server/
│   └── dist/
│       ├── plugin-linux-amd64     # Linux binary
│       ├── plugin-linux-arm64     # Linux ARM binary
│       ├── plugin-darwin-amd64    # macOS Intel binary
│       ├── plugin-darwin-arm64    # macOS ARM binary
│       └── plugin-windows-amd64.exe # Windows binary
└── webapp/
    └── dist/
        └── main.js                # Frontend JavaScript
```

---

## 🔐 Security

- ✅ **No External APIs** - All processing happens internally
- ✅ **No Data Storage** - Bot doesn't save any information
- ✅ **No Network Calls** - Pure rule-based logic
- ✅ **Mattermost Native** - Uses official plugin framework

---

## 🎯 Benefits

### For Users:
- ⚡ **Instant Help** - Get guidance without leaving chat
- 📱 **Always Available** - 24/7 assistance
- 💬 **Natural Interaction** - Chat like you would with a colleague
- 🔍 **Easy Discovery** - Simple @mention or DM

### For Organization:
- 💰 **Zero Cost** - No API fees, completely free
- 🔒 **Data Privacy** - Everything stays internal
- ⚙️ **Low Maintenance** - No external services to manage
- 🚀 **Quick Deployment** - Upload and enable

---

## 📈 Future Enhancements

Potential improvements:
1. **Dynamic Responses** - Pull real-time data from ERP API
2. **Slash Commands** - `/invoice create`, `/po list`, etc.
3. **Interactive Buttons** - Quick actions in chat
4. **Multi-language** - Support for different languages
5. **Context Awareness** - Remember conversation history
6. **Smart Suggestions** - Autocomplete for common queries

---

## 📞 Support

**Questions?** Try these:
1. Ask `@erpbot help` in Mattermost
2. Check Railway Mattermost logs:
   ```bash
   railway logs -s mattermost
   ```
3. Review plugin status in System Console

**Need to rebuild?**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/erp-assistant"
make dist
```

---

## 📚 Resources

- **Mattermost Plugin Docs:** https://developers.mattermost.com/extend/plugins/
- **Bot API Reference:** https://developers.mattermost.com/extend/plugins/server/reference/
- **Plugin Starter Template:** https://github.com/mattermost/mattermost-plugin-starter-template

---

**Built with ❤️ for BISMAN ERP**

*Making ERP assistance as easy as sending a message!* 💬
