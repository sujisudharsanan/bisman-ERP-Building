/**
 * Onboarding Background Jobs
 * 
 * These jobs handle async provisioning after tenant creation:
 * - Storage provisioning (S3/local)
 * - Seed data creation
 * - Stripe customer creation
 * - Analytics tracking
 */

const { registerHandler } = require('./jobQueue');
const prisma = require('../lib/prisma');
const redis = require('../lib/redisClient');

// S3 client (optional)
let s3Client = null;
try {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  if (process.env.AWS_ACCESS_KEY_ID) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
} catch (e) {
  console.log('[Jobs] AWS SDK not available, S3 provisioning disabled');
}

// Stripe client (optional)
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch (e) {
  console.log('[Jobs] Stripe SDK not available, billing disabled');
}

/**
 * Update provisioning status in Redis
 */
async function updateProvisioningStatus(tenantId, key, status) {
  if (redis) {
    try {
      await redis.hset(`tenant:${tenantId}:provisioning`, key, status);
    } catch (error) {
      console.warn('[Jobs] Failed to update provisioning status:', error.message);
    }
  }
}

/**
 * Job: Provision storage (S3 prefix or local directory)
 */
registerHandler('provision-storage', async (payload) => {
  const { tenantId, prefix } = payload;
  
  console.log(`[Jobs] Provisioning storage for tenant ${tenantId}`);

  await updateProvisioningStatus(tenantId, 'storage', 'processing');

  try {
    if (s3Client && process.env.S3_BUCKET) {
      // Create S3 prefix marker
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `${prefix}.keep`,
        Body: '',
        ContentType: 'text/plain'
      }));
      
      console.log(`[Jobs] Created S3 prefix: ${prefix}`);
    } else {
      // Create local directory
      const fs = require('fs').promises;
      const path = require('path');
      const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
      await fs.mkdir(uploadDir, { recursive: true });
      
      console.log(`[Jobs] Created local directory: ${uploadDir}`);
    }

    await updateProvisioningStatus(tenantId, 'storage', 'completed');
    
  } catch (error) {
    await updateProvisioningStatus(tenantId, 'storage', 'failed');
    throw error;
  }
});

/**
 * Job: Seed tenant with initial data
 */
registerHandler('seed-tenant-data', async (payload) => {
  const { tenantId, companyName } = payload;
  
  console.log(`[Jobs] Seeding data for tenant ${tenantId}`);

  await updateProvisioningStatus(tenantId, 'seedData', 'processing');

  try {
    // Create sample categories
    const categories = [
      { name: 'Electronics', description: 'Electronic items and gadgets' },
      { name: 'Furniture', description: 'Office and home furniture' },
      { name: 'Stationery', description: 'Office supplies and stationery' },
      { name: 'Raw Materials', description: 'Manufacturing raw materials' }
    ];

    for (const cat of categories) {
      await prisma.category.create({
        data: {
          tenant_id: tenantId,
          name: cat.name,
          description: cat.description,
          is_active: true,
          created_at: new Date()
        }
      }).catch(() => {
        // Ignore if category model doesn't exist
      });
    }

    // Create sample warehouse/location
    await prisma.warehouse.create({
      data: {
        tenant_id: tenantId,
        name: 'Main Warehouse',
        code: 'WH-001',
        address: 'Main Office',
        is_active: true,
        created_at: new Date()
      }
    }).catch(() => {
      // Ignore if warehouse model doesn't exist
    });

    // Create sample units of measure
    const units = [
      { name: 'Piece', abbreviation: 'pcs' },
      { name: 'Kilogram', abbreviation: 'kg' },
      { name: 'Liter', abbreviation: 'L' },
      { name: 'Box', abbreviation: 'box' }
    ];

    for (const unit of units) {
      await prisma.unitOfMeasure.create({
        data: {
          tenant_id: tenantId,
          name: unit.name,
          abbreviation: unit.abbreviation,
          created_at: new Date()
        }
      }).catch(() => {
        // Ignore if model doesn't exist
      });
    }

    await updateProvisioningStatus(tenantId, 'seedData', 'completed');
    console.log(`[Jobs] Seeded data for tenant ${tenantId}`);
    
  } catch (error) {
    await updateProvisioningStatus(tenantId, 'seedData', 'failed');
    throw error;
  }
});

/**
 * Job: Create Stripe customer
 */
registerHandler('create-stripe-customer', async (payload) => {
  const { tenantId, email, companyName, plan } = payload;
  
  if (!stripe) {
    console.log(`[Jobs] Stripe not configured, skipping customer creation`);
    await updateProvisioningStatus(tenantId, 'billing', 'skipped');
    return;
  }

  console.log(`[Jobs] Creating Stripe customer for tenant ${tenantId}`);

  await updateProvisioningStatus(tenantId, 'billing', 'processing');

  try {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      name: companyName,
      metadata: {
        tenant_id: tenantId,
        plan: plan
      }
    });

    // Store Stripe customer ID
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripe_customer_id: customer.id,
        updated_at: new Date()
      }
    });

    // If trial plan, create trial subscription
    if (plan === 'trial' && process.env.STRIPE_TRIAL_PRICE_ID) {
      await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.STRIPE_TRIAL_PRICE_ID }],
        trial_period_days: 14
      });
      console.log(`[Jobs] Created trial subscription for tenant ${tenantId}`);
    }

    await updateProvisioningStatus(tenantId, 'billing', 'completed');
    console.log(`[Jobs] Created Stripe customer ${customer.id} for tenant ${tenantId}`);
    
  } catch (error) {
    await updateProvisioningStatus(tenantId, 'billing', 'failed');
    throw error;
  }
});

/**
 * Job: Track analytics event
 */
registerHandler('track-event', async (payload) => {
  const { event, tenantId, properties } = payload;
  
  console.log(`[Jobs] Tracking event: ${event}`, { tenantId, ...properties });

  // Send to analytics service (Segment, Mixpanel, etc.)
  if (process.env.SEGMENT_WRITE_KEY) {
    try {
      const Analytics = require('analytics-node');
      const analytics = new Analytics(process.env.SEGMENT_WRITE_KEY);
      
      analytics.track({
        userId: tenantId,
        event: event,
        properties: {
          tenant_id: tenantId,
          ...properties
        }
      });
      
      console.log(`[Jobs] Sent ${event} to Segment`);
    } catch (error) {
      console.warn('[Jobs] Failed to send analytics:', error.message);
    }
  }

  // Log to database audit trail
  try {
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        action: event.toUpperCase().replace(/-/g, '_'),
        resource_type: 'system',
        resource_id: tenantId,
        details: properties,
        created_at: new Date()
      }
    });
  } catch (error) {
    // Non-critical, just log
    console.warn('[Jobs] Failed to log analytics event:', error.message);
  }
});

/**
 * Job: Send trial expiration reminder
 */
registerHandler('trial-expiration-reminder', async (payload) => {
  const { tenantId, daysRemaining } = payload;
  
  console.log(`[Jobs] Sending trial reminder to tenant ${tenantId} (${daysRemaining} days left)`);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: { role: { name: 'admin' } },
        take: 1
      }
    }
  });

  if (!tenant || !tenant.users[0]) {
    console.warn(`[Jobs] Tenant or admin not found: ${tenantId}`);
    return;
  }

  const admin = tenant.users[0];
  const emailService = require('../services/email/emailService');

  await emailService.send({
    to: admin.email,
    subject: `Your BISMAN ERP trial expires in ${daysRemaining} days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Your trial is ending soon!</h1>
        <p>Hi ${admin.name},</p>
        <p>Your free trial for <strong>${tenant.name}</strong> will expire in <strong>${daysRemaining} days</strong>.</p>
        <p>Upgrade now to keep access to all features:</p>
        <a href="${process.env.FRONTEND_URL}/billing" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Upgrade Now
        </a>
        <p style="margin-top: 20px; color: #666;">
          Questions? Reply to this email or contact support@bisman.io
        </p>
      </div>
    `
  });

  console.log(`[Jobs] Sent trial reminder to ${admin.email}`);
});

console.log('[Jobs] Onboarding job handlers registered');

module.exports = {};
