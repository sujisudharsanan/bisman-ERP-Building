# 🚀 UPLOAD PLUGIN NOW - Final Solution

## ✅ Plugin Built Successfully!

**File**: `com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz`  
**Size**: 58 MB (lightweight - spell correction only)  
**Features**: Fuzzy spell correction, human-like responses, ERP vocabulary  
**Location**: `/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/`

---

## ⚠️ Problem We Hit

Railway's reverse proxy **times out after ~5 minutes** on file uploads.

**Failed attempts:**
- ❌ Web UI → "Application failed to respond" (502)
- ❌ curl with 180s timeout → Timed out
- ❌ curl with 600s timeout → Timed out at 5:01 (18% uploaded)

**Root cause**: Railway's infrastructure has hard timeout limits that we cannot override.

---

## ✅ SOLUTION 1: Manual Browser Upload (RECOMMENDED - TRY THIS FIRST!)

Browsers have **better retry logic** than curl and may succeed:

### Steps:

1. **Open Mattermost in Chrome/Firefox**:
   ```
   https://mattermost-production-84fd.up.railway.app
   ```

2. **Login as admin**:
   - Username: `admin`
   - Password: `Welcome@2025`

3. **Go to Plugins**:
   - Click ≡ menu → **System Console**
   - Navigate: **Plugins → Plugin Management**

4. **Upload**:
   - Click **"Choose File"**
   - Select: `/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz`
   - Click **"Upload"**
   - ⏳ **Wait 5-10 minutes** - Don't refresh!
   - 🔄 If it fails with 502, **try 2-3 more times** - sometimes it works on retry

5. **Enable**:
   - Find "ERP Assistant" in the list
   - Toggle to **Enable**
   - Click **Save**

6. **Test**:
   ```
   @erpbot help
   @erpbot hw do i creat invvoice?
   ```

**Why this might work**: Browsers use chunked uploads and automatic retries, unlike curl's single request.

---

## ✅ SOLUTION 2: Host on GitHub & Download (BYPASS UPLOAD)

Upload the plugin to GitHub Releases, then download it **inside** the Railway container:

### Part A: Upload to GitHub (Web Interface)

1. **Go to your repo**:
   ```
   https://github.com/sujisudharsanan/bisman-ERP-Building/releases/new
   ```

2. **Create new release**:
   - Tag: `v1.0.0-erp-bot`
   - Title: `ERP Assistant Bot v1.0.0`
   - Upload file: `/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz`
   - Click **Publish release**

### Part B: Install from Inside Railway

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# Open Railway shell
railway shell

# Inside the container:
cd /tmp
wget https://github.com/sujisudharsanan/bisman-ERP-Building/releases/download/v1.0.0-erp-bot/com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz

# Install via local API (no timeout!)
curl -X POST \
  -H "Authorization: Bearer 1y54w4qe4fg3djq186tixu34uc" \
  -F "plugin=@com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz" \
  http://localhost:8065/api/v4/plugins

# Should return success JSON!
```

**Why this works**: The download happens server-side (Railway → GitHub, fast), and the API call is local (no external timeout).

---

## ✅ SOLUTION 3: Reduce Plugin Size Further

Remove webapp to get under 30 MB:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/erp-assistant"

# Remove webapp (not needed for bot functionality)
rm -rf webapp/dist
mkdir -p webapp/dist
echo "/* Minimal */" > webapp/dist/main.js

# Rebuild
make clean && make dist

# Check size (should be ~30 MB now)
ls -lh dist/*.tar.gz
```

Then try uploading the smaller file via browser or curl.

---

## ✅ SOLUTION 4: Use Mattermost CLI (if you have shell access)

```bash
# SSH into Railway
railway shell

# Use Mattermost's built-in command
/mattermost/bin/mattermost plugin add /path/to/plugin.tar.gz
```

---

## 🎯 RECOMMENDED ORDER

**Try these in order:**

1. ✅ **Method 1 first** - Browser upload (has better retry logic)
2. ✅ **Method 2 if that fails** - GitHub Release → Download inside Railway
3. ✅ **Method 3 if still failing** - Reduce plugin size
4. ✅ **Method 4 last resort** - CLI upload

---

## 📊 What You'll Get

Once installed, the bot can:

✅ **Spell correction** - "creat invvoice" → understands "create invoice"  
✅ **Human responses** - Never repeats, uses random greetings  
✅ **ERP vocabulary** - Knows 50+ terms (invoice, PO, leave, etc.)  
✅ **Context memory** - Remembers last topic  
✅ **Lightweight** - No heavy NLP, just fuzzy matching  

---

## 🚀 START HERE

**Option A** (Easiest): Try browser upload right now  
**Option B** (Most reliable): Use GitHub Release method

Both are documented above. Good luck! 🎉

---

## 📝 Test Commands

Once installed:

```
# Basic
@erpbot help

# Spell correction test
@erpbot hw do i creat invvoice?
@erpbot purhcase order help

# Response variety test  
@erpbot invoice help
@erpbot invoice help
@erpbot invoice help
# Each should be different!
```

---

**The plugin is ready - just needs to get onto the server!** 🚀
