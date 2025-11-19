/**
 * Example Integration & Testing
 * How to use the Intelligent Chat Engine
 */

import { chatService } from '../services/chat/chatService';
import { taskService } from '../services/chat/taskService';
import { intentService } from '../services/chat/intentService';
import { entityService } from '../services/chat/entityService';
import { fuzzyService } from '../services/chat/fuzzyService';

// ===========================================
// EXAMPLE 1: Basic Chat Message
// ===========================================

async function example1_BasicChat() {
  const userId = 1;
  const message = "create a task for tomorrow 5pm to approve bills";
  
  const response = await chatService.handleMessage(userId, message);
  
  console.log('User:', message);
  console.log('Bot:', response.reply);
  console.log('Intent:', response.intent);
  console.log('Confidence:', response.confidence);
  console.log('Entities:', response.entities);
  
  /*
  Output:
  User: create a task for tomorrow 5pm to approve bills
  Bot: ✅ Task created successfully for tomorrow at 17:00!
       📝 "approve bills"
       🆔 Task ID: 123
       ⚡ Priority: MEDIUM
  Intent: create_task
  Confidence: 0.95
  Entities: { date: 2025-11-15T00:00:00.000Z, time: '17:00' }
  */
}

// ===========================================
// EXAMPLE 2: Typo Correction
// ===========================================

async function example2_TypoCorrection() {
  const userId = 1;
  const message = "chek my paymnt status"; // Typos!
  
  const response = await chatService.handleMessage(userId, message);
  
  console.log('User (with typos):', message);
  console.log('Bot understood:', response.reply);
  
  /*
  The system automatically corrects:
  - chek → check
  - paymnt → payment
  */
}

// ===========================================
// EXAMPLE 3: Multiple Entities
// ===========================================

async function example3_ComplexExtraction() {
  const message = "create payment of Rs.50000 to vendor ABC for tomorrow";
  
  const entities = entityService.extractEntities(message);
  
  console.log('Extracted:', {
    amount: entities.amount,        // 50000
    currency: entities.currency,    // INR
    vendor: entities.vendorName,    // ABC
    date: entities.date,            // tomorrow's date
  });
}

// ===========================================
// EXAMPLE 4: Low Confidence Handling
// ===========================================

async function example4_LowConfidence() {
  const userId = 1;
  const message = "show me the thing"; // Vague message
  
  const response = await chatService.handleMessage(userId, message);
  
  console.log('Confidence:', response.confidence);
  console.log('Next Action:', response.nextAction); // ASK_CLARIFICATION
  console.log('Suggestions:', response.suggestions);
  
  /*
  Output:
  I didn't fully understand that. Did you mean:
  1) Show pending tasks
  2) View dashboard
  3) View reports
  Or you can tell me more.
  */
}

// ===========================================
// EXAMPLE 5: Task Management
// ===========================================

async function example5_TaskManagement() {
  const userId = 1;
  
  // Create task
  const task = await taskService.createTask({
    userId,
    description: "Review Q4 financial reports",
    dueDate: new Date('2025-11-20T14:00:00Z'),
    priority: 'high',
    source: 'chat',
  });
  
  console.log('Created Task:', task);
  
  // Get pending tasks
  const pending = await taskService.getPendingTasks(userId);
  console.log('Pending Tasks:', pending);
  
  // Get statistics
  const stats = await taskService.getTaskStats(userId);
  console.log('Stats:', stats);
  
  // Update status
  await taskService.updateTaskStatus(task.id, userId, 'completed');
  console.log('Task marked as completed');
}

// ===========================================
// EXAMPLE 6: Date Parsing
// ===========================================

async function example6_DateParsing() {
  const testDates = [
    "tomorrow",
    "next Monday",
    "in 3 days",
    "next week",
    "December 25, 2025",
    "12/25/2025",
  ];
  
  for (const dateStr of testDates) {
    const message = `create task for ${dateStr}`;
    const entities = entityService.extractEntities(message);
    console.log(`"${dateStr}" →`, entities.date);
  }
}

// ===========================================
// EXAMPLE 7: Intent Testing
// ===========================================

async function example7_IntentTesting() {
  const testMessages = [
    "show my pending tasks",
    "create payment request",
    "check inventory",
    "request leave",
    "view dashboard",
  ];
  
  for (const msg of testMessages) {
    const result = intentService.detectIntent(msg);
    console.log(`"${msg}"`);
    console.log(`  → Intent: ${result.intent}`);
    console.log(`  → Confidence: ${result.confidence}`);
  }
}

// ===========================================
// EXAMPLE 8: Conversation Flow
// ===========================================

async function example8_ConversationFlow() {
  const userId = 1;
  
  // Message 1: Create task
  let response = await chatService.handleMessage(
    userId,
    "create a task to review documents"
  );
  console.log('Bot:', response.reply);
  
  // Message 2: View tasks
  response = await chatService.handleMessage(
    userId,
    "show my tasks"
  );
  console.log('Bot:', response.reply);
  
  // Message 3: Check history
  const history = chatService.getHistory(userId);
  console.log('Conversation History:', history);
}

// ===========================================
// EXAMPLE 9: Entity Extraction Showcase
// ===========================================

async function example9_EntityShowcase() {
  const testCases = [
    {
      text: "pay Rs.10000 to vendor XYZ",
      expected: { amount: 10000, currency: 'INR', vendor: 'XYZ' }
    },
    {
      text: "schedule meeting for tomorrow 2pm",
      expected: { date: 'tomorrow', time: '14:00' }
    },
    {
      text: "vehicle MH12AB1234 fuel expense",
      expected: { vehicleId: 'MH12AB1234' }
    },
    {
      text: "urgent task for next Monday",
      expected: { priority: 'urgent', date: 'next Monday' }
    },
    {
      text: "invoice PR-123 payment",
      expected: { invoiceId: 'PR-123' }
    },
  ];
  
  for (const testCase of testCases) {
    const entities = entityService.extractEntities(testCase.text);
    console.log('\nText:', testCase.text);
    console.log('Extracted:', entities);
    console.log('Expected:', testCase.expected);
  }
}

// ===========================================
// EXAMPLE 10: Express Route Integration
// ===========================================

/*
// In your main app.ts or server.ts:

import express from 'express';
import chatRoutes from './routes/chatRoutes';
import { taskService } from './services/chat/taskService';

const app = express();

app.use(express.json());
app.use('/api/chat', chatRoutes);

// Initialize database table
await taskService.ensureTableExists();

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Chat API available at /api/chat');
});
*/

// ===========================================
// EXAMPLE 11: Frontend Integration
// ===========================================

/*
// React Component Example:

import React, { useState } from 'react';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: input }]);
    
    // Call API
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ message: input }),
    });
    
    const data = await response.json();
    
    // Add bot response
    setMessages(prev => [...prev, { 
      type: 'bot', 
      text: data.data.reply,
      confidence: data.data.confidence,
      intent: data.data.intent,
    }]);
    
    setInput('');
  };
  
  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <input 
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
*/

// ===========================================
// EXAMPLE 12: Custom Intent Handler
// ===========================================

/*
// To add a custom intent:

// 1. Add to intentService.ts patterns array:
{
  intent: 'check_fuel_price',
  patterns: [/\b(check|get|show)\s+(fuel|petrol|diesel)\s+(price|rate|cost)\b/i],
  keywords: ['fuel', 'price', 'check'],
  weight: 1.0,
}

// 2. Add handler in chatService.ts:
case 'check_fuel_price':
  return this.handleCheckFuelPrice(entities);

// 3. Implement handler:
private handleCheckFuelPrice(entities: EntityExtractionResult): ChatResponse {
  return {
    reply: '⛽ Current fuel prices:\nPetrol: ₹110/L\nDiesel: ₹98/L',
    intent: 'check_fuel_price',
    confidence: 1.0,
    entities,
    nextAction: 'EXECUTE',
  };
}
*/

// ===========================================
// EXAMPLE 13: Batch Testing
// ===========================================

async function example13_BatchTesting() {
  const testMessages = [
    "create task tomorrow",
    "show pending tasks",
    "chek atendance",  // With typos
    "payment Rs.5000",
    "next Monday 3pm meeting",
    "urgent task",
    "show reports",
  ];
  
  console.log('=== BATCH TESTING ===\n');
  
  for (const msg of testMessages) {
    const response = await chatService.handleMessage(1, msg);
    console.log(`Input: "${msg}"`);
    console.log(`Intent: ${response.intent} (${(response.confidence * 100).toFixed(0)}%)`);
    console.log(`Action: ${response.nextAction}`);
    console.log('---');
  }
}

// ===========================================
// EXAMPLE 14: Error Handling
// ===========================================

async function example14_ErrorHandling() {
  try {
    // Invalid user ID
    await chatService.handleMessage(null as any, "test");
  } catch (error) {
    console.log('Caught error:', error.message);
  }
  
  try {
    // Empty message
    await chatService.handleMessage(1, "");
  } catch (error) {
    console.log('Caught error:', error.message);
  }
  
  // Unknown intent - graceful fallback
  const response = await chatService.handleMessage(1, "xyz abc qwerty");
  console.log('Unknown intent response:', response.reply);
  console.log('Provides suggestions:', response.suggestions);
}

// ===========================================
// RUN EXAMPLES
// ===========================================

async function runAllExamples() {
  console.log('=== INTELLIGENT CHAT ENGINE EXAMPLES ===\n');
  
  // await example1_BasicChat();
  // await example2_TypoCorrection();
  // await example3_ComplexExtraction();
  // await example4_LowConfidence();
  // await example5_TaskManagement();
  // await example6_DateParsing();
  // await example7_IntentTesting();
  // await example8_ConversationFlow();
  // await example9_EntityShowcase();
  // await example13_BatchTesting();
  // await example14_ErrorHandling();
}

// Uncomment to run:
// runAllExamples();

export {
  example1_BasicChat,
  example2_TypoCorrection,
  example3_ComplexExtraction,
  example4_LowConfidence,
  example5_TaskManagement,
  example6_DateParsing,
  example7_IntentTesting,
  example8_ConversationFlow,
  example9_EntityShowcase,
  example13_BatchTesting,
  example14_ErrorHandling,
};
