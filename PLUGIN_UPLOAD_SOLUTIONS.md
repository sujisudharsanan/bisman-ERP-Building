# 🔧 Plugin Upload Alternative Methods

## Problem: Upload Timeout

The Mattermost server is timing out when uploading the 87 MB plugin because:
- Railway has request timeout limits
- Large file uploads need special handling
- The "Application failed to respond" error is a timeout

## ✅ Solution 1: Direct File Copy (BEST)

Copy the plugin directly into the Mattermost container:

### Step 1: Copy to Local Mattermost Plugins Folder

```bash
# If you have local Mattermost installed
cp "/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz" \
   /path/to/mattermost/plugins/
```

### Step 2: Extract in Container

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# SSH into Railway
railway run bash

# Inside container:
cd /mattermost/plugins
# Upload file here manually or use wget
```

## ✅ Solution 2: Increase Server Timeout

Modify Railway environment variables:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# Add timeout environment variable
railway variables set MM_SERVICESETTINGS_WRITEREADHEADERTIMEOUT=300

# Restart
railway up
```

## ✅ Solution 3: Use Smaller Plugin (RECOMMENDED)

The plugin is large because of NLP libraries. Create a lighter version:

### Remove Heavy Dependencies:

Edit `erp-assistant/go.mod` and remove:
```
github.com/jdkato/prose/v2 v2.0.0  # Heavy NLP library
```

Keep only:
```
github.com/sajari/fuzzy v1.0.0  # Lightweight spell checker
```

### Rebuild:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/erp-assistant"
make clean
make dist
```

New size will be ~20 MB instead of 87 MB!

## ✅ Solution 4: Upload via Docker Volume

If using Docker locally:

```bash
# Copy to Docker volume
docker cp "/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz" \
  mattermost-container:/mattermost/plugins/

# Restart Mattermost
docker restart mattermost-container
```

## ✅ Solution 5: Manual Installation via CLI

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# Use Mattermost CLI tool
railway run -- /mattermost/bin/mattermost plugin add /path/to/plugin.tar.gz
```

## 🎯 QUICK FIX: Simplify Plugin

I'll create a lightweight version without prose (NLP):

### Benefits:
- ✅ Smaller file (20 MB vs 87 MB)
- ✅ Uploads quickly
- ✅ Still has spell correction
- ✅ Still human-like responses
- ❌ No NLP tokenization (but spell check still works!)

### To Create:

1. Remove prose from `go.mod`
2. Remove `analyzeWithProse()` function  
3. Use simple token splitting instead
4. Rebuild

Would you like me to create the lightweight version?

---

## Alternative: Test with Old Simple Bot

The old simple bot (58 MB) might upload successfully:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/erp-assistant/server"
cp plugin.go.backup plugin.go
cd ..
make dist
# Try uploading the smaller 58 MB version
```

---

## Recommended Next Steps:

1. **Try Simple Bot First** - Test if smaller file uploads
2. **Create Lightweight Version** - Remove prose, keep fuzzy
3. **Increase Server Timeout** - Configure Railway limits
4. **Manual Container Copy** - Direct file placement

Let me know which approach you'd like to try!
