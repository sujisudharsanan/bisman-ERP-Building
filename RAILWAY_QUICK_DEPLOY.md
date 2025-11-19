# 🚀 Quick Railway Deployment Commands

## Option 1: Automatic (Recommended)
```bash
./deploy-hr-to-railway.sh
```

## Option 2: Manual with Railway CLI
```bash
# Get DATABASE_URL
railway variables get DATABASE_URL

# Deploy
RAILWAY_DATABASE_URL="paste-url-here" node railway-hr-deployment.js
```

## Option 3: Direct from Railway Dashboard
1. Open Railway Dashboard → PostgreSQL service → Query tab
2. Run this query:

```sql
-- Quick HR setup (replace hash with actual bcrypt hash)
DO $$
DECLARE
  hr_user_id INTEGER;
BEGIN
  -- Insert HR user
  INSERT INTO users (username, email, password, role)
  VALUES ('demo_hr', 'demo_hr@bisman.demo', 
    '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'HR')
  ON CONFLICT (email) DO UPDATE SET role = 'HR'
  RETURNING id INTO hr_user_id;
  
  -- Create permissions table
  CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    allowed_pages TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
  );
  
  -- Add permissions
  INSERT INTO user_permissions (user_id, allowed_pages)
  VALUES (hr_user_id, ARRAY['user-creation', 'user-settings', 'about-me'])
  ON CONFLICT (user_id) DO UPDATE SET allowed_pages = EXCLUDED.allowed_pages;
  
  RAISE NOTICE 'HR user setup complete!';
END $$;
```

## 🔐 Generate Password Hash
```bash
cd my-backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('hr123', 10).then(console.log)"
```

## ✅ Test After Deployment
- **URL**: Your Railway app URL
- **Email**: demo_hr@bisman.demo
- **Password**: hr123
- **Expected**: Sidebar shows "Create New User"

---
**Quick verification:**
```sql
SELECT u.username, u.role, up.allowed_pages 
FROM users u 
LEFT JOIN user_permissions up ON u.id = up.user_id 
WHERE u.email = 'demo_hr@bisman.demo';
```
