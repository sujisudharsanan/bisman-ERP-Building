#!/usr/bin/env node

/**
 * Chat Engine Test Script
 * Run this to test the intelligent chat engine without a frontend
 */

const readline = require('readline');

// Simple mock for testing without full backend
class MockChatTester {
  constructor() {
    this.conversationHistory = [];
  }

  async processMessage(message) {
    console.log('\n🤖 Processing:', message);
    
    // Simulate intent detection
    const intent = this.detectIntent(message.toLowerCase());
    const entities = this.extractEntities(message);
    
    let response;
    
    if (intent.name === 'create_task') {
      response = this.handleCreateTask(entities, message);
    } else if (intent.name === 'show_pending_tasks') {
      response = this.handleShowTasks();
    } else if (intent.name === 'create_payment_request') {
      response = this.handlePaymentRequest(entities);
    } else if (intent.name === 'check_inventory') {
      response = this.handleInventory(entities);
    } else {
      response = this.handleUnknown();
    }
    
    this.conversationHistory.push({ message, response, intent: intent.name });
    
    return response;
  }

  detectIntent(text) {
    if (/\b(create|add|new|make)\s+(task|todo|reminder)\b/.test(text)) {
      return { name: 'create_task', confidence: 0.95 };
    }
    if (/\b(show|list|view|get)\s+(pending|tasks?)\b/.test(text)) {
      return { name: 'show_pending_tasks', confidence: 0.92 };
    }
    if (/\b(create|make)\s+(payment|pay)\b/.test(text)) {
      return { name: 'create_payment_request', confidence: 0.90 };
    }
    if (/\b(check|view)\s+(inventory|stock)\b/.test(text)) {
      return { name: 'check_inventory', confidence: 0.88 };
    }
    return { name: 'unknown', confidence: 0.3 };
  }

  extractEntities(text) {
    const entities = {};
    
    // Extract date
    if (/\btomorrow\b/.test(text)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      entities.date = tomorrow.toISOString().split('T')[0];
      entities.dateText = 'tomorrow';
    } else if (/\btoday\b/.test(text)) {
      entities.date = new Date().toISOString().split('T')[0];
      entities.dateText = 'today';
    } else if (/\bnext\s+monday\b/i.test(text)) {
      entities.dateText = 'next Monday';
    }
    
    // Extract time
    const timeMatch = text.match(/\b(\d{1,2})\s*(pm|am)\b/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (timeMatch[2].toLowerCase() === 'pm' && hour < 12) hour += 12;
      entities.time = `${hour}:00`;
    }
    
    // Extract amount
    const amountMatch = text.match(/Rs\.?\s*(\d+)|₹\s*(\d+)|(\d+)\s*rupees/i);
    if (amountMatch) {
      entities.amount = parseInt(amountMatch[1] || amountMatch[2] || amountMatch[3]);
    }
    
    // Extract priority
    if (/\burgent\b/i.test(text)) {
      entities.priority = 'urgent';
    } else if (/\bhigh\b/i.test(text)) {
      entities.priority = 'high';
    }
    
    return entities;
  }

  handleCreateTask(entities, originalMessage) {
    const description = this.extractTaskDescription(originalMessage);
    const dateStr = entities.dateText || entities.date || 'unspecified date';
    const timeStr = entities.time ? ` at ${entities.time}` : '';
    const priority = entities.priority || 'medium';
    
    return {
      reply: `✅ Task created successfully${dateStr !== 'unspecified date' ? ` for ${dateStr}${timeStr}` : ''}!\n\n📝 "${description}"\n🆔 Task ID: ${Math.floor(Math.random() * 1000)}\n⚡ Priority: ${priority.toUpperCase()}`,
      intent: 'create_task',
      confidence: 0.95,
      entities,
    };
  }

  handleShowTasks() {
    return {
      reply: `📋 Your Pending Tasks (3 total):

1. 🔴 Approve budget - Due: today
2. 🟡 Review reports - Due: tomorrow
3. 🟢 Team meeting - Due: in 3 days

⚠️ 1 task(s) overdue
📅 1 task(s) due today`,
      intent: 'show_pending_tasks',
      confidence: 0.92,
      entities: {},
    };
  }

  handlePaymentRequest(entities) {
    const amount = entities.amount ? `₹${entities.amount.toLocaleString()}` : 'unspecified';
    
    return {
      reply: `💰 Creating payment request:

💵 Amount: ${amount}
👤 Vendor: ABC Corp
📄 Invoice: new

✅ Payment request will be submitted for approval.`,
      intent: 'create_payment_request',
      confidence: 0.90,
      entities,
    };
  }

  handleInventory(entities) {
    return {
      reply: `📦 Checking inventory...

ℹ️ This will open the inventory dashboard with current stock levels.`,
      intent: 'check_inventory',
      confidence: 0.88,
      entities,
    };
  }

  handleUnknown() {
    return {
      reply: `I'm not sure I understand. Here are some things I can help with:

📋 Task Management: "create a task", "show my tasks"
💰 Payments: "create payment request"
📦 Inventory: "check inventory"

What would you like to do?`,
      intent: 'unknown',
      confidence: 0.3,
      entities: {},
    };
  }

  extractTaskDescription(text) {
    return text
      .replace(/^(create|add|make)\s+(a\s+)?(task|todo|reminder)\s+(to|for|about)\s+/i, '')
      .replace(/\s+(tomorrow|today|next\s+\w+)\s*/gi, '')
      .replace(/\s+\d{1,2}\s*(pm|am)\s*/gi, '')
      .trim();
  }
}

// Main interactive CLI
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🤖 INTELLIGENT CHAT ENGINE - TEST INTERFACE 🤖       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('Welcome! This is a test interface for the chat engine.');
  console.log('Type your messages and see how the AI responds.\n');
  console.log('📝 Try these examples:');
  console.log('  - "create a task for tomorrow 5pm to approve bills"');
  console.log('  - "show my pending tasks"');
  console.log('  - "create payment request for Rs.50000"');
  console.log('  - "check inventory"\n');
  console.log('Type "exit" to quit, "history" to see conversation.\n');
  console.log('─────────────────────────────────────────────────────────────\n');

  const tester = new MockChatTester();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '💬 You: '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input.toLowerCase() === 'exit') {
      console.log('\n👋 Goodbye! Thanks for testing the chat engine.\n');
      process.exit(0);
    }
    
    if (input.toLowerCase() === 'history') {
      console.log('\n📜 Conversation History:');
      tester.conversationHistory.forEach((item, i) => {
        console.log(`\n[${i + 1}] User: ${item.message}`);
        console.log(`    Intent: ${item.intent}`);
        console.log(`    Bot: ${item.response.reply.split('\n')[0]}...`);
      });
      console.log('');
      rl.prompt();
      return;
    }
    
    if (!input) {
      rl.prompt();
      return;
    }
    
    try {
      const response = await tester.processMessage(input);
      
      console.log(`\n🤖 Bot: ${response.reply}`);
      console.log(`\n📊 Intent: ${response.intent} (${(response.confidence * 100).toFixed(0)}% confidence)`);
      
      if (Object.keys(response.entities).length > 0) {
        console.log(`📋 Entities:`, response.entities);
      }
      
      console.log('');
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.log('');
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!\n');
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MockChatTester };
