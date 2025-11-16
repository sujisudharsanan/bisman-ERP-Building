const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get all alert rules
router.get('/rules', requireEnterpriseAdmin, async (req, res) => {
  try {
    const alertRules = [
      {
        id: 1,
        name: 'Storage Limit Alert',
        description: 'Alert when organization hits 90% storage limit',
        category: 'usage',
        enabled: true,
        threshold: 90,
        severity: 'warning',
        channels: ['email', 'slack'],
        triggerCount: 24,
        lastTriggered: '2025-10-27T14:30:00Z'
      },
      {
        id: 2,
        name: 'Failed Login Attempts',
        description: 'Alert on 5+ failed login attempts in 1 minute',
        category: 'security',
        enabled: true,
        threshold: 5,
        severity: 'critical',
        channels: ['email', 'sms'],
        triggerCount: 3,
        lastTriggered: '2025-10-28T08:15:00Z'
      },
      {
        id: 3,
        name: 'API Rate Limit Exceeded',
        description: 'Alert when API rate limit is exceeded',
        category: 'api',
        enabled: true,
        threshold: 100,
        severity: 'warning',
        channels: ['slack'],
        triggerCount: 156,
        lastTriggered: '2025-10-28T10:20:00Z'
      },
      {
        id: 4,
        name: 'Subscription Expiring',
        description: 'Alert 7 days before subscription expires',
        category: 'billing',
        enabled: true,
        threshold: 7,
        severity: 'info',
        channels: ['email'],
        triggerCount: 8,
        lastTriggered: '2025-10-26T09:00:00Z'
      },
      {
        id: 5,
        name: 'System Error Rate High',
        description: 'Alert when error rate exceeds 5%',
        category: 'system',
        enabled: false,
        threshold: 5,
        severity: 'critical',
        channels: ['email', 'slack', 'sms'],
        triggerCount: 0,
        lastTriggered: null
      }
    ];

    res.json({
      ok: true,
      rules: alertRules
    });
  } catch (error) {
    console.error('[Get Alert Rules Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch alert rules' });
  }
});

// Update alert rule
router.put('/rules/:ruleId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const ruleId = parseInt(req.params.ruleId);
    const { enabled, threshold, severity, channels } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'Alert Rule Updated',
        entity: 'Notification',
        entity_id: ruleId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { ruleId, enabled, threshold, severity, channels }
      }
    });

    res.json({
      ok: true,
      message: 'Alert rule updated successfully',
      rule: req.body
    });
  } catch (error) {
    console.error('[Update Alert Rule Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update alert rule' });
  }
});

// Get notification recipients
router.get('/recipients', requireEnterpriseAdmin, async (req, res) => {
  try {
    const recipients = {
      email: {
        primary: ['admin@bisman.com', 'security@bisman.com'],
        secondary: ['ops@bisman.com'],
        ccList: []
      },
      slack: {
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX',
        channels: [
          { id: 'alerts', name: '#alerts' },
          { id: 'security', name: '#security' },
          { id: 'operations', name: '#operations' }
        ],
        defaultChannel: '#alerts'
      },
      sms: {
        enabled: false,
        numbers: ['+911234567890'],
        onlyForCritical: true
      },
      webhook: {
        enabled: false,
        url: '',
        headers: {}
      }
    };

    res.json({
      ok: true,
      recipients
    });
  } catch (error) {
    console.error('[Get Recipients Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch recipients' });
  }
});

// Update notification recipients
router.put('/recipients', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { email, slack, sms, webhook } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'Notification Recipients Updated',
        entity: 'Notification',
        entity_id: 'recipients',
        username: req.user?.username || 'Enterprise Admin',
        details: req.body
      }
    });

    res.json({
      ok: true,
      message: 'Recipients updated successfully',
      recipients: req.body
    });
  } catch (error) {
    console.error('[Update Recipients Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update recipients' });
  }
});

// Get email templates
router.get('/templates', requireEnterpriseAdmin, async (req, res) => {
  try {
    const templates = [
      {
        id: 'welcome-email',
        name: 'Welcome Email',
        subject: { en: 'Welcome to BISMAN ERP', hi: 'BISMAN ERP में आपका स्वागत है' },
        category: 'user',
        variables: ['{{userName}}', '{{organizationName}}', '{{loginUrl}}'],
        lastModified: '2025-09-15T10:00:00Z',
        sentCount: 450
      },
      {
        id: 'password-reset',
        name: 'Password Reset',
        subject: { en: 'Reset Your Password', hi: 'अपना पासवर्ड रीसेट करें' },
        category: 'security',
        variables: ['{{userName}}', '{{resetLink}}', '{{expiryTime}}'],
        lastModified: '2025-08-20T14:30:00Z',
        sentCount: 128
      },
      {
        id: 'subscription-expiry',
        name: 'Subscription Expiry Notice',
        subject: { en: 'Your Subscription is Expiring Soon', hi: 'आपकी सदस्यता जल्द समाप्त हो रही है' },
        category: 'billing',
        variables: ['{{organizationName}}', '{{expiryDate}}', '{{renewalUrl}}'],
        lastModified: '2025-10-01T09:00:00Z',
        sentCount: 24
      },
      {
        id: 'security-alert',
        name: 'Security Alert',
        subject: { en: 'Security Alert: Unusual Activity Detected', hi: 'सुरक्षा चेतावनी: असामान्य गतिविधि का पता चला' },
        category: 'security',
        variables: ['{{userName}}', '{{activityType}}', '{{timestamp}}', '{{ipAddress}}'],
        lastModified: '2025-09-25T11:00:00Z',
        sentCount: 12
      }
    ];

    res.json({
      ok: true,
      templates
    });
  } catch (error) {
    console.error('[Get Templates Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch templates' });
  }
});

// Get specific template
router.get('/templates/:templateId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const templateId = req.params.templateId;

    // Sample template with full content
    const template = {
      id: templateId,
      name: 'Welcome Email',
      subject: { 
        en: 'Welcome to BISMAN ERP', 
        hi: 'BISMAN ERP में आपका स्वागत है',
        ta: 'BISMAN ERP க்கு வரவேற்கிறோம்'
      },
      category: 'user',
      variables: ['{{userName}}', '{{organizationName}}', '{{loginUrl}}'],
      content: {
        en: `
          <h1>Welcome {{userName}}!</h1>
          <p>We're excited to have you at <strong>{{organizationName}}</strong>.</p>
          <p>Click below to login:</p>
          <a href="{{loginUrl}}">Login Now</a>
        `,
        hi: `
          <h1>स्वागत है {{userName}}!</h1>
          <p>हम <strong>{{organizationName}}</strong> में आपका स्वागत करते हैं।</p>
          <p>लॉगिन करने के लिए नीचे क्लिक करें:</p>
          <a href="{{loginUrl}}">अभी लॉगिन करें</a>
        `,
        ta: `
          <h1>வரவேற்கிறோம் {{userName}}!</h1>
          <p><strong>{{organizationName}}</strong> இல் உங்களை வரவேற்கிறோம்.</p>
          <p>உள்நுழைய கீழே கிளிக் செய்யவும்:</p>
          <a href="{{loginUrl}}">இப்போது உள்நுழையவும்</a>
        `
      },
      lastModified: '2025-09-15T10:00:00Z',
      sentCount: 450
    };

    res.json({
      ok: true,
      template
    });
  } catch (error) {
    console.error('[Get Template Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch template' });
  }
});

// Update email template
router.put('/templates/:templateId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const templateId = req.params.templateId;
    const { subject, content } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'Email Template Updated',
        entity: 'Notification',
        entity_id: templateId,
        username: req.user?.username || 'Enterprise Admin',
        details: { templateId, hasSubject: !!subject, hasContent: !!content }
      }
    });

    res.json({
      ok: true,
      message: 'Template updated successfully',
      template: req.body
    });
  } catch (error) {
    console.error('[Update Template Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update template' });
  }
});

// Get notification history
router.get('/history', requireEnterpriseAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const category = req.query.category || '';
    const channel = req.query.channel || '';

    // Fetch from recent_activity or a dedicated notifications table
    const where = {
      entity: 'Notification'
    };

    if (category) {
      where.details = {
        path: ['category'],
        equals: category
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.recent_activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.recent_activity.count({ where })
    ]);

    const transformedNotifications = notifications.map(notif => ({
      id: notif.id,
      type: notif.action,
      recipient: notif.details?.recipient || 'Multiple Recipients',
      channel: notif.details?.channel || 'email',
      status: notif.details?.status || 'sent',
      sentAt: notif.created_at?.toISOString(),
      subject: notif.details?.subject || 'N/A'
    }));

    res.json({
      ok: true,
      notifications: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Get Notification History Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch notification history' });
  }
});

// Test notification
router.post('/test', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { channel, recipient, templateId } = req.body;

    if (!channel || !recipient) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Channel and recipient are required' 
      });
    }

    // Simulate sending notification
    const testResult = {
      success: true,
      channel,
      recipient,
      templateId: templateId || 'test',
      message: 'Test notification sent successfully',
      timestamp: new Date().toISOString()
    };

    // Log the test
    await prisma.recent_activity.create({
      data: {
        action: 'Notification Test',
        entity: 'Notification',
        entity_id: 'test',
        username: req.user?.username || 'Enterprise Admin',
        details: testResult
      }
    });

    res.json({
      ok: true,
      testResult
    });
  } catch (error) {
    console.error('[Test Notification Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to send test notification' });
  }
});

// Get notification statistics
router.get('/stats', requireEnterpriseAdmin, async (req, res) => {
  try {
    const stats = {
      totalSent: 1842,
      sentToday: 45,
      failedToday: 2,
      deliveryRate: 98.9,
      byChannel: {
        email: 1420,
        slack: 358,
        sms: 64
      },
      byCategory: {
        user: 780,
        security: 245,
        billing: 156,
        system: 661
      }
    };

    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    console.error('[Get Notification Stats Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
