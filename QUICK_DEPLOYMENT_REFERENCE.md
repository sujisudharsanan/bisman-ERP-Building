# 🚀 Quick Deployment Reference Card

**BISMAN ERP Production Deployment - November 14, 2025**

---

## ✅ COMPLETED TASKS

- [x] Code committed to git
- [x] Pushed to GitHub (`deployment` branch)
- [x] Database backed up (3 files, 345 KB total)
- [x] Documentation complete (6 guides)
- [x] Hub Incharge login issue documented
- [x] Production checklist created
- [x] Security hardening guide included

---

## 📦 Database Files

Location: `./database-backups/`

| File | Size | Purpose |
|------|------|---------|
| bisman_backup_20251114_012648.dump | 140 KB | Full binary backup |
| bisman_production_20251114_012648.sql | 128 KB | SQL import file |
| bisman_schema_20251114_012648.sql | 77 KB | Schema only |

---

## 🔑 Critical Credentials

### Test Users (Demo)
```
Enterprise Admin:
  Email: admin@bisman.erp
  Password: (set your own)

Hub Incharge:
  Email: demo_hub_incharge@bisman.demo
  Password: Demo@123

Store Incharge:
  Email: demo_store_incharge@bisman.demo
  Password: Demo@123
```

**⚠️ IMPORTANT**: Change all passwords in production!

---

## 🔧 Quick Fix: Hub Incharge Login

If Hub Incharge can't login after deployment:

### 1. Check Database
```bash
psql -U postgres -d BISMAN -c "SELECT * FROM users WHERE role LIKE '%incharge%';"
```

### 2. Grant Permissions
```sql
INSERT INTO rbac_user_permissions (user_id, page_key, can_view)
SELECT u.id, 'hub-incharge-dashboard', true
FROM users u
WHERE u.role LIKE '%incharge%';
```

### 3. Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'
```

---

## 🚀 Deployment Commands

### Import Database
```bash
# Production import
psql -U <prod_user> -d <prod_db> -f bisman_production_20251114_012648.sql
```

### Start Services
```bash
# Backend
cd my-backend
npm install --production
npm start

# Frontend
cd my-frontend
npm install
npm run build
npm start
```

---

## 📊 Production Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<GENERATE_64_CHAR_RANDOM>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
FRONTEND_URL=https://your-domain.com
```

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_DIRECT_BACKEND=false
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## 🧪 Post-Deployment Tests

### 1. Authentication
- [ ] Enterprise Admin can login
- [ ] Hub Incharge can login ⚡ CRITICAL
- [ ] Store Incharge can login
- [ ] All roles redirect correctly

### 2. Features
- [ ] Chat opens and minimizes
- [ ] Profile pictures display
- [ ] Password reset works
- [ ] Help & support accessible

### 3. Security
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Cookies secure
- [ ] JWT secret changed

---

## 📁 Key Documentation

1. **PRODUCTION_DEPLOYMENT_CHECKLIST.md** - Full deployment guide
2. **DEPLOYMENT_SUCCESS_SUMMARY.md** - This deployment's summary
3. **CHAT_MINIMIZE_FEATURE.md** - Chat feature docs
4. **PASSWORD_RESET_COMPLETE_GUIDE.md** - Reset flow
5. **CLEANUP_SUMMARY.md** - What was cleaned
6. **MATTERMOST_REMOVAL_SUMMARY.md** - Integration removal

---

## 🔗 GitHub

**Repository**: sujisudharsanan/bisman-ERP-Building  
**Branch**: `deployment`  
**Status**: ✅ Pushed successfully

**Create PR**: https://github.com/sujisudharsanan/bisman-ERP-Building/pull/new/deployment

---

## 📞 Emergency Contacts

### If Things Break

1. **Check Logs**
   ```bash
   pm2 logs bisman-backend
   pm2 logs bisman-frontend
   ```

2. **Database Issues**
   ```bash
   psql -U postgres -d BISMAN
   \dt  # List tables
   SELECT COUNT(*) FROM users;
   ```

3. **Frontend Errors**
   - Open browser console (F12)
   - Check Network tab
   - Look for CORS errors

4. **Backend Errors**
   - Check `PORT` is correct
   - Verify `DATABASE_URL`
   - Confirm `JWT_SECRET` set

---

## ⚡ Super Quick Start

```bash
# 1. Import database
psql -U postgres -d BISMAN -f bisman_production_20251114_012648.sql

# 2. Backend
cd my-backend && npm install && npm start

# 3. Frontend (new terminal)
cd my-frontend && npm install && npm run build && npm start

# 4. Test login
open http://localhost:3000/auth/login
```

---

## 📈 What's New in This Release

✨ **New Features**:
- Chat minimize to bottom bar
- Profile picture everywhere
- Password reset flow
- Help & support system
- Database migration automation

🧹 **Cleanup**:
- 472 backup files removed
- 248 docs archived
- Mattermost removed (40+ files)
- 6 MB disk space freed

🐛 **Fixes**:
- Chat dimensions increased
- Profile picture display
- Authentication flow
- Hub Incharge redirect

---

## 🎯 Success Criteria

Deployment is successful when:
- [ ] All roles can login
- [ ] Hub Incharge accesses their dashboard
- [ ] Chat works (minimize/maximize)
- [ ] Profile pictures load
- [ ] No console errors
- [ ] Database queries < 500ms
- [ ] Pages load < 3 seconds

---

**Last Updated**: November 14, 2025 @ 01:26 AM  
**Status**: ✅ PRODUCTION READY  
**Database**: 21 users, 16 roles, 35+ tables  
**GitHub**: Pushed to `deployment` branch  

🎉 **Ready for Production Deployment!** 🎉
