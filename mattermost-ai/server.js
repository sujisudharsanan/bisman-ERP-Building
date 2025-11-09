import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🔧 Environment variables
const MATTERMOST_BOT_TOKEN = process.env.MATTERMOST_BOT_TOKEN;
const MATTERMOST_COMMAND_TOKEN = process.env.MATTERMOST_COMMAND_TOKEN;
const MATTERMOST_BASE_URL = process.env.MATTERMOST_BASE_URL || 'https://mattermost-production-84fd.up.railway.app';
const ERP_API_URL = process.env.ERP_API_URL || 'http://localhost:3001';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Internal AI function - uses local Ollama or your ERP's AI endpoint
async function callInternalAI(prompt, context = {}) {
  // Try to call your ERP's AI endpoint first
  try {
    const response = await fetch(`${ERP_API_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        context: context,
        stream: false,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.response || data.message || data.text;
    }
  } catch (error) {
    console.log('ERP AI endpoint not available, trying Ollama...');
  }
  
  // Fallback to local Ollama
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tinyllama:latest",
        prompt: `You are a helpful ERP assistant integrated with Mattermost. You help users with:
- Sales orders and quotations
- Inventory management
- Purchase orders
- Financial reports
- General business operations

User question: ${prompt}

Provide a clear, concise answer focused on ERP and business operations.`,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Internal AI error:', error);
    
    // Simple fallback responses for common questions
    return getSimpleFallbackResponse(prompt);
  }
}

// Simple rule-based fallback for basic questions
function getSimpleFallbackResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
    return "Hello! I'm your ERP assistant. I can help you with sales orders, inventory, purchases, and more. What would you like to know?";
  }
  
  if (lowerPrompt.includes('help')) {
    return "I can assist you with:\n• Sales Orders & Quotations\n• Inventory Management\n• Purchase Orders\n• Financial Reports\n• User Management\n\nJust ask me a specific question!";
  }
  
  if (lowerPrompt.includes('erp')) {
    return "ERP (Enterprise Resource Planning) is integrated business management software that helps organizations manage operations like accounting, procurement, sales, inventory, and HR in one unified system.";
  }
  
  return "I'm your internal ERP chatbot. AI service is currently being configured. For now, try asking about:\n• Sales orders\n• Inventory\n• Purchase orders\n• Reports";
}

// Post message to Mattermost channel
async function postToMattermost(channelId, message) {
  if (!MATTERMOST_BOT_TOKEN) {
    console.error('MATTERMOST_BOT_TOKEN not configured');
    return;
  }
  
  try {
    const response = await fetch(`${MATTERMOST_BASE_URL}/api/v4/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MATTERMOST_BOT_TOKEN}`,
      },
      body: JSON.stringify({ 
        channel_id: channelId, 
        message 
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to post to Mattermost:', response.statusText, error);
    }
  } catch (error) {
    console.error('Error posting to Mattermost:', error);
  }
}

// Slash command endpoint: /ai <question>
app.post("/mattermost/command", async (req, res) => {
  const { token, text, channel_id, user_name } = req.body;
  
  // Verify command token
  if (MATTERMOST_COMMAND_TOKEN && token !== MATTERMOST_COMMAND_TOKEN) {
    return res.status(401).send("Unauthorized");
  }

  // Validate input
  if (!text || text.trim() === '') {
    return res.json({ 
      response_type: "ephemeral", 
      text: "**Usage:** `/ai <your question>`\n\nExample: `/ai What is ERP?`" 
    });
  }

  // Send immediate response
  res.json({ 
    response_type: "ephemeral", 
    text: "🤔 Thinking..." 
  });

  // Process AI request asynchronously
  try {
    const answer = await callInternalAI(text, { user: user_name, channel: channel_id });
    const formattedMessage = `**@${user_name}** asked:\n> ${text}\n\n**🤖 ERP Assistant:**\n${answer}`;
    await postToMattermost(channel_id, formattedMessage);
  } catch (err) {
    console.error('AI command error:', err);
    await postToMattermost(
      channel_id, 
      `⚠️ **Error processing your request**\n${err.message}\n\nPlease check the internal AI service.`
    );
  }
});

// Webhook endpoint for interactive messages
app.post("/mattermost/webhook", async (req, res) => {
  const { text, channel_id, user_name } = req.body;
  
  res.json({ 
    response_type: "in_channel", 
    text: "🤔 Processing your question..." 
  });

  try {
    const answer = await callInternalAI(text);
    await postToMattermost(channel_id, `**🤖 ERP Assistant:**\n${answer}`);
  } catch (err) {
    await postToMattermost(channel_id, `⚠️ Error: ${err.message}`);
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    ok: true,
    timestamp: new Date().toISOString(),
    service: "mattermost-internal-ai",
    mode: "internal",
    config: {
      erp_api: ERP_API_URL,
      ollama_url: OLLAMA_URL,
      mattermost_url: MATTERMOST_BASE_URL,
      bot_token: !!MATTERMOST_BOT_TOKEN,
      command_token: !!MATTERMOST_COMMAND_TOKEN,
    }
  };
  res.json(health);
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    service: "Mattermost Internal AI Connector",
    version: "1.0.0",
    mode: "internal",
    description: "Internal chatbot using ERP AI or Ollama",
    endpoints: {
      command: "POST /mattermost/command",
      webhook: "POST /mattermost/webhook",
      health: "GET /health"
    }
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🤖 Mattermost Internal AI backend running on port ${PORT}`);
  console.log(`📡 Mattermost URL: ${MATTERMOST_BASE_URL}`);
  console.log(`🏢 ERP API URL: ${ERP_API_URL}`);
  console.log(`🦙 Ollama URL: ${OLLAMA_URL}`);
  console.log(`🔑 Bot token configured: ${!!MATTERMOST_BOT_TOKEN}`);
  console.log(`✅ Ready to receive /ai commands using internal AI!`);
});
