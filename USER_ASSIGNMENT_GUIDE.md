# User Assignment to RBAC Roles - Complete Guide

## Problem Solved
Previously, users couldn't see which users were assigned to RBAC roles (Finance Controller, CFO, Treasury, etc.) because:
1. The Permission Manager showed 24 RBAC roles from `rbac_roles` table
2. But the users API was querying the simple `users.role` field (only 5 roles: ADMIN, MANAGER, etc.)
3. The `rbac_user_roles` junction table had orphaned references to non-existent users

## Solution Implemented

### Backend Changes

#### 1. New API Endpoints (`privilegeRoutes.js`)

**POST /api/privileges/assign-user**
- Assigns a user to an RBAC role
- Validates user and role existence
- Prevents duplicate assignments
- Creates entry in `rbac_user_roles` table

**DELETE /api/privileges/unassign-user**
- Removes a user from an RBAC role
- Deletes from `rbac_user_roles` table

**GET /api/privileges/available-users**
- Returns all users for the assignment dropdown
- Shows username, email, and current role

#### 2. Updated User Query Endpoint
- GET /api/privileges/users now queries `rbac_user_roles` for numeric role IDs
- Falls back to simple role system for text role names
- Returns actual users from the users table (no more orphaned references)

### Frontend Changes

#### 1. New Component: `UserAssignmentDialog.tsx`
- Modal dialog for assigning users to roles
- Dropdown showing all available users
- Success/error handling
- Auto-closes and refreshes after assignment

#### 2. Updated `page.tsx`
- **+ Assign button**: Shows next to "Users in role" header when a role is selected
- **✕ Remove button**: Appears on hover for each user in the list
- Integrated assignment dialog
- Refresh mechanism after assign/unassign

#### 3. Enhanced `usePermissions` Hook
- New `refreshUsers()` method to reload users after assignment changes

#### 4. Updated `api.ts`
- `getAvailableUsers()`: Fetch all users for assignment
- `assignUserToRole()`: POST to assign endpoint
- `unassignUserFromRole()`: DELETE to remove assignment

## How to Use

### Assigning Users to Roles

1. **Navigate to Permission Manager**
   - Go to `/system/permission-manager`
   - Login as Super Admin or Admin

2. **Select a Role**
   - Choose any RBAC role from the "Role" dropdown (e.g., "Finance Controller")

3. **Click "+ Assign" Button**
   - Located in the "Users in role" panel header
   - Opens the assignment dialog

4. **Select User and Assign**
   - Choose a user from the dropdown
   - Click "Assign User"
   - Success message appears
   - User list refreshes automatically

### Removing Users from Roles

1. **Hover Over a User**
   - In the "Users in role" list
   - A red "✕" button appears on the right

2. **Click the ✕ Button**
   - Confirmation dialog appears
   - Confirm to remove
   - User list refreshes automatically

## Database Cleanup

### Orphaned References Removed
The system automatically cleaned up 13 orphaned user-role mappings:
- User IDs 201-211 (non-existent users)
- User ID 0 (invalid)
- User ID 3 (deleted user)

### Current Valid Assignments
After cleanup, 11 valid mappings remain:
- **ADMIN (ID 1)**: 3 users (Suji Sudharsanan, Suji, admin)
- **MANAGER (ID 2)**: 1 user (manager)
- **STAFF (ID 3)**: 1 user (staff)
- **SUPER_ADMIN (ID 7)**: 1 user (Suji Sudharsanan)
- **Admin (ID 9)**: 1 user (Suji)
- **Manager (ID 13)**: 1 user (Suji Sudharsanan)

### Available Users for Assignment
8 total users in database:
- ID 1: Suji Sudharsanan (suji@gmail.com) - SUPER_ADMIN
- ID 2: Suji (Suji@gmail.com) - ADMIN
- ID 4: admin (admin@business.com) - ADMIN
- ID 5: manager (manager@business.com) - MANAGER
- ID 6: staff (staff@business.com) - STAFF
- ID 7: demo_user (demo@bisman.local) - USER
- ID 8: admin_user (admin@bisman.local) - ADMIN
- ID 11: super_admin (super@bisman.local) - SUPER_ADMIN

## Example Workflow

### Assigning Finance Team
To assign users to Finance Controller role:

1. Select "Finance Controller" from Role dropdown
2. Click "+ Assign"
3. Select user (e.g., "admin - admin@business.com")
4. Click "Assign User"
5. User now appears in "Users in role" list
6. Can now manage this user's page permissions

### Managing Multiple Roles
Users can be assigned to multiple RBAC roles:
- Same user can have both "Finance Controller" and "CFO" roles
- Each role can have its own page permissions
- Removing from one role doesn't affect other role assignments

## API Examples

### Assign User (cURL)
```bash
curl -X POST http://localhost:3001/api/privileges/assign-user \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_TOKEN" \
  -d '{"userId": 4, "roleId": 17}'
```

### Remove User (cURL)
```bash
curl -X DELETE "http://localhost:3001/api/privileges/unassign-user?userId=4&roleId=17" \
  -H "Cookie: token=YOUR_AUTH_TOKEN"
```

### Get Available Users (cURL)
```bash
curl http://localhost:3001/api/privileges/available-users \
  -H "Cookie: token=YOUR_AUTH_TOKEN"
```

## Troubleshooting

### "No users found for this role"
- **Cause**: No users assigned to the selected RBAC role
- **Solution**: Click "+ Assign" to assign users

### "User already assigned to this role"
- **Cause**: Trying to assign a user who's already in the role
- **Solution**: Check "Users in role" list - user is already there

### Assignment button not showing
- **Cause**: Not logged in as Admin or Super Admin
- **Solution**: Login with appropriate permissions

### Can't remove a user
- **Cause**: May be the last admin user
- **Solution**: Ensure at least one admin remains in the system

## Database Schema Reference

### rbac_roles
- `id`: Role ID (1-26)
- `name`: Role name (e.g., "Finance Controller")
- `description`: Role description

### rbac_user_roles (Junction Table)
- `user_id`: Foreign key to users.id
- `role_id`: Foreign key to rbac_roles.id
- Creates many-to-many relationship

### users
- `id`: User ID
- `username`: User's username
- `email`: User's email
- `role`: Simple role (TEXT field) - ADMIN, MANAGER, etc.

## Next Steps

1. **Assign Users to Specialized Roles**
   - Finance Controller (ID 17)
   - CFO (ID 16)
   - Treasury (ID 18)
   - Accounts (ID 19)
   - Procurement Officer (ID 22)
   - Store Incharge (ID 23)
   - And others...

2. **Configure Page Permissions**
   - After assigning users, select user from list
   - Use Permission Table to grant/revoke page access
   - Click "Save Changes"

3. **Test the Permissions**
   - Login as assigned user
   - Verify they can access appropriate pages
   - Check role-based dashboard stats

## Summary
✅ Backend API endpoints for assign/unassign complete
✅ Frontend UI with assignment dialog complete
✅ Database cleaned of orphaned references
✅ Users can now be assigned to any RBAC role
✅ Real-time refresh after assignment changes
✅ Hover-to-remove functionality for easy management

The Permission Manager now fully supports the RBAC system with all 24 roles!
