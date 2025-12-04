# BISMAN ERP - Database Tables Report

**Generated:** December 4, 2025  
**Database:** PostgreSQL  
**Schema Version:** Latest (Prisma-managed)  
**Security Version:** P0 Security Corrections Applied

---

## ⚠️ Security Notes

### Password Storage
All password columns have been renamed to `password_hash` to make it explicit that:
- Only bcrypt/argon2 hashed passwords are stored
- Plaintext passwords are **never** stored

### PII Encryption
Sensitive PII data is encrypted at rest using AES-256-GCM:
- PAN numbers → `pan_encrypted` + `pan_iv` + `pan_last4`
- Aadhaar numbers → `aadhaar_encrypted` + `aadhaar_iv` + `aadhaar_last4`
- Bank account numbers → `account_number_encrypted` + `account_number_iv` + `account_number_last4`

### Session Security
- Session tokens stored as SHA-256 hashes (`token_hash`)
- Token prefix stored for debugging (`token_prefix` - first 8 chars)
- Automatic cleanup of expired sessions

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Multi-Tenant Hierarchy](#2-multi-tenant-hierarchy)
3. [Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
4. [Module & Permission Management](#4-module--permission-management)
5. [Client Management](#5-client-management)
6. [Payment & Expense Workflow](#6-payment--expense-workflow)
7. [Task & Approval System](#7-task--approval-system)
8. [Communication & Messaging](#8-communication--messaging)
9. [User Profile & HR Data](#9-user-profile--hr-data)
10. [System Monitoring & Analytics](#10-system-monitoring--analytics)
11. [AI & Assistant Features](#11-ai--assistant-features)
12. [Security & Rate Limiting](#12-security--rate-limiting)
13. [Enums Reference](#13-enums-reference)

---

## 1. Authentication & User Management

### `users`
**Purpose:** Core user table storing all system users (employees, admins, staff)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Auto-increment user ID |
| username | VARCHAR(100) | Display name |
| email | VARCHAR(150) | Unique login email |
| password_hash | VARCHAR(255) | Bcrypt/Argon2 hashed password (**never plaintext**) |
| role | VARCHAR(50) | User role (ADMIN, STAFF, etc.) |
| is_active | BOOLEAN | Account active status |
| productType | VARCHAR(50) | ERP product type (BUSINESS_ERP) |
| tenant_id | UUID | Client/tenant reference |
| super_admin_id | INT | Parent Super Admin reference |
| created_by | INT | User ID who created this account |
| profile_pic_url | TEXT | Avatar URL |
| theme_preference | VARCHAR(50) | UI theme setting |
| assignedModules | JSON | Modules accessible to user |
| pagePermissions | JSON | Page-level permissions |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last modification time |

**Relationships:** Links to Client, SuperAdmin, Tasks, Messages, Approvals, UserProfile

---

### `user_sessions`
**Purpose:** Track active user sessions for security and audit

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Session ID |
| user_id | INT (FK) | Reference to users |
| session_token | VARCHAR(255) | **DEPRECATED** - Use token_hash |
| token_hash | VARCHAR(64) | SHA-256 hash of session token |
| token_prefix | VARCHAR(8) | First 8 chars for debugging |
| ip_address | INET | Client IP address |
| user_agent | TEXT | Browser/device info |
| expires_at | TIMESTAMP | Session expiration |
| last_activity_at | TIMESTAMP | Last activity timestamp |
| is_active | BOOLEAN | Session validity |

---

### `otp_tokens`
**Purpose:** Store OTP codes for verification (login, password reset, trial signup)

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Token ID |
| email | VARCHAR(150) | Target email |
| purpose | VARCHAR(50) | OTP purpose (LOGIN, RESET, TRIAL) |
| otp_hash | VARCHAR(128) | Hashed OTP code |
| expires_at | TIMESTAMP | Expiration time |
| attempts | INT | Failed verification attempts |
| verified | BOOLEAN | Successfully verified flag |
| blocked_until | TIMESTAMP | Temporary block after failed attempts |

---

## 2. Multi-Tenant Hierarchy

### `enterprise_admins`
**Purpose:** Top-level platform administrators (SaaS owners)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Enterprise Admin ID |
| name | VARCHAR(100) | Full name |
| email | VARCHAR(150) | Unique login email |
| password_hash | VARCHAR(255) | Bcrypt/Argon2 hashed password |
| profile_pic_url | TEXT | Avatar |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last modification time |

**Hierarchy Position:** Level 1 (Top) - Manages Super Admins

---

### `super_admins`
**Purpose:** Business owners/operators managing their organization

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Super Admin ID |
| name | VARCHAR(100) | Full name |
| email | VARCHAR(150) | Unique login email |
| password_hash | VARCHAR(255) | Bcrypt/Argon2 hashed password |
| productType | VARCHAR(50) | Licensed ERP product |
| created_by | INT (FK) | Parent Enterprise Admin |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last modification time |

**Hierarchy Position:** Level 2 - Created by Enterprise Admin, manages Clients/Users

---

### `clients`
**Purpose:** Business entities/tenants (companies, organizations)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Client unique ID |
| name | VARCHAR(200) | Company name |
| client_code | VARCHAR(50) | Internal code (unique) |
| public_code | VARCHAR(50) | Customer-facing code |
| client_number | BIGINT | Sequential number |
| legal_name | VARCHAR(200) | Registered legal name |
| trade_name | VARCHAR(200) | DBA/trade name |
| client_type | VARCHAR(50) | CORPORATE, INDIVIDUAL, etc. |
| industry | VARCHAR(100) | Business industry |
| business_size | VARCHAR(50) | SMALL, MEDIUM, LARGE |
| registration_number | VARCHAR(100) | Company registration |
| tax_id | VARCHAR(50) | GST/Tax ID |
| addresses | JSON | Array of addresses |
| contact_persons | JSON | Contact details |
| financial_details | JSON | Revenue, credit limit |
| bank_details | JSON | Bank accounts |
| documents | JSON | Uploaded documents |
| system_access | JSON | Portal/API access settings |
| modules_enabled | JSON | Enabled ERP modules |
| super_admin_id | INT (FK) | Parent Super Admin |
| subscriptionPlan | VARCHAR(50) | free, PROFESSIONAL, ENTERPRISE |
| subscriptionStatus | VARCHAR(50) | active, suspended, cancelled |
| onboarding_status | VARCHAR(30) | pending, in_progress, completed |
| status | VARCHAR(30) | Active, Inactive, Suspended |

**Hierarchy Position:** Level 3 - Managed by Super Admin, contains Users

---

### `client_sequences`
**Purpose:** Auto-generate sequential client numbers per type/year

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Sequence ID |
| client_type | VARCHAR(50) | Client type category |
| year | INT | Fiscal year |
| last_number | BIGINT | Last assigned number |

---

## 3. Role-Based Access Control (RBAC)

### `roles`
**Purpose:** Simple role definitions (legacy/basic roles)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Role ID |
| name | VARCHAR (unique) | Role name |

---

### `rbac_roles`
**Purpose:** Comprehensive role definitions with hierarchy levels

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Role ID |
| name | VARCHAR(50) | Role identifier (ADMIN, MANAGER) |
| display_name | VARCHAR(150) | Human-readable name |
| description | TEXT | Role description |
| level | INT | Hierarchy level (higher = more power) |
| status | VARCHAR(20) | active, inactive |

---

### `rbac_actions`
**Purpose:** Definable actions/operations (view, create, edit, delete, approve)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Action ID |
| name | VARCHAR(100) | Action identifier |
| display_name | VARCHAR(100) | Human-readable name |
| description | TEXT | What this action does |
| is_active | BOOLEAN | Action availability |

---

### `rbac_routes`
**Purpose:** Protected API routes and menu items

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Route ID |
| path | VARCHAR(255) | URL path (/api/users) |
| name | VARCHAR(100) | Route identifier |
| method | VARCHAR(10) | HTTP method (GET, POST) |
| module | VARCHAR(50) | Parent module |
| is_protected | BOOLEAN | Requires authentication |
| is_menu_item | BOOLEAN | Show in navigation |
| icon | VARCHAR(100) | Menu icon class |
| sort_order | INT | Display order |

---

### `rbac_permissions`
**Purpose:** Junction table: Role + Action + Route = Permission

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Permission ID |
| role_id | INT (FK) | Reference to rbac_roles |
| action_id | INT (FK) | Reference to rbac_actions |
| route_id | INT (FK) | Reference to rbac_routes |
| granted | BOOLEAN | Permission granted/denied |
| is_active | BOOLEAN | Permission active |

**Unique:** (role_id, action_id, route_id)

---

### `rbac_user_roles`
**Purpose:** Assign roles to users with optional expiration

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Assignment ID |
| user_id | INT | Reference to users |
| role_id | INT (FK) | Reference to rbac_roles |
| assigned_at | TIMESTAMP | Assignment date |
| assigned_by | INT | Admin who assigned |
| expires_at | TIMESTAMP | Optional expiration |
| is_active | BOOLEAN | Assignment active |

---

### `rbac_user_permissions`
**Purpose:** Direct user-to-page permission overrides

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Permission ID |
| user_id | INT | Reference to users |
| page_key | VARCHAR(255) | Page/route identifier |

---

### `admin_role_assignments`
**Purpose:** Track role allocations across admin hierarchy levels

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Assignment ID |
| assigner_type | VARCHAR(50) | ENTERPRISE_ADMIN, SUPER_ADMIN, ADMIN |
| assigner_id | INT | Admin who assigned |
| role_id | INT | Role being assigned |
| assignee_type | VARCHAR(50) | Recipient type (SUPER_ADMIN, USER) |
| assignee_id | INT | Recipient user ID |
| is_active | BOOLEAN | Assignment status |

---

## 4. Module & Permission Management

### `modules`
**Purpose:** ERP modules/features available in the system

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Module ID |
| module_name | VARCHAR(100) | Unique identifier (finance, hr) |
| display_name | VARCHAR(150) | Human-readable name |
| description | TEXT | Module description |
| route | VARCHAR(255) | Base route path |
| icon | VARCHAR(100) | Navigation icon |
| productType | VARCHAR(50) | Associated product |
| is_active | BOOLEAN | Module enabled |
| is_always_accessible | BOOLEAN | Common modules (Chat) |
| sort_order | INT | Navigation order |

---

### `permissions`
**Purpose:** Role-based module permissions (CRUD operations)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Permission ID |
| role | VARCHAR(50) | Role name |
| module_id | INT (FK) | Reference to modules |
| can_view | BOOLEAN | View permission |
| can_create | BOOLEAN | Create permission |
| can_edit | BOOLEAN | Edit permission |
| can_delete | BOOLEAN | Delete permission |

---

### `module_assignments`
**Purpose:** Assign modules to Super Admins (what they can access/license)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Assignment ID |
| super_admin_id | INT (FK) | Reference to super_admins |
| module_id | INT (FK) | Reference to modules |
| assigned_at | TIMESTAMP | Assignment date |
| page_permissions | JSON | Granular page permissions |

---

### `client_module_permissions`
**Purpose:** Per-client module access with CRUD controls

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Permission ID |
| client_id | UUID (FK) | Reference to clients |
| module_id | INT (FK) | Reference to modules |
| can_view | BOOLEAN | View permission |
| can_create | BOOLEAN | Create permission |
| can_edit | BOOLEAN | Edit permission |
| can_delete | BOOLEAN | Delete permission |

---

## 5. Client Management

### `onboarding_magic_links`
**Purpose:** Secure one-time links for client onboarding

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Link ID |
| client_id | UUID (FK) | Target client |
| email | VARCHAR(150) | Recipient email |
| token_hash | VARCHAR(255) | Hashed token |
| expires_at | TIMESTAMP | Link expiration |
| used_at | TIMESTAMP | When link was used |
| created_ip | INET | Creator IP |

---

### `client_onboarding_activity`
**Purpose:** Track onboarding step completions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Activity ID |
| client_id | UUID (FK) | Reference to clients |
| step_key | VARCHAR(100) | Step identifier |
| action | VARCHAR(50) | Action taken (started, completed) |
| meta | JSON | Additional data |
| actor_email | VARCHAR(150) | Who performed action |

---

### `branches`
**Purpose:** Physical office/branch locations for clients

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Branch ID |
| tenant_id | UUID (FK) | Parent client |
| branchCode | VARCHAR(50) | Unique branch code |
| branchName | VARCHAR(255) | Branch display name |
| addressLine1/2 | VARCHAR(255) | Street address |
| city, state, country | VARCHAR | Location |
| postalCode | VARCHAR(20) | ZIP/postal code |
| isActive | BOOLEAN | Branch operational |

---

### `user_branches`
**Purpose:** Assign users to branches (many-to-many)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Assignment ID |
| userId | INT (FK) | Reference to users |
| branchId | INT (FK) | Reference to branches |
| isPrimary | BOOLEAN | Primary assignment |

---

## 6. Payment & Expense Workflow

### `payment_requests`
**Purpose:** Payment/invoice requests from users to clients

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Request ID |
| requestId | VARCHAR (unique) | Human-readable ID (PR-2024-0001) |
| clientId | UUID (FK) | Target client |
| clientName | VARCHAR(200) | Client name snapshot |
| clientEmail/Phone | VARCHAR | Contact info |
| subtotal | DECIMAL(18,2) | Amount before tax |
| taxAmount | DECIMAL(18,2) | Tax amount |
| discountAmount | DECIMAL(18,2) | Discount applied |
| totalAmount | DECIMAL(18,2) | Final amount |
| currency | VARCHAR(10) | Currency code (INR) |
| description | TEXT | Request details |
| dueDate | TIMESTAMP | Payment due date |
| invoiceNumber | VARCHAR(100) | Invoice reference |
| status | VARCHAR(50) | DRAFT, PENDING, APPROVED, PAID |
| attachments | JSON | File attachments |
| paymentToken | VARCHAR (unique) | Payment link token |
| createdById | INT (FK) | Creator user |

---

### `payment_request_line_items`
**Purpose:** Individual line items in a payment request

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Line item ID |
| paymentRequestId | CUID (FK) | Parent request |
| description | VARCHAR(500) | Item description |
| quantity | DECIMAL(10,2) | Quantity |
| unit | VARCHAR(50) | Unit of measure |
| rate | DECIMAL(18,2) | Unit price |
| taxRate | DECIMAL(5,2) | Tax percentage |
| discountRate | DECIMAL(5,2) | Discount percentage |
| lineTotal | DECIMAL(18,2) | Calculated total |
| sortOrder | INT | Display order |

---

### `expenses`
**Purpose:** Expense records created from payment requests

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Expense ID |
| requestId | VARCHAR (unique) | Human-readable ID |
| paymentRequestId | CUID (FK) | Source payment request |
| createdById | INT (FK) | Creator |
| amount | DECIMAL(18,2) | Expense amount |
| currency | VARCHAR(10) | Currency |
| status | VARCHAR(50) | DRAFT, SUBMITTED, APPROVED |
| attachments | JSON | Receipts/documents |

---

### `payment_records`
**Purpose:** Actual payment transactions recorded

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Record ID |
| taskId | CUID (FK) | Related approval task |
| paymentRequestId | CUID | Source request |
| paidById | INT (FK) | Who made payment |
| paymentMode | VARCHAR(100) | UPI, Card, Bank Transfer |
| paymentGateway | VARCHAR(100) | Razorpay, Stripe, etc. |
| transactionId | VARCHAR(255) | Gateway transaction ID |
| amount | DECIMAL(18,2) | Paid amount |
| paidAt | TIMESTAMP | Payment timestamp |
| receiptUrl | TEXT | Payment receipt URL |

---

### `payment_activity_logs`
**Purpose:** Audit trail for payment request status changes

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Log ID |
| paymentRequestId | CUID (FK) | Request reference |
| userId | INT (FK) | Actor |
| action | VARCHAR(100) | Action performed |
| oldStatus | VARCHAR(50) | Previous status |
| newStatus | VARCHAR(50) | New status |
| comment | TEXT | Optional comment |
| metadata | JSON | Additional context |

---

## 7. Task & Approval System

### `tasks`
**Purpose:** Workflow tasks for expense/payment approvals

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Task ID |
| expenseId | CUID (FK) | Related expense |
| paymentRequestId | CUID (FK) | Related payment request |
| title | VARCHAR(300) | Task title |
| description | TEXT | Task details |
| currentLevel | INT | Current approval level (0-based) |
| status | VARCHAR(50) | PENDING, APPROVED, REJECTED |
| createdById | INT (FK) | Task creator |
| assigneeId | INT (FK) | Current assignee |
| billId | CUID | Attached bill/receipt |

---

### `approvals`
**Purpose:** Individual approval decisions on tasks

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Approval ID |
| taskId | CUID (FK) | Related task |
| level | INT | Approval level number |
| levelName | VARCHAR(100) | Level name (Manager, Director) |
| approverId | INT (FK) | Approver user |
| action | VARCHAR(50) | APPROVED, REJECTED, RETURNED |
| comment | TEXT | Approval comment |
| attachments | JSON | Supporting documents |

---

### `approval_levels`
**Purpose:** Define approval hierarchy levels

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Level ID |
| level | INT (unique) | Level number (1, 2, 3...) |
| levelName | VARCHAR(100) | Display name |
| roleName | VARCHAR(100) | Required role |
| approvalLimit | DECIMAL(15,2) | Max amount for this level |
| isActive | BOOLEAN | Level enabled |

---

### `approver_configurations`
**Purpose:** Configure users as approvers with limits

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Config ID |
| userId | INT (FK) | Approver user |
| level | INT | Approval level |
| approvalLimit | DECIMAL(15,2) | Max approval amount |
| isActive | BOOLEAN | Config active |
| isAvailable | BOOLEAN | Currently available |
| autoAssign | BOOLEAN | Auto-assign enabled |
| priority | INT | Selection priority |
| maxConcurrentTasks | INT | Workload limit |

---

### `approver_selection_logs`
**Purpose:** Audit trail for approver auto-selection

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Log ID |
| taskId | CUID (FK) | Related task |
| level | INT | Approval level |
| selectedApproverId | INT (FK) | Chosen approver |
| requestedApprovers | JSON | All requested |
| availableApprovers | JSON | All available |
| selectionMethod | VARCHAR(50) | Selection algorithm used |
| paymentAmount | DECIMAL(15,2) | Request amount |
| approverWorkload | INT | Current task count |

---

### `messages`
**Purpose:** Task-related messages/comments

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Message ID |
| taskId | CUID (FK) | Related task |
| senderId | INT (FK) | Sender user |
| body | TEXT | Message content |
| type | VARCHAR(50) | TEXT, SYSTEM, APPROVAL |
| attachments | JSON | File attachments |
| meta | JSON | Additional metadata |

---

## 8. Communication & Messaging

### `threads`
**Purpose:** Chat conversation threads (1:1 or group)

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Thread ID |
| title | VARCHAR(200) | Thread name (optional) |
| createdById | INT (FK) | Creator user |
| createdAt | TIMESTAMP | Creation time |

---

### `thread_members`
**Purpose:** Users participating in threads

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Membership ID |
| threadId | CUID (FK) | Reference to threads |
| userId | INT (FK) | Member user |
| role | VARCHAR(50) | admin, member |
| joinedAt | TIMESTAMP | When joined |
| leftAt | TIMESTAMP | When left (if applicable) |
| isActive | BOOLEAN | Currently in thread |

---

### `thread_messages`
**Purpose:** Messages within chat threads

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Message ID |
| threadId | CUID (FK) | Parent thread |
| senderId | INT (FK) | Sender user |
| content | TEXT | Message text |
| type | VARCHAR(50) | text, image, file, system |
| attachments | JSON | File attachments |
| replyToId | CUID (FK) | Reply reference (self-ref) |
| reactions | JSON | Emoji reactions |
| isEdited | BOOLEAN | Message edited |
| isDeleted | BOOLEAN | Soft deleted |
| readBy | JSON | Users who read message |

---

### `call_logs`
**Purpose:** Audio/video call records (Jitsi integration)

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Call ID |
| room_name | VARCHAR(255) | Jitsi room name |
| thread_id | CUID (FK) | Associated thread |
| initiator_id | INT (FK) | Call starter |
| call_type | VARCHAR(20) | audio, video |
| status | VARCHAR(30) | ringing, ongoing, ended |
| started_at | TIMESTAMP | Call start |
| ended_at | TIMESTAMP | Call end |
| duration_seconds | INT | Call length |
| participants | JSON | User IDs in call |
| recording_url | TEXT | Recording link |
| transcript_url | TEXT | Transcription link |
| quality_metrics | JSON | Call quality data |
| consent_recorded | BOOLEAN | Recording consent |

---

## 9. User Profile & HR Data

### `user_profiles`
**Purpose:** Extended user personal information

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Profile ID |
| userId | INT (FK, unique) | Reference to users |
| fullName | VARCHAR(255) | Full legal name |
| employeeCode | VARCHAR(50) | Unique employee ID |
| phone | VARCHAR(20) | Primary phone |
| alternatePhone | VARCHAR(20) | Secondary phone |
| dateOfBirth | DATE | Birth date |
| gender | ENUM | MALE, FEMALE, OTHER |
| bloodGroup | VARCHAR(10) | Blood type |
| profilePicUrl | TEXT | Profile photo |
| fatherName | VARCHAR(255) | Father's name |
| motherName | VARCHAR(255) | Mother's name |
| maritalStatus | ENUM | SINGLE, MARRIED, etc. |

---

### `user_addresses`
**Purpose:** User address records (multiple per user)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Address ID |
| userId | INT (FK) | Reference to users |
| type | ENUM | PERMANENT, HOME, OFFICE, CORRESPONDENCE |
| line1/line2 | VARCHAR(255) | Street address |
| city, state, country | VARCHAR | Location |
| postalCode | VARCHAR(20) | ZIP code |
| isDefault | BOOLEAN | Default address |

---

### `user_kyc`
**Purpose:** KYC (Know Your Customer) verification documents - **Encrypted at Rest**

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | KYC ID |
| userId | INT (FK, unique) | Reference to users |
| panNumber | VARCHAR(20) | **DEPRECATED** - Use pan_encrypted |
| pan_encrypted | BYTEA | AES-256-GCM encrypted PAN |
| pan_iv | BYTEA | Initialization vector |
| pan_last4 | VARCHAR(4) | Last 4 chars for display |
| aadhaarNumber | VARCHAR(20) | **DEPRECATED** - Use aadhaar_encrypted |
| aadhaar_encrypted | BYTEA | AES-256-GCM encrypted Aadhaar |
| aadhaar_iv | BYTEA | Initialization vector |
| aadhaar_last4 | VARCHAR(4) | Last 4 digits for display |
| encryption_version | INT | Encryption algorithm version |
| kycStatus | ENUM | PENDING, VERIFIED, REJECTED |
| panDocumentUrl | TEXT | PAN card scan |
| aadhaarDocumentUrl | TEXT | Aadhaar scan |

---

### `user_bank_accounts`
**Purpose:** User bank account details for salary/payments - **Encrypted at Rest**

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Account ID |
| userId | INT (FK) | Reference to users |
| accountHolderName | VARCHAR(255) | Name on account |
| bankName | VARCHAR(255) | Bank name |
| branchName | VARCHAR(255) | Branch |
| accountNumber | VARCHAR(50) | **DEPRECATED** - Use encrypted field |
| account_number_encrypted | BYTEA | AES-256-GCM encrypted account number |
| account_number_iv | BYTEA | Initialization vector |
| account_number_last4 | VARCHAR(4) | Last 4 digits for display |
| encryption_version | INT | Encryption algorithm version |
| ifscCode | VARCHAR(20) | IFSC code |
| isPrimary | BOOLEAN | Primary account |
| cancelledChequeDocumentUrl | TEXT | Cheque scan |

---

### `user_education`
**Purpose:** Educational qualifications

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Record ID |
| userId | INT (FK) | Reference to users |
| degree | VARCHAR(255) | Degree name |
| institutionName | VARCHAR(255) | School/university |
| yearOfPassing | INT | Graduation year |
| gradeOrPercentage | VARCHAR(50) | Score/grade |

---

### `user_skills`
**Purpose:** User skills and proficiency levels

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Skill ID |
| userId | INT (FK) | Reference to users |
| skillName | VARCHAR(255) | Skill name |
| proficiencyLevel | ENUM | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |

---

### `user_achievements`
**Purpose:** Awards, certifications, accomplishments

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Achievement ID |
| userId | INT (FK) | Reference to users |
| title | VARCHAR(255) | Achievement title |
| description | TEXT | Details |
| achievementDate | DATE | When achieved |

---

### `user_emergency_contacts`
**Purpose:** Emergency contact information

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Contact ID |
| userId | INT (FK) | Reference to users |
| name | VARCHAR(255) | Contact name |
| relationship | VARCHAR(100) | Relationship (Spouse, Parent) |
| phone | VARCHAR(20) | Primary phone |
| alternatePhone | VARCHAR(20) | Backup phone |

---

## 10. System Monitoring & Analytics

### `audit_logs`
**Purpose:** Complete audit trail of user actions

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Log ID |
| user_id | INT (FK) | Acting user |
| action | VARCHAR(50) | Action type (CREATE, UPDATE, DELETE) |
| table_name | VARCHAR(100) | Affected table |
| record_id | INT | Affected record ID |
| old_values | JSON | Before state |
| new_values | JSON | After state |
| ip_address | INET | Client IP |
| user_agent | TEXT | Browser/device |
| session_id | INT (FK) | Session reference |

---

### `recent_activity`
**Purpose:** Quick access to recent user activities

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Activity ID |
| user_id | INT | Acting user |
| username | VARCHAR(255) | User display name |
| action | TEXT | Action description |
| entity | TEXT | Entity type |
| entity_id | TEXT | Entity ID |
| details | JSON | Activity details |

---

### `client_usage_events`
**Purpose:** Track client feature usage for analytics

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Event ID |
| client_id | UUID (FK) | Client reference |
| module_id | INT (FK) | Module used |
| user_id | INT (FK) | Acting user |
| event_type | VARCHAR(50) | view, create, edit, delete |
| meta | JSON | Event metadata |
| occurred_at | TIMESTAMP | Event time |

---

### `client_daily_usage`
**Purpose:** Aggregated daily usage statistics per client/module

| Column | Type | Description |
|--------|------|-------------|
| date | DATE (PK) | Usage date |
| client_id | UUID (PK, FK) | Client reference |
| module_id | INT (PK, FK) | Module reference |
| view_count | INT | Views that day |
| create_count | INT | Creates that day |
| edit_count | INT | Edits that day |
| delete_count | INT | Deletes that day |
| active_users | INT | Unique users |

**Primary Key:** Composite (date, client_id, module_id)

---

### `system_health_config`
**Purpose:** Configuration for system health monitoring

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Config ID |
| thresholds | JSON | Alert thresholds |
| backupLocation | VARCHAR(255) | Backup path |
| refreshInterval | INT | Metrics refresh (ms) |
| metricsRetentionDays | INT | Raw data retention |
| aggregateRetentionDays | INT | Aggregate retention |

---

### `system_metric_samples`
**Purpose:** Real-time system performance samples

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Sample ID |
| latencyMs | INT | API latency |
| errorRatePct | FLOAT | Error rate percentage |
| reqCount | INT | Request count |
| errCount | INT | Error count |
| collected_at | TIMESTAMP | Sample time |

---

### `system_metric_daily`
**Purpose:** Daily aggregated system metrics

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Aggregate ID |
| day | DATE (unique) | Date |
| avgLatencyMs | INT | Average latency |
| avgErrorRatePct | FLOAT | Average error rate |
| reqCount | INT | Total requests |
| errCount | INT | Total errors |

---

### `load_test_reports`
**Purpose:** Performance/load test results

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Report ID |
| source | VARCHAR(100) | Test tool (k6, artillery) |
| p95Ms | INT | 95th percentile latency |
| p99Ms | INT | 99th percentile latency |
| avgMs | INT | Average latency |
| errors | INT | Error count |
| notes | VARCHAR(500) | Test notes |

---

## 11. AI & Assistant Features

### `assistant_memory`
**Purpose:** AI assistant context and user preferences

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Memory ID |
| userId | INT (FK, unique) | Reference to users |
| lastBranchId | INT | Last active branch |
| lastModule | VARCHAR(100) | Last used module |
| preferences | JSON | User preferences |
| lastSummary | TEXT | Conversation summary |
| conversationCount | INT | Total conversations |

---

### `bills`
**Purpose:** Uploaded bills/receipts with OCR processing

| Column | Type | Description |
|--------|------|-------------|
| id | CUID (PK) | Bill ID |
| filePath | VARCHAR(500) | Storage path |
| originalName | VARCHAR(255) | Original filename |
| fileType | VARCHAR(50) | MIME type |
| fileSize | INT | Size in bytes |
| uploadedById | INT (FK) | Uploader user |
| ocrStatus | ENUM | PENDING, PROCESSING, DONE, FAILED |
| ocrText | TEXT | Extracted text |
| parsedJson | JSON | Structured data |
| taskId | CUID (FK) | Linked task |
| taskCreated | BOOLEAN | Task auto-created |
| processingError | TEXT | Error message |
| processingTime | INT | OCR time (ms) |
| confidence | FLOAT | OCR confidence score |

---

## 12. Security & Rate Limiting

### `rate_limit_violations`
**Purpose:** Track API rate limit violations for security

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Violation ID |
| ip_address | VARCHAR(45) | Client IP |
| endpoint | VARCHAR(255) | Targeted endpoint |
| user_agent | TEXT | Browser/client info |
| violation_type | VARCHAR(50) | BURST, SUSTAINED, ABUSE |
| timestamp | TIMESTAMP | Violation time |
| country_code | VARCHAR(2) | IP geolocation |
| user_id | INT | Authenticated user (if any) |
| request_method | VARCHAR(10) | HTTP method |
| response_status | INT | Response code (429) |

---

### `migration_history`
**Purpose:** Track applied database migrations

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Migration ID |
| migration_name | VARCHAR(255) | Migration filename |
| applied_at | TIMESTAMP | When applied |
| applied_by | VARCHAR(100) | DB user |
| backup_file | TEXT | Backup reference |
| checksum | TEXT | File checksum |

---

## 13. Enums Reference

### `OcrStatus`
- `PENDING` - Awaiting processing
- `PROCESSING` - Currently being processed
- `DONE` - Successfully processed
- `FAILED` - Processing failed

### `AddressType`
- `PERMANENT` - Permanent address
- `OFFICE` - Work address
- `HOME` - Current residence
- `CORRESPONDENCE` - Mailing address

### `Gender`
- `MALE`
- `FEMALE`
- `OTHER`
- `PREFER_NOT_TO_SAY`

### `MaritalStatus`
- `SINGLE`
- `MARRIED`
- `DIVORCED`
- `WIDOWED`

### `KYCStatus`
- `PENDING` - Awaiting verification
- `VERIFIED` - Successfully verified
- `REJECTED` - Verification failed

### `ProficiencyLevel`
- `BEGINNER`
- `INTERMEDIATE`
- `ADVANCED`
- `EXPERT`

---

## Summary Statistics

| Category | Table Count |
|----------|-------------|
| Authentication & Users | 3 |
| Multi-Tenant Hierarchy | 3 |
| RBAC | 7 |
| Modules & Permissions | 4 |
| Client Management | 4 |
| Payment & Expense | 5 |
| Task & Approval | 6 |
| Communication | 4 |
| User Profile & HR | 8 |
| Monitoring & Analytics | 7 |
| AI & Assistant | 2 |
| Security | 2 |
| **Total** | **55 tables** |

---

## Entity Relationship Overview

```
Enterprise Admin (1)
    └── Super Admin (N)
            ├── Module Assignments
            └── Clients (N)
                    ├── Branches (N)
                    ├── Users (N)
                    │       ├── User Profile
                    │       ├── Addresses
                    │       ├── Bank Accounts
                    │       ├── Education
                    │       ├── Skills
                    │       └── KYC
                    ├── Payment Requests
                    │       ├── Line Items
                    │       ├── Expenses
                    │       └── Tasks
                    │               ├── Approvals
                    │               ├── Messages
                    │               └── Payment Records
                    └── Usage Events
```

---

*Document generated from Prisma schema analysis*
