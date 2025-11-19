# 🚀 QUICK START: Manual Tenant Isolation Testing

## ✅ Prerequisites Checklist

- [x] Application is running (`npm run dev:both`)
- [ ] You have credentials for at least 2 users from different tenants
- [ ] `jq` command-line JSON processor installed (optional but recommended)

## 📋 Option 1: Interactive Testing Script (Recommended)

### Run the automated test script:

```bash
./manual-tenant-test.sh
```

The script will:
1. ✅ Check if your server is running
2. 🔑 Prompt you for authentication (tokens or credentials)
3. 🧪 Run 5 comprehensive tests:
   - User list isolation
   - Audit log isolation
   - Report authentication
   - Cross-tenant update prevention
   - Module assignment isolation
4. 📊 Show detailed results and summary

### Expected Output:
```
✅ PASS: Tenant A sees only their own users
✅ PASS: Tenant B sees only their own users
✅ PASS: Tenant A audit logs are isolated
✅ PASS: Reports require authentication
✅ PASS: Cross-tenant update blocked
✅ PASS: Module assignments are tenant-isolated

✅ ALL TESTS PASSED (6/6)
```

---

## 📋 Option 2: Manual curl Commands

If you prefer to test manually or the script doesn't work:

### Step 1: Get Authentication Tokens

#### Method A: Login via API
```bash
# Login as Tenant A user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-tenant-a-user@example.com","password":"yourpassword"}'

# Save the token from response
TOKEN_A="<paste_token_here>"

# Repeat for Tenant B user
TOKEN_B="<paste_token_here>"
```

#### Method B: Use existing tokens from your database
```sql
-- Get a valid token from your database or app
SELECT token FROM sessions WHERE user_id = 'some-user-id' LIMIT 1;
```

### Step 2: Test User Isolation

```bash
# Fetch users as Tenant A
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/users | jq .

# Check that all users have the same tenant_id
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/users | jq '.users[].tenant_id' | sort | uniq

# Expected: Only ONE tenant_id should appear
```

### Step 3: Test Audit Log Isolation

```bash
# Fetch audit logs as Tenant A
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/enterprise-admin/dashboard/activity | jq .

# Verify all logs belong to same tenant
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/enterprise-admin/dashboard/activity | \
  jq '.logs[].tenant_id' | sort | uniq

# Expected: Only ONE tenant_id
```

### Step 4: Test Report Authentication

```bash
# Try WITHOUT authentication (should fail)
curl -v http://localhost:5000/api/reports/roles-users

# Expected: HTTP 401 Unauthorized

# Try WITH authentication (should succeed)
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/reports/roles-users | jq .

# Expected: HTTP 200 OK with data
```

### Step 5: Test Cross-Tenant Update Prevention

```bash
# Get a user ID from Tenant B
USER_B_ID=$(curl -s -H "Authorization: Bearer $TOKEN_B" \
  http://localhost:5000/api/users | jq -r '.users[0].id')

echo "Tenant B User ID: $USER_B_ID"

# Try to update Tenant B user as Tenant A (should fail)
curl -X PUT \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"email":"hacked@evil.com"}' \
  http://localhost:5000/api/users/$USER_B_ID

# Expected: HTTP 404 Not Found or 403 Forbidden
```

### Step 6: Test Module Assignment Isolation

```bash
# Fetch modules as Tenant A
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/modules | jq .

# Verify all modules belong to same tenant
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/modules | \
  jq '.modules[].tenant_id' | sort | uniq

# Expected: Only ONE tenant_id
```

---

## 🔧 Troubleshooting

### Problem: "Server is not responding"
**Solution**: 
```bash
# Check if your app is running
npm run dev:both

# Or check specific terminal
lsof -i :5000  # Check if port 5000 is in use
```

### Problem: "command not found: jq"
**Solution**: 
```bash
# macOS
brew install jq

# Or test without jq (raw JSON output)
curl -H "Authorization: Bearer $TOKEN_A" http://localhost:5000/api/users
```

### Problem: "Authentication failed"
**Solution**:
- Verify token is correct (no extra spaces)
- Check token hasn't expired
- Verify user exists in database and is active
- Check JWT_SECRET environment variable matches

### Problem: "Cannot find user ID for cross-tenant test"
**Solution**:
- Ensure you have users in both tenants
- Verify the API response structure matches expectations
- Manually find a user ID from database if needed

---

## 📊 Success Criteria

For Phase 1 to be considered successful, all these must pass:

| Test | Expected Result | Priority |
|------|----------------|----------|
| **User List** | Only same-tenant users visible | 🔴 P0 |
| **Audit Logs** | Only same-tenant logs visible | 🔴 P0 |
| **Report Auth** | 401 without token, 200 with token | 🔴 P0 |
| **Cross-Tenant Update** | 403/404 error | 🔴 P0 |
| **Module Assignments** | Only same-tenant modules visible | 🟡 P1 |

**Pass Criteria**: All P0 tests must pass ✅

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. ✅ Document results
2. ✅ Create deployment plan
3. ✅ Deploy to staging
4. ✅ Run tests on staging
5. ✅ Deploy to production
6. ⏳ Begin Phase 2 (service layer refactoring)

### If Any Tests Fail ❌
1. 🔍 Review the specific failure
2. 🐛 Debug the affected endpoint
3. 🔧 Apply additional fixes
4. 🔄 Re-run tests
5. 📝 Update documentation

---

## 💡 Tips

1. **Test with Real Data**: Use actual tenant data from your database for realistic testing
2. **Test Edge Cases**: Try with ENTERPRISE_ADMIN role (should see all data)
3. **Monitor Logs**: Watch server logs while testing: `tail -f backend.log`
4. **Use Postman**: Import these curl commands into Postman for easier testing
5. **Database Queries**: Verify filters at DB level with Prisma Studio

---

## 🔐 Security Notes

- ✅ All tests use your production authentication flow
- ✅ No test data is created in your database
- ✅ Tests are read-only (except cross-tenant update test)
- ✅ Safe to run on production database
- ⚠️ Keep your tokens secure - don't commit them to git

---

## 📞 Need Help?

If tests fail or you encounter issues:
1. Check `backend.log` for server errors
2. Review `TEST_RUN_RESULTS.md` for detailed analysis
3. Verify database has users from multiple tenants
4. Confirm JWT_SECRET is set correctly
5. Check that TenantGuard middleware is imported in all files

---

## ✨ What's Being Tested

These manual tests verify the **20+ security fixes** from Phase 1:

### Files Modified:
- ✅ `my-backend/app.js` - 7 queries secured
- ✅ `my-backend/middleware/roleProtection.js` - 4 queries secured
- ✅ `my-backend/routes/reportsRoutes.js` - 4 queries + auth added
- ✅ `my-backend/services/privilegeService.js` - prepared for Phase 2

### Security Improvements:
- ✅ User CRUD operations tenant-isolated
- ✅ Audit logs filtered by tenant
- ✅ Module assignments tenant-aware
- ✅ RBAC permissions tenant-scoped
- ✅ Reports require authentication
- ✅ Cross-tenant data access prevented

---

**Ready to test?** Run: `./manual-tenant-test.sh` 🚀
