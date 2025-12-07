/**
 * Chat Module Main Router
 * Combines all chat-related routes
 */

const express = require('express');
const router = express.Router();

// Health check for chat module (MUST be first - no auth required)
router.get('/health', (req, res) => {
  res.json({
    module: 'chat',
    status: 'ok',
    features: {
      ai: true,
      threads: true,
      calls: true,
      realtime: true,
      database: true,
      preprocessor: true
    },
    timestamp: new Date().toISOString()
  });
});

// Import route modules
const aiRoutes = require('./ai');
const messagesRoutes = require('./messages');
const threadMessagesRoutes = require('./thread-messages');
const callsRoutes = require('./calls');
const assistantRoutes = require('./assistant');
const workflowsRoutes = require('./workflows');
const preprocessorRoutes = require('./preprocessor');

// Import training management routes (Advanced Training System)
let trainingRoutes;
try {
  trainingRoutes = require('../../../routes/chat/training');
} catch (e) {
  console.warn('[Chat Module] Training routes not loaded:', e.message);
}

// Mount authenticated routes
router.use('/ai', aiRoutes);        // /api/chat/ai/*
router.use('/', aiRoutes);          // /api/chat/message (AI assistant) - mount at root since ai.js has /message route
router.use('/assistant', assistantRoutes); // /api/chat/assistant/* (NEW intelligent assistant)
router.use('/workflows', workflowsRoutes); // /api/chat/workflows/* (Dynamic UI navigation help)
router.use('/', preprocessorRoutes); // /api/chat/preprocess/*, /api/chat/dictionary/* (Spellcheck & preprocessing)
router.use('/threads', messagesRoutes); // /api/chat/threads/* (legacy)
router.use('/', threadMessagesRoutes); // /api/chat/threads/:id/messages, /api/chat/messages/* (new DB-backed)
router.use('/calls', callsRoutes);  // /api/chat/calls/*

// Mount training management routes (Advanced Training System)
if (trainingRoutes) {
  router.use('/training', trainingRoutes); // /api/chat/training/*
  console.log('✅ Chat Training routes loaded at /api/chat/training');
}

module.exports = router;
