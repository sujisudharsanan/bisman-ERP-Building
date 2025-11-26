# 🚀 FINAL SETUP - RUN THESE COMMANDS

## Current Status
✅ All tables created (user_profiles, user_addresses, user_kyc, etc.)
✅ bcrypt installed
⏳ Seed script ready but needs schema sync

## Run These Commands in Order:

### 1. Sync Database Schema (30 seconds)
```bash
cd my-backend
npx prisma db push --force-reset
```
**Note:** This will reset your database! If you want to keep existing data, use `--accept-data-loss` instead

### 2. Generate Prisma Client (10 seconds)
```bash
npx prisma generate
```

### 3. Run Seed Script (30 seconds)
```bash
npx tsx prisma/seed-complete-users.ts
```

**Expected Output:**
```
🌱 Starting comprehensive seed...
✅ Using Super Admin: business_superadmin@bisman.demo
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

[... 9 more users ...]

🎉 Comprehensive seed completed successfully!
```

### 4. Verify (5 seconds)
```bash
node verify-seed.js
```

Should show:
```
✅ Found 12 demo users
📋 User Profiles: 10/10
📍 Addresses: 20
🆔 KYC Records: 10/10
🏦 Bank Accounts: 10/10
```

---

## Alternative: Manual Seed (If tsx fails)

If `npx tsx` doesn't work, convert to JS:
```bash
# Install ts-node
npm install -D ts-node

# Run with ts-node
npx ts-node prisma/seed-complete-users.ts
```

---

## Test Login

After seed completes successfully, try logging in at `http://localhost:3000/auth/login` with:

**New Demo Users (Password: `Demo@123`):**
1. rajesh.verma@bisman.demo (CFO)
2. meera.singh@bisman.demo (Finance Controller)
3. vikram.reddy@bisman.demo (Operations Manager)
4. arun.kumar@bisman.demo (Hub Incharge)
5. priya.sharma@bisman.demo (HR Manager)
6. amit.patel@bisman.demo (Procurement Officer)
7. suresh.yadav@bisman.demo (Store Incharge)
8. kavita.iyer@bisman.demo (Compliance Officer)
9. deepak.mishra@bisman.demo (Legal Head)
10. rohit.desai@bisman.demo (Accounts Payable)

---

## Troubleshooting

### Error: "client_code column does not exist"
**Solution:** Run `npx prisma db push` again

### Error: "bcrypt not found"
**Solution:** `npm install bcrypt`

### Error: "No client found"
**Check:** `node check-setup.js` to see available clients

### Seed runs but no users created
**Check:** The seed output for errors. Common issue is missing client or super admin.

---

## Quick Verification
```bash
# Check how many demo users exist
node quick-check.js
```

Expected: Should show 12 users total (2 existing + 10 new)

---

**All files are ready! Just run the 3 commands above and you're done! 🎉**
