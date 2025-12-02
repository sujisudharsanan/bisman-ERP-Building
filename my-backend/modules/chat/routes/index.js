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
      database: true
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

// Mount authenticated routes
router.use('/ai', aiRoutes);        // /api/chat/ai/*
router.use('/', aiRoutes);          // /api/chat/message (AI assistant) - mount at root since ai.js has /message route
router.use('/assistant', assistantRoutes); // /api/chat/assistant/* (NEW intelligent assistant)
router.use('/workflows', workflowsRoutes); // /api/chat/workflows/* (Dynamic UI navigation help)
router.use('/threads', messagesRoutes); // /api/chat/threads/* (legacy)
router.use('/', threadMessagesRoutes); // /api/chat/threads/:id/messages, /api/chat/messages/* (new DB-backed)
router.use('/calls', callsRoutes);  // /api/chat/calls/*

module.exports = router;
