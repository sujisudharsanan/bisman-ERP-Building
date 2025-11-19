/**
 * Spark AI Bot Logic
 * Extracted from CleanChatInterface for reuse in new chat UI
 */

interface UserData {
  summary: {
    pendingApprovals: number;
    inProcessTasks: number;
    completedRecently: number;
    totalPaymentRequests: number;
  };
  pendingTasks: Array<{
    id: string;
    type: string;
    title: string;
    amount: number;
    currency: string;
    clientName: string;
    createdAt: string;
    currentLevel: number;
    status: string;
  }>;
  recentPayments: Array<{
    id: string;
    requestId: string;
    clientName: string;
    totalAmount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    priority: string;
  }>;
}

export function getSparkAIResponse(userMessage: string, userData: UserData | null): string {
  const msg = userMessage.toLowerCase().trim();
  
  // ===================
  // ERP DATA QUERIES
  // ===================
  
  // PENDING TASKS / APPROVALS
  if (msg.includes('pending') || msg.includes('approval')) {
    if (!userData) {
      return "Loading your data... Please try again in a moment! ⏳";
    }
    
    const pendingCount = userData.summary.pendingApprovals;
    
    if (pendingCount === 0) {
      return "✅ **Great news!** You have no pending approvals right now!\n\nYou're all caught up! 🎉";
    }
    
    const tasksList = userData.pendingTasks.slice(0, 3).map((task, idx) => 
      `${idx + 1}. **${task.clientName}** - ${task.currency} ${task.amount.toLocaleString()}\n   Level ${task.currentLevel} | ${task.status}`
    ).join('\n\n');
    
    return `📋 **You have ${pendingCount} pending approval${pendingCount > 1 ? 's' : ''}:**\n\n${tasksList}${pendingCount > 3 ? `\n\n...and ${pendingCount - 3} more` : ''}\n\nNeed details? Just ask!`;
  }
  
  // PAYMENT REQUESTS
  if (msg.includes('payment') && !msg.includes('can you do')) {
    if (!userData) {
      return "Loading your data... Please try again in a moment! ⏳";
    }
    
    const paymentCount = userData.recentPayments.length;
    
    if (paymentCount === 0) {
      return "💰 You have no recent payment requests.\n\nWant to create one? Go to Payment Requests in the sidebar!";
    }
    
    const paymentsList = userData.recentPayments.slice(0, 3).map((pr, idx) => 
      `${idx + 1}. **${pr.requestId}** - ${pr.clientName}\n   ${pr.currency} ${pr.totalAmount.toLocaleString()} | ${pr.status}`
    ).join('\n\n');
    
    return `💰 **Recent Payment Requests:**\n\n${paymentsList}${paymentCount > 3 ? `\n\n...and ${paymentCount - 3} more` : ''}`;
  }
  
  // NOTIFICATIONS
  if (msg.includes('notification') || msg.includes('alert')) {
    if (!userData) {
      return "Loading your data... Please try again in a moment! ⏳";
    }
    
    const notifCount = userData.notifications.length;
    
    if (notifCount === 0) {
      return "🔔 **No new notifications!**\n\nYou're all up to date! ✅";
    }
    
    const notifList = userData.notifications.slice(0, 3).map((notif, idx) => 
      `${idx + 1}. ${notif.priority === 'high' ? '🔴' : notif.priority === 'medium' ? '🟡' : '🟢'} ${notif.message}`
    ).join('\n\n');
    
    return `🔔 **Recent Notifications:**\n\n${notifList}${notifCount > 3 ? `\n\n...and ${notifCount - 3} more` : ''}`;
  }
  
  // DASHBOARD / SUMMARY
  if (msg.includes('dashboard') || msg.includes('summary') || msg.includes('overview') || (msg.includes('show') && msg.includes('status'))) {
    if (!userData) {
      return "Loading your data... Please try again in a moment! ⏳";
    }
    
    return `📊 **Your Dashboard Summary:**\n\n` +
      `✅ Pending Approvals: **${userData.summary.pendingApprovals}**\n` +
      `⚙️ In-Process Tasks: **${userData.summary.inProcessTasks}**\n` +
      `✔️ Completed Recently: **${userData.summary.completedRecently}**\n` +
      `💰 Payment Requests: **${userData.summary.totalPaymentRequests}**\n\n` +
      `Want details? Ask "show pending tasks" or "show payment requests"!`;
  }
  
  // ===================
  // GENERAL CONVERSATIONS
  // ===================
  
  // Greetings
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg === 'hii' || msg === 'hlo') {
    const greetings = [
      `Hello! 👋 I'm Spark Assistant. ${userData ? `You have ${userData.summary.pendingApprovals} pending task${userData.summary.pendingApprovals !== 1 ? 's' : ''}.` : ''} How can I help?`,
      `Hi there! 😊 ${userData && userData.summary.pendingApprovals > 0 ? '🔔 You have pending approvals!' : 'All clear!'} What can I do for you?`,
      "Hey! 🌟 I'm here to help. What do you need?",
      "Hello! ✨ Ready to assist you. How may I help?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // How are you
  if (msg.includes('how are you') || msg.includes('how r u') || msg.includes('whats up') || msg.includes("what's up")) {
    return "I'm doing great! 😊 Thanks for asking! I'm here and ready to help you with anything you need. How about you?";
  }
  
  // Good responses
  if (msg.includes('good') || msg.includes('great') || msg.includes('awesome') || msg.includes('nice') || msg.includes('cool')) {
    return "That's wonderful to hear! 🎉 Is there anything I can help you with today?";
  }
  
  // Not good responses
  if (msg.includes('not good') || msg.includes('bad') || msg.includes('sad') || msg.includes('problem')) {
    return "I'm sorry to hear that! 😔 I'm here to help. How can I assist you today?";
  }
  
  // Help requests
  if (msg.includes('help') || msg.includes('assist') || msg.includes('support')) {
    return "I can help you with:\n\n📊 Check pending tasks\n💰 View payment requests\n🔔 See notifications\n📈 Dashboard summary\n💬 General questions\n\nJust ask me anything!";
  }
  
  // Who are you
  if (msg.includes('who are you') || msg.includes('what are you') || msg.includes('your name')) {
    return "I'm Spark Assistant! ⚡ Your friendly AI helper for the BISMAN ERP system. I'm here 24/7 to assist you! 🤖";
  }
  
  // What can you do
  if (msg.includes('what can you do') || msg.includes('your features') || msg.includes('capabilities')) {
    return "I can:\n\n✨ Show your pending tasks\n💰 Display payment requests\n🔔 List notifications\n📊 Provide dashboard summary\n💬 Answer questions\n🤝 Have friendly conversations\n\nJust ask me anything!";
  }
  
  // Thank you
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('thx')) {
    const thanks = [
      "You're welcome! 😊 Happy to help!",
      "No problem at all! 🌟 Anytime!",
      "Glad I could help! ✨",
      "You're very welcome! 😊 Feel free to ask anytime!"
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }
  
  // Goodbye
  if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('gtg')) {
    const goodbyes = [
      "Goodbye! Have a great day! 👋",
      "See you later! Take care! 🌟",
      "Bye! Feel free to come back anytime! 😊",
      "Catch you later! Have an amazing day! ✨"
    ];
    return goodbyes[Math.floor(Math.random() * goodbyes.length)];
  }
  
  // Yes responses
  if (msg === 'yes' || msg === 'yeah' || msg === 'yep' || msg === 'sure' || msg === 'ok' || msg === 'okay') {
    return "Great! 😊 How can I help you? Feel free to ask me anything!";
  }
  
  // No responses
  if (msg === 'no' || msg === 'nope' || msg === 'nah') {
    return "No worries! 👍 Let me know if you need anything else!";
  }
  
  // Time questions
  if (msg.includes('time') || msg.includes('what time')) {
    const now = new Date();
    return `The current time is ${now.toLocaleTimeString()}. 🕐 Is there anything else I can help you with?`;
  }
  
  // Date questions
  if (msg.includes('date') || msg.includes('what day') || msg.includes('today')) {
    const now = new Date();
    return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. 📅 How can I help you today?`;
  }
  
  // Love/like responses
  if (msg.includes('love you') || msg.includes('like you')) {
    return "Aww, that's sweet! 💙 I'm here to help you anytime! 🤗";
  }
  
  // Jokes
  if (msg.includes('joke') || msg.includes('funny')) {
    const jokes = [
      "Why did the ERP system go to therapy? It had too many issues to resolve! 😄",
      "What's an AI's favorite snack? Computer chips! 🍟😊",
      "Why don't programmers like nature? It has too many bugs! 🐛😂",
      "How do you comfort a JavaScript bug? You console it! 😄"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  // Weather
  if (msg.includes('weather')) {
    return "I can't check the weather right now, but I hope it's nice where you are! 🌤️ Is there anything else I can help with?";
  }
  
  // Bot questions
  if (msg.includes('are you real') || msg.includes('are you human')) {
    return "I'm an AI assistant! 🤖 Not human, but I'm here to help you just as much! Think of me as your digital helper! ✨";
  }
  
  // Compliments
  if (msg.includes('smart') || msg.includes('intelligent') || msg.includes('helpful')) {
    return "Thank you so much! 🌟 That means a lot! I always try my best to help! 😊";
  }
  
  // Default response with suggestions
  return "I'm Spark Assistant! 🤖 I'm here to help!\n\nTry asking:\n• Show pending tasks\n• Show dashboard\n• Show payment requests\n• Tell me a joke\n• What time is it?\n\nHow can I assist you?";
}

// Load user ERP data
export async function loadUserERPData(): Promise<UserData | null> {
  try {
    const response = await fetch('/api/chat-bot/user-data');
    if (response.ok) {
      const data = await response.json();
      return data.data;
    } else if (response.status === 401) {
      // Not authenticated yet; treat as no data without logging an error
      return null;
    }
  } catch (error) {
    console.error('[SparkAI] Failed to load user data:', error);
  }
  return null;
}
