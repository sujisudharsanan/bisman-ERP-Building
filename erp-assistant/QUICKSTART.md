# ERP Assistant Plugin - Quick Start

## ✅ Build Complete!

**Plugin File:** `dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz`

## 🚀 Next Steps

### 1. Upload to Mattermost (2 minutes)

```
1. Open: https://mattermost-production-84fd.up.railway.app
2. Login as admin
3. Main Menu → System Console → Plugins → Plugin Management
4. Click "Upload Plugin"
5. Select: dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz
6. Click "Enable"
```

### 2. Test the Bot (30 seconds)

```
1. Open Mattermost
2. Start a DM with @erpbot
3. Type: "How do I create an invoice?"
4. Get instant response! 🎉
```

## 💬 Example Usage

### Direct Message:
```
You → @erpbot: help

@erpbot replies with list of topics:
• Invoices & Billing
• Purchase Orders
• Attendance & Leave
• Inventory & Stock
• Customers & Vendors
• Payments
• Reports & Analytics
• Approvals
```

### In Channels:
```
You: Hey @erpbot, how do I create a PO?

@erpbot: 📦 Purchase Orders
→ Procurement → PO List
→ Procurement → Create PO
```

## 📝 Keywords the Bot Understands

- **invoice** → Invoice management help
- **purchase** or **po** → Purchase order help
- **leave** or **attendance** → HR attendance help
- **inventory** or **stock** → Inventory management
- **customer** or **client** → Customer management
- **vendor** or **supplier** → Vendor management
- **payment** → Payment processing
- **report** or **analytics** → Reports & analytics
- **user** or **employee** → User management
- **approval** or **pending** → Approvals & workflow
- **help** or **hi** → Full help menu

## 🔄 Customizing Responses

1. **Edit responses:**
   ```bash
   vim erp-assistant/server/plugin.go
   # Modify the reply() function
   ```

2. **Rebuild:**
   ```bash
   cd erp-assistant
   make dist
   ```

3. **Re-upload to Mattermost**

## 📁 Files Created

```
erp-assistant/
├── dist/
│   └── com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz ← Upload this!
├── server/
│   ├── plugin.go      ← Main bot logic (customizable)
│   └── main.go        ← Entry point
├── plugin.json        ← Plugin configuration
└── ERP_ASSISTANT_GUIDE.md ← Full documentation
```

## 🎯 What Happens When You Upload

1. Mattermost extracts the plugin
2. Creates bot account: `@erpbot`
3. Bot starts listening to:
   - All DMs sent to it
   - Any @mentions in channels
4. Responds with helpful guidance!

## ✨ Benefits

- ✅ **No external APIs** - 100% internal
- ✅ **Zero cost** - Completely free
- ✅ **Instant responses** - No delays
- ✅ **Privacy** - All data stays internal
- ✅ **Low maintenance** - Just upload and enable

## 📖 Full Documentation

See `ERP_ASSISTANT_GUIDE.md` for:
- Complete installation steps
- Troubleshooting guide
- Customization examples
- Architecture details
- All available commands

---

**Ready to deploy? Upload the plugin now!** 🚀
