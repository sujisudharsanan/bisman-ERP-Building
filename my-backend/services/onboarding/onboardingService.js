/**
 * Tenant Onboarding Service
 * 
 * Handles the complete tenant provisioning workflow:
 * 1. Validate and create tenant
 * 2. Create default roles (RBAC)
 * 3. Create admin user
 * 4. Initialize usage tracking
 * 5. Send welcome email
 * 6. Enqueue background provisioning jobs
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const redis = require('../../lib/redisClient');
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

// Default roles for new tenants
const DEFAULT_ROLES = [
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

// Default tenant settings
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
  const tenant = await prisma.tenant.findFirst({
    where: { 
      name: { equals: companyName, mode: 'insensitive' }
    }
  });
  return !!tenant;
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
 * Generate tenant slug from company name
 */
function generateTenantSlug(companyName) {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Create a new tenant with all required resources
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
  const tenantId = uuidv4();
  const adminUserId = uuidv4();
  // Use provided password or generate temporary one
  const temporaryPassword = adminPassword || generateTemporaryPassword();
  const mustChangePassword = !adminPassword; // Only require change if password was auto-generated
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const tenantSlug = generateTenantSlug(companyName);

  // Calculate trial expiration
  const trialExpiresAt = plan === 'trial'
    ? new Date(Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    : null;

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create tenant
    const tenant = await tx.tenant.create({
      data: {
        id: tenantId,
        name: companyName,
        slug: tenantSlug,
        plan: plan,
        status: 'active',
        trial_expires_at: trialExpiresAt,
        settings: {
          ...DEFAULT_SETTINGS,
          timezone: timezone || 'UTC',
          industry: industry || null
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // 2. Create default roles
    const roles = [];
    for (const roleTemplate of DEFAULT_ROLES) {
      const role = await tx.rbacRole.create({
        data: {
          id: uuidv4(),
          tenant_id: tenantId,
          name: roleTemplate.name,
          display_name: roleTemplate.display_name,
          permissions: roleTemplate.permissions,
          is_system: roleTemplate.is_system,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      roles.push(role);
    }

    // Find admin role ID
    const adminRole = roles.find(r => r.name === 'admin');

    // 3. Create admin user
    const adminUser = await tx.user.create({
      data: {
        id: adminUserId,
        tenant_id: tenantId,
        email: adminEmail.toLowerCase(),
        name: adminName,
        password_hash: passwordHash,
        phone: phone || null,
        role_id: adminRole.id,
        is_active: true,
        is_verified: false,
        must_change_password: mustChangePassword,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // 4. Create tenant_usage starter row
    await tx.tenantUsage.create({
      data: {
        tenant_id: tenantId,
        date: new Date(),
        api_calls: 0,
        storage_bytes: 0,
        active_users: 1
      }
    });

    // 5. Create audit log entry
    await tx.auditLog.create({
      data: {
        id: uuidv4(),
        tenant_id: tenantId,
        user_id: adminUserId,
        action: 'TENANT_CREATED',
        resource_type: 'tenant',
        resource_id: tenantId,
        details: {
          company_name: companyName,
          plan: plan,
          admin_email: adminEmail,
          ip_address: ipAddress,
          user_agent: userAgent
        },
        created_at: new Date()
      }
    });

    return { tenant, adminUser, roles };
  });

  // Generate login URL
  const baseUrl = process.env.FRONTEND_URL || 'https://app.bisman.io';
  const loginUrl = `${baseUrl}/login?tenant=${tenantSlug}`;

  // Build response
  const response = {
    success: true,
    tenantId,
    adminUserId,
    temporaryPassword,
    loginUrl,
    trialExpiresAt: trialExpiresAt?.toISOString() || null
  };

  // Store idempotency result (without password)
  if (idempotencyKey) {
    const cachedResponse = { ...response };
    delete cachedResponse.temporaryPassword;
    await storeIdempotency(idempotencyKey, cachedResponse);
  }

  // 6. Send welcome email (async, don't block)
  sendWelcomeEmail({
    email: adminEmail,
    name: adminName,
    companyName,
    tenantSlug,
    temporaryPassword,
    loginUrl,
    trialExpiresAt
  }).catch(err => {
    console.error('[Onboarding] Failed to send welcome email:', err);
  });

  // 7. Enqueue background provisioning jobs
  enqueueProvisioningJobs(tenantId, {
    companyName,
    adminEmail,
    plan
  }).catch(err => {
    console.error('[Onboarding] Failed to enqueue provisioning jobs:', err);
  });

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
    tenantSlug,
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
async function resendWelcomeEmail(tenantId, email) {
  const user = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      email: email.toLowerCase()
    },
    include: {
      tenant: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new temporary password
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // Update user password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      must_change_password: true,
      updated_at: new Date()
    }
  });

  const baseUrl = process.env.FRONTEND_URL || 'https://app.bisman.io';
  const loginUrl = `${baseUrl}/login?tenant=${user.tenant.slug}`;

  await sendWelcomeEmail({
    email: user.email,
    name: user.name,
    companyName: user.tenant.name,
    tenantSlug: user.tenant.slug,
    temporaryPassword,
    loginUrl,
    trialExpiresAt: user.tenant.trial_expires_at
  });
}

/**
 * Get provisioning status for a tenant
 */
async function getProvisioningStatus(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        take: 1,
        orderBy: { created_at: 'asc' }
      }
    }
  });

  if (!tenant) return null;

  // Check provisioning status from Redis or DB
  let provisioningStatus = {
    storage: 'pending',
    seedData: 'pending',
    billing: 'pending'
  };

  if (redis) {
    try {
      const status = await redis.hgetall(`tenant:${tenantId}:provisioning`);
      if (status && Object.keys(status).length > 0) {
        provisioningStatus = status;
      }
    } catch (error) {
      console.warn('[Onboarding] Redis error getting provisioning status:', error.message);
    }
  }

  return {
    tenantId: tenant.id,
    companyName: tenant.name,
    status: tenant.status,
    plan: tenant.plan,
    trialExpiresAt: tenant.trial_expires_at,
    createdAt: tenant.created_at,
    provisioning: provisioningStatus,
    adminUser: tenant.users[0] ? {
      id: tenant.users[0].id,
      email: tenant.users[0].email,
      isVerified: tenant.users[0].is_verified
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
  getProvisioningStatus
};
