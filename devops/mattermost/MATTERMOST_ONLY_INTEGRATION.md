# ✅ Mattermost Team Chat Integration

## 🎯 What You Have Now

Your Spark chat button now opens **Mattermost Team Chat** directly - no Ollama AI, just pure team collaboration!

### Features:
- 👥 **Team Collaboration** - Full Mattermost chat
- 📢 **Channels** - Role-based channel access
- 💬 **Direct Messages** - One-on-one conversations
- 📎 **File Sharing** - Share documents with team
- 🔔 **Mentions & Notifications** - Stay updated
- 🔐 **Auto-Login** - Seamless authentication

---

## 🚀 How It Works

### User Experience:
1. Click the **Spark** button (floating chat icon, bottom-right)
2. Chat widget opens showing **Mattermost Team Chat**
3. Start collaborating with your team!

### Technical Flow:

```
User Clicks Spark Icon
         ↓
Chat Widget Opens
         ↓
  ┌─────────────────┐
  │  Mattermost     │
  │   Team Chat     │
  │                 │
  │  Auto-Provision │
  │   & Auto-Login  │
  └─────────────────┘
         ↓
  User sees their
  channels & messages
```

---

## 📋 Setup Checklist

### ✅ Already Completed:
- PostgreSQL database created on Railway
- Mattermost deployed: https://mattermost-production-84fd.up.railway.app
- Frontend component updated (`ERPChatWidget.tsx`)
- Auto-provisioning API ready
- MattermostEmbed component configured

### 🔲 To Complete (If Not Done):

#### 1. Create Mattermost Admin Account
```
Open: https://mattermost-production-84fd.up.railway.app
Register as first user → becomes system admin
```

#### 2. Generate Personal Access Token
```
Login as admin
Go to: Profile → Security → Personal Access Tokens
Create Token: "ERP Integration"
Copy the token (shown only once!)
```

#### 3. Update Frontend Environment Variables

Edit `my-frontend/.env.local`:
```env
# Mattermost Configuration
MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
MM_ADMIN_TOKEN=<your-personal-access-token-here>
NEXT_PUBLIC_MM_TEAM_SLUG=erp

# Demo password for auto-provisioned users
NEXT_PUBLIC_MM_DEMO_PASSWORD=Welcome@2025
```

#### 4. Restart Frontend
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev
```

---

## 🔧 Technical Details

### Component: `ERPChatWidget.tsx`
**Location:** `my-frontend/src/components/ERPChatWidget.tsx`

**What Changed:**
- ❌ Removed: Ollama AI chat tab
- ❌ Removed: `useOllamaChat` hook
- ❌ Removed: AI message input/suggestions
- ❌ Removed: Tab switcher UI
- ✅ Kept: Mattermost integration only
- ✅ Simplified: Direct to team chat

**Current State:**
```tsx
// Simplified component - Mattermost only
export default function ERPChatWidget() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button onClick={() => setOpen(!open)}>
        <ChatSmileMessageIcon />
      </button>
      
      {open && (
        <div className="chat-widget">
          <div className="header">Spark - Team Chat</div>
          <MattermostEmbed />
        </div>
      )}
    </div>
  );
}
```

### Component: `MattermostEmbed.tsx`
**Location:** `my-frontend/src/components/chat/MattermostEmbed.tsx`

**Features:**
- Auto-provisions users in Mattermost
- Handles authentication
- Embeds Mattermost in iframe
- Role-based channel assignment

**Provisioning Flow:**
```
1. User opens Spark chat
   ↓
2. MattermostEmbed loads
   ↓
3. Calls /api/mattermost/provision
   - Creates user if not exists
   - Adds to team "erp"
   - Assigns to channels based on role
   ↓
4. Calls /api/mattermost/login
   - Authenticates user
   - Sets session cookies
   ↓
5. Loads Mattermost iframe
   - User sees their channels
   - Ready to chat!
```

---

## 📢 Role-Based Channels

### All Users:
- **Town Square** - General announcements
- **Off-Topic** - Casual conversations

### Managers & Admins:
- **Management** - Leadership discussions
- **Reports** - Analytics & data

### Admins Only:
- **System-Alerts** - Critical system notifications
- **Admin-Only** - Admin-specific discussions

---

## 🎨 Customization

### Change Widget Title:
```tsx
// In ERPChatWidget.tsx
<div className="font-semibold">Team Collaboration</div>
```

### Change Default Team:
```env
# In .env.local
NEXT_PUBLIC_MM_TEAM_SLUG=your-team-name
```

### Add More Channels:
Edit `my-frontend/src/app/api/mattermost/provision/route.ts`:
```typescript
// Add your custom channel
await mmEnsureChannel(teamId, 'your-channel', 'Your Channel Name');
```

---

## 🔐 Security

### User Provisioning:
- Users created with ERP username + email
- Password: `NEXT_PUBLIC_MM_DEMO_PASSWORD` (change in production!)
- Role-based channel access enforced
- Auto-login via session tokens

### Best Practices:
1. **Change demo password** in production
2. **Enable MFA** for admin accounts
3. **Regular backups** of Mattermost database
4. **Monitor** Railway logs for issues
5. **Rotate** Personal Access Tokens periodically

---

## 🧪 Testing

### Test Checklist:

#### ✅ Chat Widget Opens
```
1. Login to ERP
2. Click Spark button (bottom-right)
3. Widget should open with "Spark - Team Chat" header
```

#### ✅ User Provisioning
```
1. Open widget for first time
2. User should be auto-created in Mattermost
3. Check Mattermost admin panel → Users
```

#### ✅ Channel Access
```
1. Login as different roles (admin, manager, employee)
2. Verify correct channels appear for each role
```

#### ✅ Team Chat
```
1. Send message in a channel
2. Should appear in Mattermost web UI
3. Other users should see it
```

---

## 📊 API Endpoints

### Health Check
```bash
curl http://localhost:3000/api/mattermost/health
# Returns: {"status":"OK","mattermost":{"healthy":true,...}}
```

### Provision User
```bash
curl -X POST http://localhost:3000/api/mattermost/provision \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","role":"employee"}'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/mattermost/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"Welcome@2025"}'
```

---

## 🐛 Troubleshooting

### Widget Shows Loading Forever
**Cause:** Environment variables not set  
**Fix:** 
```bash
# Check .env.local has:
MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
MM_ADMIN_TOKEN=<your-token>
```

### "User Not Provisioned" Error
**Cause:** Provisioning API failed  
**Fix:**
```bash
# Check Railway logs:
railway logs --service mattermost

# Verify database connection
# Check MM_ADMIN_TOKEN is valid
```

### Channels Not Showing
**Cause:** User not added to team/channels  
**Fix:**
```bash
# Check Mattermost admin panel
# Manually add user to team
# Or delete user and re-provision
```

### "Cannot Connect to Mattermost" Error
**Cause:** Mattermost service down  
**Fix:**
```bash
# Check Railway service status
railway status

# Restart Mattermost service
railway restart --service mattermost
```

---

## 📈 Monitoring

### Check Mattermost Health:
```bash
curl https://mattermost-production-84fd.up.railway.app/api/v4/system/ping
# Returns: {"status":"OK"}
```

### Check Railway Logs:
```bash
railway logs --service mattermost --tail 100
```

### Check Frontend Logs:
```bash
# In browser console (F12)
# Look for Mattermost provisioning logs
```

---

## 📚 Resources

### Mattermost Docs:
- API Reference: https://api.mattermost.com/
- User Guide: https://docs.mattermost.com/guides/user.html
- Admin Guide: https://docs.mattermost.com/guides/administrator.html

### Railway Docs:
- Services: https://docs.railway.app/deploy/services
- Databases: https://docs.railway.app/databases/postgresql
- Logs: https://docs.railway.app/develop/logs

### Your Deployment:
- Mattermost URL: https://mattermost-production-84fd.up.railway.app
- Railway Project: discerning-creativity
- Database: shuttle.proxy.rlwy.net:15067

---

## 🎯 Next Steps

### Immediate:
1. ✅ Complete admin setup (if not done)
2. ✅ Generate Personal Access Token
3. ✅ Update `.env.local` 
4. ✅ Restart frontend
5. ✅ Test chat widget

### Future Enhancements:
- 📱 Mobile responsive optimization
- 🔔 Desktop notifications
- 📊 Analytics dashboard
- 🤖 Chatbot integrations (non-Ollama)
- 📧 Email notifications
- 🔗 Third-party integrations (Jira, GitHub, etc.)

---

## ✅ Summary

**What You Have:**
- Pure Mattermost team chat integration
- No Ollama AI dependencies
- Clean, simple chat widget
- Auto-provisioning for ERP users
- Role-based channel access

**Status:** ✅ **READY TO USE!**  
**URL:** https://mattermost-production-84fd.up.railway.app  
**Component:** `ERPChatWidget.tsx` (Mattermost only)  
**Location:** Bottom-right Spark button

**Action Required:**
1. Create admin account in Mattermost
2. Generate Personal Access Token
3. Update `.env.local` with token
4. Restart frontend (`npm run dev`)

Then you're all set for team collaboration! 🚀
