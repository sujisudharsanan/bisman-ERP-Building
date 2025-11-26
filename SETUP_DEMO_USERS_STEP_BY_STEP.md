# 🚀 DEMO USERS SETUP - STEP BY STEP GUIDE

## ✅ WHAT WE'VE COMPLETED

### 1. Extended Database Schema ✅
Added 10 new tables to your Prisma schema:
- `user_profiles` - Personal details (name, phone, DOB, blood group, etc.)
- `user_addresses` - Home and office addresses  
- `user_kyc` - PAN and Aadhaar verification
- `user_bank_accounts` - Banking details
- `user_education` - Education history
- `user_skills` - Professional skills with proficiency levels
- `user_achievements` - Awards and accomplishments
- `user_emergency_contacts` - Emergency contact information
- `branches` - Branch/location management
- `user_branches` - User-branch assignments

### 2. Created Comprehensive Seed Script ✅
File: `/my-backend/prisma/seed-complete-users.ts`

Creates 10 new demo users with COMPLETE data:
1. **CFO** - Rajesh Verma
2. **Finance Controller** - Meera Singh  
3. **Operations Manager** - Vikram Reddy
4. **Hub Incharge** - Arun Kumar
5. **HR Manager** - Priya Sharma
6. **Procurement Officer** - Amit Patel
7. **Store Incharge** - Suresh Yadav
8. **Compliance Officer** - Kavita Iyer
9. **Legal Head** - Deepak Mishra
10. **Accounts Payable** - Rohit Desai

### 3. Updated Login Page UI ✅
File: `/my-frontend/src/app/auth/login/page.tsx`

Now shows 12 demo accounts in 5 hierarchical categories:
- System Administration (2 users)
- Executive Management (2 users)
- Finance Department (2 users)
- Operations (3 users)
- Support Functions (3 users)

---

## 🔧 WHAT YOU NEED TO DO NOW

### Step 1: Generate Prisma Client
```bash
cd my-backend
npx prisma generate
```
**Expected output:** "Generated Prisma Client" message

---

### Step 2: Apply Database Schema
```bash
cd my-backend
npx prisma db push
```
**Expected output:** "The database is now in sync with your Prisma schema"

This creates all 10 new tables in your PostgreSQL database.

---

### Step 3: Run the Seed Script
```bash
cd my-backend
npx tsx prisma/seed-complete-users.ts
```

**Expected output:**
```
🌱 Starting comprehensive seed...
✅ Using Super Admin: super_admin@bisman.erp
✅ Using Client: [Your Client Name]
✅ Branch created: Bisman Headquarters

📝 Creating user: Arun Kumar (HUB_INCHARGE)
  ✅ User created: arun.kumar@bisman.demo
    ✅ Profile created
    ✅ 2 addresses created
    ✅ KYC created
    ✅ Bank account created
    ✅ 1 education records created
    ✅ 3 skills created
    ✅ 1 achievements created
    ✅ 1 emergency contacts created
    ✅ Branch assigned
✅ Completed: Arun Kumar

[... repeats for all 10 users ...]

🎉 Comprehensive seed completed successfully!
```

---

### Step 4: Verify Users Were Created
```bash
cd my-backend
node verify-seed.js
```

**Expected output:**
```
🔍 Verifying Demo Users Creation
================================================================================

✅ Found 10 demo users:

1. rajesh.verma@bisman.demo       | Role: CFO                      
2. meera.singh@bisman.demo        | Role: FINANCE_CONTROLLER      
3. vikram.reddy@bisman.demo       | Role: OPERATIONS_MANAGER      
4. arun.kumar@bisman.demo         | Role: HUB_INCHARGE            
5. priya.sharma@bisman.demo       | Role: HR_MANAGER              
6. amit.patel@bisman.demo         | Role: PROCUREMENT_OFFICER     
7. suresh.yadav@bisman.demo       | Role: STORE_INCHARGE          
8. kavita.iyer@bisman.demo        | Role: COMPLIANCE_OFFICER      
9. deepak.mishra@bisman.demo      | Role: LEGAL_HEAD              
10. rohit.desai@bisman.demo       | Role: ACCOUNTS_PAYABLE        

📋 User Profiles: 10/10
📍 Addresses: 20 (should be 20)
🆔 KYC Records: 10/10
🏦 Bank Accounts: 10/10
🎓 Education Records: 13
💪 Skills: 34

🔐 All demo users password: Demo@123
```

---

### Step 5: Test Login
1. Go to http://localhost:3000/auth/login
2. You should see all 12 demo accounts organized in categories
3. Try logging in with any user:

**Working Users (Already Exist):**
- ✅ `enterprise@bisman.erp` / `enterprise123`
- ✅ `business_superadmin@bisman.demo` / `Super@123`

**New Users (After Seed):**
- ✨ `rajesh.verma@bisman.demo` / `Demo@123` (CFO)
- ✨ `meera.singh@bisman.demo` / `Demo@123` (Finance Controller)
- ✨ `vikram.reddy@bisman.demo` / `Demo@123` (Operations Manager)
- ✨ `arun.kumar@bisman.demo` / `Demo@123` (Hub Incharge)
- ✨ `priya.sharma@bisman.demo` / `Demo@123` (HR Manager)
- ✨ `amit.patel@bisman.demo` / `Demo@123` (Procurement Officer)
- ✨ `suresh.yadav@bisman.demo` / `Demo@123` (Store Incharge)
- ✨ `kavita.iyer@bisman.demo` / `Demo@123` (Compliance Officer)
- ✨ `deepak.mishra@bisman.demo` / `Demo@123` (Legal Head)
- ✨ `rohit.desai@bisman.demo` / `Demo@123` (Accounts Payable)

---

## 🐛 TROUBLESHOOTING

### Issue: "Module not found: tsx"
**Solution:**
```bash
cd my-backend
npm install -D tsx
```

### Issue: "Relation does not exist" when running seed
**Solution:** Run Step 2 again (`npx prisma db push`)

### Issue: "Super Admin not found" in seed script
**Solution:** Make sure you have a super_admin user. Check with:
```bash
cd my-backend
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.superAdmin.findFirst().then(r=>console.log(r)).finally(()=>p.\$disconnect())"
```

### Issue: Seed script runs but users not created
**Solution:** Check for errors in the seed output. The script uses upsert, so it's safe to run multiple times.

---

## 📊 WHAT EACH USER HAS

Every demo user includes:

### Core Auth Data
- Username, email, password (bcrypt hashed)
- Role assignment
- Active status
- Product type (PUMP_ERP or BUSINESS_ERP)

### Personal Profile
- Full name, employee code
- Phone numbers (primary + alternate)
- Date of birth, gender, blood group
- Father's and mother's names
- Marital status

### Addresses (2 per user)
- **Permanent Address:** Home address in various Indian cities
- **Office Address:** Branch/office location

### KYC Documents
- PAN number (fictional)
- Aadhaar number (fictional)
- Verification status: VERIFIED

### Bank Account
- Account holder name
- Bank name (HDFC, SBI, ICICI, etc.)
- Branch name
- Account number (fictional)
- IFSC code

### Education
- Degree(s) with institution names
- Year of passing
- Grades/CGPA
- (1-2 records per user based on role)

### Professional Skills
- 3-4 relevant skills per role
- Proficiency levels: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT

### Achievements
- 1 notable achievement per user
- With description and date

### Emergency Contact
- Name, relationship
- Phone numbers

### Branch Assignment
- All users assigned to "Bisman Headquarters" branch

---

## 📝 FILES REFERENCE

### Created Files:
- `/my-backend/prisma/schema-extensions.prisma` - Reference schema
- `/my-backend/prisma/seed-complete-users.ts` - Main seed script
- `/my-backend/check-users.js` - Helper to check current users
- `/my-backend/verify-seed.js` - Verification script
- `/COMPREHENSIVE_DEMO_USERS_COMPLETE.md` - Full documentation

### Modified Files:
- `/my-backend/prisma/schema.prisma` - Extended with 10 new models
- `/my-frontend/src/app/auth/login/page.tsx` - Updated UI with hierarchical demo accounts

---

## ✅ SUCCESS CRITERIA

After completing all steps, you should be able to:

1. ✅ See all 12 demo accounts on login page
2. ✅ Login with Enterprise Admin and Super Admin (already working)
3. ✅ Login with any of the 10 new demo users
4. ✅ Each user has complete profile data in database
5. ✅ All users have KYC verified status
6. ✅ All users have bank accounts and education records

---

## 🚀 NEXT STEPS (After Seed Completes)

1. **Set up RBAC permissions** for each role
2. **Configure module access** per role
3. **Create role-specific dashboards**
4. **Test each user's access rights**
5. **Deploy to Railway** (run seed script there too)

---

**Need Help?** Check `/COMPREHENSIVE_DEMO_USERS_COMPLETE.md` for detailed documentation!
