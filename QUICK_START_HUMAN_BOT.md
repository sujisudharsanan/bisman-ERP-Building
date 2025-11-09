# 🚀 Quick Start: Human-Like ERP Bot

## Upload & Test in 3 Minutes

### Step 1: Upload Plugin (1 min)

1. Open Mattermost: https://mattermost-production-84fd.up.railway.app
2. Go to: **System Console → Plugins → Upload Plugin**
3. Select: `/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz`
4. Click **Upload** (wait ~15 seconds)
5. Toggle **Enable** ON

✅ Bot will auto-activate and train spell checker!

---

### Step 2: Test with Typos (1 min)

Open DM with `@erpbot` and try these:

```
hw do i creat invvoice?
```
*Bot corrects "hw→how", "creat→create", "invvoice→invoice"*

```
purhcase order help
```
*Bot corrects "purhcase→purchase"*

```
attandance trackng
```
*Bot corrects "attandance→attendance", "trackng→tracking"*

```
help
```
*Bot shows full capabilities*

---

### Step 3: Notice the Magic! (1 min)

**Try the same question twice:**

First time:
```
You: invoice help
Bot: Happy to help! 🎯

To create an invoice, head to **Finance → Billing → New Invoice**...

Want me to show you the details?
```

Second time:
```
You: invoice help  
Bot: Got it!

Creating invoices is easy! Go to the **Billing** module...

Anything else I can help with?
```

**Different response every time!** 🎉

---

## Test All Features

### Spell Correction:
```
creat invvoice     → "create invoice"
purhcase order     → "purchase order"  
attandance         → "attendance"
inventry           → "inventory"
custmer            → "customer"
paymnt             → "payment"
reportss           → "reports"
approvel           → "approval"
```

### Topics It Understands:
```
✅ invoice / billing
✅ purchase order / PO
✅ leave / attendance  
✅ inventory / stock
✅ customer / vendor
✅ payment
✅ reports / analytics
✅ users / employees
✅ approvals / workflow
```

### Natural Language:
```
✅ "how do i create invoice?"
✅ "need help with PO"
✅ "want to check attendance"
✅ "show me inventory"
✅ "where is payment page?"
```

---

## What Makes It Human-Like?

### 🎯 Random Openers:
- "Sure thing! 😊"
- "Happy to help! 🎯"
- "Got it!"
- "Right away —"
- "Let me help you with that!"
- "No problem!"
- "I'm on it! 💪"
- "Absolutely!"
- "Coming right up!"
- "Of course! ✨"

### 💬 Random Closers:
- "Anything else I can help with?"
- "Want me to show you the details?"
- "Need a link to that page?"
- "Would you like a quick walkthrough?"
- "Should I explain any of the fields?"
- "Let me know if you need more info! 📝"
- "Feel free to ask if you get stuck!"
- "Just ping me anytime! 💬"

### 📝 Core Response Variety:
**Each topic has 3+ different ways to answer!**

Example for "invoice":
1. "To create an invoice, head to **Finance → Billing → New Invoice**..."
2. "Creating invoices is easy! Go to the **Billing** module..."
3. "You can make a new invoice from **Finance → Invoices → Create New**..."

---

## Troubleshooting

### Bot not responding?
- Check plugin is **Enabled** in System Console
- Look for "ERP Assistant bot activated" in logs
- Try `@erpbot help` in a channel

### Still showing old responses?
- Disable plugin
- Wait 5 seconds
- Enable plugin again
- Check version in System Console

### Upload failed?
- Ensure **Enable Plugin Uploads** = Yes
- Check **Require Plugin Signature** = No
- File size: 87 MB (normal for NLP libraries)

---

## Technical Specs

**Plugin Details:**
- **ID**: `com.bisman.erp.assistant`
- **Version**: `0.5.0+30df4dd`
- **Size**: 87 MB
- **Language**: Go 1.24.3
- **Dependencies**: 
  - `github.com/sajari/fuzzy` (spell correction)
  - `github.com/jdkato/prose/v2` (NLP)

**Features:**
- ✅ Offline (no external API)
- ✅ Spell correction (fuzzy matching)
- ✅ NLP tokenization
- ✅ Intent detection
- ✅ Response variety
- ✅ Context memory
- ✅ ERP vocabulary (50+ terms)

---

## Next Steps

1. **Test thoroughly** - Try all ERP topics
2. **Share with team** - Let users know about spell tolerance
3. **Collect feedback** - See what questions are common
4. **Extend vocabulary** - Add company-specific terms to `erpVocabulary`

---

## Advanced: Customize Vocabulary

To add your own terms, edit `server/plugin.go`:

```go
var erpVocabulary = []string{
    // ... existing terms ...
    
    // Add your custom terms:
    "grn", "goods", "received", "note",
    "dispatch", "challan", "delivery",
    "your-custom-field", "your-module-name",
}
```

Then rebuild:
```bash
cd /Users/abhi/Desktop/BISMAN\ ERP/erp-assistant
make dist
# Upload new version
```

---

**Your human-like ERP bot is ready!** 🎉

Start chatting naturally - typos are welcome! 😊
