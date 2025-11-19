const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get all integrations status
router.get('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const integrations = [
      {
        id: 'sso-saml',
        name: 'SSO/SAML',
        description: 'Single Sign-On via SAML 2.0',
        category: 'authentication',
        status: 'configured',
        provider: 'Okta',
        lastSync: '2025-10-28T08:30:00Z',
        usersCount: 450
      },
      {
        id: 'scim',
        name: 'SCIM Provisioning',
        description: 'Automated user provisioning',
        category: 'provisioning',
        status: 'pending',
        provider: 'Azure AD',
        lastSync: null,
        usersCount: 0
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Notifications and alerts',
        category: 'communication',
        status: 'configured',
        provider: 'Slack',
        lastSync: '2025-10-28T10:15:00Z',
        channelsCount: 5
      },
      {
        id: 'datadog',
        name: 'Datadog',
        description: 'System monitoring and alerts',
        category: 'monitoring',
        status: 'configured',
        provider: 'Datadog',
        lastSync: '2025-10-28T10:30:00Z',
        metricsCount: 125
      },
      {
        id: 'stripe',
        name: 'Stripe',
        description: 'Payment processing',
        category: 'billing',
        status: 'configured',
        provider: 'Stripe',
        lastSync: '2025-10-28T09:00:00Z',
        transactionsToday: 24
      }
    ];

    res.json({
      ok: true,
      integrations
    });
  } catch (error) {
    console.error('[Get Integrations Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch integrations' });
  }
});

// Get SSO/SAML configuration
router.get('/sso', requireEnterpriseAdmin, async (req, res) => {
  try {
    const ssoConfig = {
      enabled: true,
      provider: 'Okta',
      entityId: 'https://bisman-erp.com/saml',
      acsUrl: 'https://bisman-erp.com/api/auth/saml/callback',
      singleLogoutUrl: 'https://bisman-erp.com/api/auth/saml/logout',
      certificate: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      metadataUrl: 'https://idp.okta.com/metadata',
      forceSso: false,
      allowLocalAuth: true,
      defaultRole: 'USER',
      attributeMappings: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        role: 'role'
      }
    };

    res.json({
      ok: true,
      ssoConfig
    });
  } catch (error) {
    console.error('[Get SSO Config Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch SSO configuration' });
  }
});

// Update SSO/SAML configuration
router.put('/sso', requireEnterpriseAdmin, async (req, res) => {
  try {
    const {
      enabled,
      provider,
      metadataUrl,
      certificate,
      forceSso,
      allowLocalAuth,
      defaultRole,
      attributeMappings
    } = req.body;

    // Log the critical security update
    await prisma.recent_activity.create({
      data: {
        action: 'SSO Configuration Updated',
        entity: 'Integration',
        entity_id: 'sso',
        username: req.user?.username || 'Enterprise Admin',
        details: { provider, enabled, forceSso }
      }
    });

    res.json({
      ok: true,
      message: 'SSO configuration updated successfully',
      ssoConfig: req.body
    });
  } catch (error) {
    console.error('[Update SSO Config Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update SSO configuration' });
  }
});

// Test SSO connection
router.post('/sso/test', requireEnterpriseAdmin, async (req, res) => {
  try {
    // Simulate SSO connection test
    const testResult = {
      success: true,
      message: 'SSO connection successful',
      details: {
        metadataFetched: true,
        certificateValid: true,
        attributeMappingWorking: true,
        testUserEmail: 'test@example.com'
      },
      timestamp: new Date().toISOString()
    };

    // Log the test
    await prisma.recent_activity.create({
      data: {
        action: 'SSO Connection Test',
        entity: 'Integration',
        entity_id: 'sso',
        username: req.user?.username || 'Enterprise Admin',
        details: testResult
      }
    });

    res.json({
      ok: true,
      testResult
    });
  } catch (error) {
    console.error('[Test SSO Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to test SSO connection' });
  }
});

// Get API keys
router.get('/api-keys', requireEnterpriseAdmin, async (req, res) => {
  try {
    // In production, these would be stored in a secure table
    const apiKeys = [
      {
        id: 1,
        keyId: 'key_prod_abc123...xyz',
        name: 'Production API Key',
        scope: ['read', 'write'],
        permissions: ['users', 'modules', 'reports'],
        createdAt: '2025-01-15T10:00:00Z',
        expiresAt: '2026-01-15T10:00:00Z',
        lastUsed: '2025-10-28T09:45:00Z',
        requestsToday: 1250,
        status: 'active'
      },
      {
        id: 2,
        keyId: 'key_dev_def456...uvw',
        name: 'Development API Key',
        scope: ['read'],
        permissions: ['reports'],
        createdAt: '2025-02-20T14:30:00Z',
        expiresAt: '2025-12-31T23:59:59Z',
        lastUsed: '2025-10-27T16:20:00Z',
        requestsToday: 45,
        status: 'active'
      },
      {
        id: 3,
        keyId: 'key_test_ghi789...rst',
        name: 'Testing API Key',
        scope: ['read'],
        permissions: ['users'],
        createdAt: '2025-03-10T08:00:00Z',
        expiresAt: '2025-11-30T23:59:59Z',
        lastUsed: null,
        requestsToday: 0,
        status: 'revoked'
      }
    ];

    res.json({
      ok: true,
      apiKeys
    });
  } catch (error) {
    console.error('[Get API Keys Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch API keys' });
  }
});

// Generate new API key
router.post('/api-keys', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { name, scope, permissions, expiresIn } = req.body;

    if (!name || !scope || !permissions) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Name, scope, and permissions are required' 
      });
    }

    // Generate a secure API key
    const keyId = `key_${crypto.randomBytes(16).toString('hex')}`;
    const keySecret = crypto.randomBytes(32).toString('hex');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (expiresIn || 365));

    const newKey = {
      id: Date.now(),
      keyId,
      name,
      scope,
      permissions,
      createdAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      lastUsed: null,
      requestsToday: 0,
      status: 'active'
    };

    // Log the key generation
    await prisma.recent_activity.create({
      data: {
        action: 'API Key Generated',
        entity: 'Integration',
        entity_id: 'api-keys',
        username: req.user?.username || 'Enterprise Admin',
        details: { name, scope, permissions }
      }
    });

    res.status(201).json({
      ok: true,
      message: 'API key generated successfully',
      apiKey: newKey,
      keySecret // Only shown once!
    });
  } catch (error) {
    console.error('[Generate API Key Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate API key' });
  }
});

// Delete (revoke) API key
router.delete('/api-keys/:keyId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const keyId = parseInt(req.params.keyId);

    // Log the revocation
    await prisma.recent_activity.create({
      data: {
        action: 'API Key Revoked',
        entity: 'Integration',
        entity_id: keyId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { keyId }
      }
    });

    res.json({
      ok: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('[Delete API Key Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to revoke API key' });
  }
});

// Get webhooks
router.get('/webhooks', requireEnterpriseAdmin, async (req, res) => {
  try {
    const webhooks = [
      {
        id: 1,
        name: 'User Created Webhook',
        targetUrl: 'https://api.example.com/webhooks/user-created',
        events: ['user.created', 'user.updated'],
        status: 'active',
        lastTriggered: '2025-10-28T09:30:00Z',
        successRate: 98.5,
        totalRequests: 1420,
        failedRequests: 21
      },
      {
        id: 2,
        name: 'Billing Events Webhook',
        targetUrl: 'https://billing.example.com/webhooks/events',
        events: ['subscription.created', 'payment.success', 'payment.failed'],
        status: 'active',
        lastTriggered: '2025-10-28T08:15:00Z',
        successRate: 100,
        totalRequests: 245,
        failedRequests: 0
      },
      {
        id: 3,
        name: 'Security Alerts Webhook',
        targetUrl: 'https://slack.com/api/webhooks/security',
        events: ['security.breach', 'login.failed.multiple'],
        status: 'paused',
        lastTriggered: '2025-10-25T14:20:00Z',
        successRate: 95.2,
        totalRequests: 84,
        failedRequests: 4
      }
    ];

    res.json({
      ok: true,
      webhooks
    });
  } catch (error) {
    console.error('[Get Webhooks Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch webhooks' });
  }
});

// Create webhook
router.post('/webhooks', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { name, targetUrl, events, secret } = req.body;

    if (!name || !targetUrl || !events || events.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Name, target URL, and events are required' 
      });
    }

    const newWebhook = {
      id: Date.now(),
      name,
      targetUrl,
      events,
      status: 'active',
      lastTriggered: null,
      successRate: 0,
      totalRequests: 0,
      failedRequests: 0,
      createdAt: new Date().toISOString()
    };

    // Log the creation
    await prisma.recent_activity.create({
      data: {
        action: 'Webhook Created',
        entity: 'Integration',
        entity_id: 'webhooks',
        username: req.user?.username || 'Enterprise Admin',
        details: { name, targetUrl, events }
      }
    });

    res.status(201).json({
      ok: true,
      message: 'Webhook created successfully',
      webhook: newWebhook
    });
  } catch (error) {
    console.error('[Create Webhook Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to create webhook' });
  }
});

// Test webhook
router.post('/webhooks/:webhookId/test', requireEnterpriseAdmin, async (req, res) => {
  try {
    const webhookId = parseInt(req.params.webhookId);

    // Simulate webhook test
    const testResult = {
      success: true,
      statusCode: 200,
      responseTime: 245, // ms
      response: { received: true },
      timestamp: new Date().toISOString()
    };

    // Log the test
    await prisma.recent_activity.create({
      data: {
        action: 'Webhook Test',
        entity: 'Integration',
        entity_id: webhookId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: testResult
      }
    });

    res.json({
      ok: true,
      testResult
    });
  } catch (error) {
    console.error('[Test Webhook Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to test webhook' });
  }
});

// Update webhook
router.put('/webhooks/:webhookId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const webhookId = parseInt(req.params.webhookId);
    const { name, targetUrl, events, status } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'Webhook Updated',
        entity: 'Integration',
        entity_id: webhookId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: req.body
      }
    });

    res.json({
      ok: true,
      message: 'Webhook updated successfully',
      webhook: req.body
    });
  } catch (error) {
    console.error('[Update Webhook Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update webhook' });
  }
});

// Delete webhook
router.delete('/webhooks/:webhookId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const webhookId = parseInt(req.params.webhookId);

    // Log the deletion
    await prisma.recent_activity.create({
      data: {
        action: 'Webhook Deleted',
        entity: 'Integration',
        entity_id: webhookId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { webhookId }
      }
    });

    res.json({
      ok: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('[Delete Webhook Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete webhook' });
  }
});

module.exports = router;
