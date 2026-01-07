/**
 * Tenant Onboarding Service
 * 
 * Handles the complete tenant provisioning workflow:
 * 1. Validate and create tenant
 * 2. Create Client record with subscription
 * 3. Create default roles (RBAC)
 * 4. Create admin user
 * 5. Initialize usage tracking
 * 6. Send welcome email
 * 7. Enqueue background provisioning jobs
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getPrisma } = require('../../lib/prisma');
const prisma = getPrisma();
let redis = null;
try {
  redis = require('../../lib/redisClient');
} catch {
  console.warn('[Onboarding] Redis not available');
}
// Optional email service - may not be configured in dev
let emailService = null;
try {
  emailService = require('../emailService');
} catch (err) {
  console.warn('[Onboarding] Email service not available:', err.message);
}
const { enqueueJob } = require('../../jobs/jobQueue');

// Trial period in days
const TRIAL_PERIOD_DAYS = 14;

// Idempotency cache TTL (24 hours)
const IDEMPOTENCY_TTL = 24 * 60 * 60;

// Default roles for new tenants (reserved for future RBAC implementation)
// eslint-disable-next-line no-unused-vars
const _DEFAULT_ROLES = [
  {
    name: 'admin',
    display_name: 'Administrator',
    permissions: ['*'], // All permissions
    is_system: true
  },
  {
    name: 'manager',
    display_name: 'Manager',
    permissions: [
      'users:read', 'users:write',
      'inventory:read', 'inventory:write',
      'orders:read', 'orders:write',
      'reports:read'
    ],
    is_system: true
  },
  {
    name: 'staff',
    display_name: 'Staff',
    permissions: [
      'inventory:read',
      'orders:read', 'orders:write'
    ],
    is_system: true
  },
  {
    name: 'viewer',
    display_name: 'Viewer',
    permissions: [
      'inventory:read',
      'orders:read',
      'reports:read'
    ],
    is_system: true
  }
];

// Default tenant settings (reserved for future use)
// eslint-disable-next-line no-unused-vars
const DEFAULT_SETTINGS = {
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  currency: 'INR',
  language: 'en',
  notifications: {
    email: true,
    sms: false,
    push: true
  },
  features: {
    chat: true,
    inventory: true,
    orders: true,
    reports: true,
    billing: false // Enabled after payment
  }
};

/**
 * Check idempotency key and return cached result if exists
 */
async function checkIdempotency(idempotencyKey) {
  if (!idempotencyKey || !redis) return null;

  try {
    const cached = await redis.get(`onboarding:idempotency:${idempotencyKey}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[Onboarding] Redis error checking idempotency:', error.message);
  }
  return null;
}

/**
 * Store idempotency result
 */
async function storeIdempotency(idempotencyKey, result) {
  if (!idempotencyKey || !redis) return;

  try {
    await redis.setex(
      `onboarding:idempotency:${idempotencyKey}`,
      IDEMPOTENCY_TTL,
      JSON.stringify(result)
    );
  } catch (error) {
    console.warn('[Onboarding] Redis error storing idempotency:', error.message);
  }
}

/**
 * Check if email is already registered
 */
async function checkEmailExists(email) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() }
  });
  return !!user;
}

/**
 * Check if company name is already taken
 */
async function checkCompanyExists(companyName) {
  const client = await prisma.client.findFirst({
    where: { 
      name: { equals: companyName, mode: 'insensitive' }
    }
  });
  return !!client;
}

/**
 * Generate a secure temporary password
 */
function generateTemporaryPassword(length = 12) {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

/**
 * Generate tenant slug from company name (reserved for future use)
 */
// eslint-disable-next-line no-unused-vars
function generateTenantSlug(companyName) {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Create a new tenant (Client) with all required resources
 */
async function createTenant(params) {
  const {
    companyName,
    adminEmail,
    adminName,
    adminPassword,
    plan,
    phone,
    timezone,
    industry,
    ipAddress,
    userAgent,
    idempotencyKey
  } = params;

  // Check if email already exists
  const emailExists = await checkEmailExists(adminEmail);
  if (emailExists) {
    const error = new Error('Email already registered');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  // Check if company name already exists
  const companyExists = await checkCompanyExists(companyName);
  if (companyExists) {
    const error = new Error('Company name already taken');
    error.code = 'COMPANY_EXISTS';
    throw error;
  }

  // Generate IDs and credentials
  const clientId = uuidv4();
  const adminUserId = uuidv4();
  // Use provided password or generate temporary one
  const temporaryPassword = adminPassword || generateTemporaryPassword();
  const mustChangePassword = !adminPassword;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // Calculate trial expiration (14 days from now)
  const trialStartDate = new Date();
  const trialEndDate = plan === 'trial'
    ? new Date(Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    : null;

  // Generate unique client code
  const clientCode = `CLI-${Date.now().toString(36).toUpperCase()}`;
  
  // Generate username from email
  const username = adminEmail.toLowerCase().split('@')[0] + '_' + Date.now().toString(36);

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find a default SuperAdmin (required for Client)
    const superAdmin = await tx.superAdmin.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' }
    });
    
    if (!superAdmin) {
      throw new Error('No active SuperAdmin found. Please contact support.');
    }

    // 2. Create Client (this is the "tenant" in this system)
    const client = await tx.client.create({
      data: {
        id: clientId,
        name: companyName,
        client_code: clientCode,
        legal_name: companyName,
        client_type: 'Organization',
        industry: industry || null,
        status: 'Active',
        onboarding_status: 'pending',
        productType: 'BUSINESS_ERP',
        super_admin_id: superAdmin.id,
        subscriptionPlan: plan === 'trial' ? 'trial' : 'free',
        subscriptionStatus: plan === 'trial' ? 'trial' : 'active',
        is_active: true,
        trial_start_date: plan === 'trial' ? trialStartDate : null,
        trial_end_date: trialEndDate,
        timezone: timezone || 'Asia/Kolkata',
        settings: {
          timezone: timezone || 'Asia/Kolkata',
          currency: 'INR',
          dateFormat: 'DD/MM/YYYY',
          locale: 'en-IN',
          industry: industry || null,
          mustChangePassword: mustChangePassword
        },
      },
    });

    // 3. Create admin user in users_enhanced table
    // NOTE: Using direct tx.user.create within transaction context
    // business_level = 1 (default), reports_to = null (top-level admin)
    const adminUser = await tx.user.create({
      data: {
        id: adminUserId,
        username: username,
        email: adminEmail.toLowerCase(),
        password_hash: passwordHash,
        first_name: adminName.split(' ')[0] || adminName,
        last_name: adminName.split(' ').slice(1).join(' ') || '',
        phone: phone || null,
        role: 'ADMIN',
        is_active: true,
        email_verified: false,
        tenant_id: clientId,
        super_admin_id: superAdmin.id,
        product_type: 'BUSINESS_ERP',
        business_level: 1,    // Default L1 for tenant admin
        reports_to: null,      // Top-level admin has no manager
        preferences: {
          mustChangePassword: mustChangePassword,
          theme: 'light',
          notifications: true
        },
        profile_data: {
          companyName: companyName,
          industry: industry || null
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // 4. Subscription will be selected by user on Welcome page after first login
    // No automatic subscription creation here
    console.log(`[Onboarding] Client ${client.id} created - subscription will be selected on Welcome page`);

    // 5. Create audit log entry
    try {
      await tx.auditLog.create({
        data: {
          action: 'CLIENT_CREATED',
          table_name: 'clients',
          new_values: {
            company_name: companyName,
            plan: plan,
            admin_email: adminEmail,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
          created_at: new Date()
        }
      });
    } catch (auditErr) {
      console.warn('[Onboarding] Could not create audit log:', auditErr.message);
    }

    return { client, adminUser };
  });

  // Generate login URL
  const baseUrl = process.env.FRONTEND_URL || 'https://app.bisman.io';
  const loginUrl = `${baseUrl}/auth/login`;

  // Build response - subscription will be selected on Welcome page
  const response = {
    success: true,
    tenantId: clientId,
    clientId: result.client.id,
    adminUserId,
    temporaryPassword: adminPassword ? undefined : temporaryPassword,
    loginUrl,
    trialExpiresAt: trialEndDate?.toISOString() || null,
    needsSubscription: true, // User will select subscription on Welcome page
  };

  // Store idempotency result (without password)
  if (idempotencyKey) {
    const cachedResponse = { ...response };
    delete cachedResponse.temporaryPassword;
    await storeIdempotency(idempotencyKey, cachedResponse);
  }

  // Send welcome email (async, don't block)
  if (!adminPassword) {
    sendWelcomeEmail({
      email: adminEmail,
      name: adminName,
      companyName,
      temporaryPassword,
      loginUrl,
      trialExpiresAt: trialEndDate
    }).catch(err => {
      console.error('[Onboarding] Failed to send welcome email:', err);
    });
  }

  console.log(`[Onboarding] Successfully created client ${clientId} with admin user ${adminUserId}`);

  return response;
}

/**
 * Send welcome email to new tenant admin
 */
async function sendWelcomeEmail(params) {
  const {
    email,
    name,
    companyName,
    temporaryPassword,
    loginUrl,
    trialExpiresAt
  } = params;
  const subject = `Welcome to BISMAN ERP - ${companyName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Welcome to BISMAN ERP!</h1>
      
      <p>Hi ${name},</p>
      
      <p>Your account for <strong>${companyName}</strong> has been created successfully.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Your Login Credentials</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      </div>
      
      <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after your first login.</p>
      
      ${trialExpiresAt ? `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Trial Period:</strong> Your trial expires on ${new Date(trialExpiresAt).toLocaleDateString()}.</p>
        </div>
      ` : ''}
      
      <h3>Getting Started</h3>
      <ol>
        <li>Log in using the credentials above</li>
        <li>Change your password</li>
        <li>Set up your business profile</li>
        <li>Invite your team members</li>
        <li>Start managing your inventory and orders</li>
      </ol>
      
      <p>Need help? Reply to this email or visit our <a href="https://docs.bisman.io">documentation</a>.</p>
      
      <p>Best regards,<br>The BISMAN ERP Team</p>
    </div>
  `;

  const text = `
Welcome to BISMAN ERP!

Hi ${name},

Your account for ${companyName} has been created successfully.

Login Credentials:
- Email: ${email}
- Temporary Password: ${temporaryPassword}
- Login URL: ${loginUrl}

IMPORTANT: Please change your password after your first login.

${trialExpiresAt ? `Trial Period: Your trial expires on ${new Date(trialExpiresAt).toLocaleDateString()}.` : ''}

Getting Started:
1. Log in using the credentials above
2. Change your password
3. Set up your business profile
4. Invite your team members
5. Start managing your inventory and orders

Need help? Reply to this email or visit https://docs.bisman.io

Best regards,
The BISMAN ERP Team
  `;

  try {
    await emailService.send({
      to: email,
      subject,
      html,
      text
    });
    console.log(`[Onboarding] Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`[Onboarding] Failed to send welcome email to ${email}:`, error);
    throw error;
  }
}

/**
 * Enqueue background provisioning jobs
 */
async function enqueueProvisioningJobs(tenantId, params) {
  const { companyName, adminEmail, plan } = params;

  // Job 1: Provision S3 bucket/prefix
  await enqueueJob('provision-storage', {
    tenantId,
    prefix: `tenants/${tenantId}/`
  });

  // Job 2: Create default data (sample inventory, etc.)
  await enqueueJob('seed-tenant-data', {
    tenantId,
    companyName
  });

  // Job 3: Create Stripe customer (if billing enabled)
  if (process.env.STRIPE_SECRET_KEY) {
    await enqueueJob('create-stripe-customer', {
      tenantId,
      email: adminEmail,
      companyName,
      plan
    });
  }

  // Job 4: Send analytics event
  await enqueueJob('track-event', {
    event: 'tenant_created',
    tenantId,
    properties: {
      company_name: companyName,
      plan
    }
  });

  console.log(`[Onboarding] Enqueued provisioning jobs for tenant ${tenantId}`);
}

/**
 * Resend welcome email
 */
async function resendWelcomeEmail(clientId, email) {
  // Find user by tenant_id (which is clientId in this system)
  const user = await prisma.user.findFirst({
    where: {
      tenant_id: clientId,
      email: email.toLowerCase()
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get client info
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Generate new temporary password
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // Update user password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      preferences: {
        ...(user.preferences || {}),
        mustChangePassword: true
      },
      updated_at: new Date()
    }
  });

  const baseUrl = process.env.FRONTEND_URL || 'https://app.bisman.io';
  const loginUrl = `${baseUrl}/auth/login`;

  await sendWelcomeEmail({
    email: user.email,
    name: user.first_name || user.username,
    companyName: client.name,
    temporaryPassword,
    loginUrl,
    trialExpiresAt: client.trial_end_date
  });
}

/**
 * Get provisioning status for a client
 */
async function getProvisioningStatus(clientId) {
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) return null;

  // Find admin user for this client
  const adminUser = await prisma.user.findFirst({
    where: { 
      tenant_id: clientId,
      role: 'ADMIN'
    },
    orderBy: { created_at: 'asc' }
  });

  // Check provisioning status from Redis or DB
  let provisioningStatus = {
    storage: 'complete',
    seedData: 'complete',
    billing: 'complete'
  };

  if (redis) {
    try {
      const status = await redis.hgetall(`client:${clientId}:provisioning`);
      if (status && Object.keys(status).length > 0) {
        provisioningStatus = status;
      }
    } catch (error) {
      console.warn('[Onboarding] Redis error getting provisioning status:', error.message);
    }
  }

  return {
    clientId: client.id,
    companyName: client.name,
    status: client.status,
    plan: client.subscriptionPlan,
    trialExpiresAt: client.trial_end_date,
    createdAt: client.created_at,
    provisioning: provisioningStatus,
    adminUser: adminUser ? {
      id: adminUser.id,
      email: adminUser.email,
      isVerified: adminUser.email_verified
    } : null
  };
}

module.exports = {
  checkIdempotency,
  checkEmailExists,
  checkCompanyExists,
  createTenant,
  sendWelcomeEmail,
  resendWelcomeEmail,
  getProvisioningStatus,
  enqueueProvisioningJobs
};
