/**
 * Humanization Service
 * Makes chatbot responses feel natural, empathetic, and human-like
 * 
 * Principles:
 * - Consistent persona (Mira - friendly operations assistant)
 * - Concise but empathetic responses
 * - Varied phrasing to avoid robotic feel
 * - Natural language with contractions
 * - Graceful limit handling
 * - One clear follow-up at a time
 * - Personalized with user name/role
 * - Tone aligned with context
 */

const persona = {
  name: 'Mira',
  role: 'Operations Assistant',
  tone: process.env.BOT_TONE || 'friendly', // 'friendly' | 'professional' | 'casual'
  signoffs: {
    friendly: ['Cheers', 'Thanks', 'Got it', 'Cool', 'Perfect'],
    professional: ['Thank you', 'Understood', 'Noted', 'Acknowledged'],
    casual: ['Awesome', 'Nice', 'Sweet', 'Great', 'Done']
  }
};

/**
 * Pick random item from array
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Humanize text with contractions and natural language
 */
function humanizeText(text) {
  return text
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bcannot\b/gi, "can't")
    .replace(/\bcan not\b/gi, "can't")
    .replace(/\bwill not\b/gi, "won't")
    .replace(/\bi am\b/gi, "I'm")
    .replace(/\bi will\b/gi, "I'll")
    .replace(/\bi have\b/gi, "I've")
    .replace(/\byou are\b/gi, "you're")
    .replace(/\byou will\b/gi, "you'll")
    .replace(/\bthat is\b/gi, "that's")
    .replace(/\bwhat is\b/gi, "what's")
    .replace(/\bplease let me know\b/gi, "let me know")
    .replace(/\bit is\b/gi, "it's")
    .trim();
}

/**
 * Add tiny human touches (starters, sign-offs)
 */
function addTinyHumanTouch(text, tone = 'friendly') {
  const starters = {
    friendly: ['Sure —', 'Alright,', 'Got it.', 'Okay —', 'Cool,', 'Right,'],
    professional: ['Certainly —', 'Understood.', 'I see.', 'Very well —'],
    casual: ['Yep —', 'Sure thing,', 'No prob —', 'Gotcha,', 'Okay cool,']
  };

  const currentTone = tone || persona.tone;
  
  // Sometimes prefix with a short starter (40% chance)
  if (Math.random() < 0.4) {
    text = `${pick(starters[currentTone] || starters.friendly)} ${text}`;
  }
  
  // Sometimes append a soft sign-off (35% chance)
  if (Math.random() < 0.35) {
    const signoff = pick(persona.signoffs[currentTone] || persona.signoffs.friendly);
    text = `${text} ${signoff}.`;
  }
  
  return text;
}

/**
 * Template bank with multiple variations
 */
const templates = {
  // GREETINGS
  greeting: [
    (name) => `Hey ${name}! How can I help today?`,
    (name) => `Hi ${name}! What can I do for you right now?`,
    (name) => `Hello ${name}! Ready when you are.`,
    (name) => `Hi there ${name}! What do you need?`,
    (name) => `Hey! Good to see you ${name}. How can I assist?`
  ],

  greeting_no_name: [
    () => `Hey! How can I help today?`,
    () => `Hi! What can I do for you?`,
    () => `Hello! Ready when you are.`,
    () => `Hi there! What do you need?`
  ],

  // TASK CREATION
  create_task: [
    (e) => `I created the task: "${e.description}". It's due ${e.dueDate || 'soon'}. Anything else?`,
    (e) => `Task saved: "${e.description}". Due date is set to ${e.dueDate || 'the date you mentioned'}.`,
    (e) => `Done — I added "${e.description}" to your tasks for ${e.dueDate || 'later'}.`,
    (e) => `Created the task "${e.description}". I set it for ${e.dueDate || 'when you mentioned'}. Need anything else?`
  ],

  // SHOW TASKS
  show_pending_tasks: [
    (e) => `You have ${e.count || 0} pending tasks. Want me to show details for the top ones?`,
    (e) => `Looks like ${e.count || 'a few'} tasks are waiting. Shall I list them now?`,
    (e) => `I found ${e.count || 'some'} pending tasks. Would you like to see them?`,
    (e) => `${e.count || 'A few'} tasks need attention. Want the full list?`
  ],

  show_tasks_empty: [
    () => `You're all caught up! No pending tasks right now.`,
    () => `Great news — your task list is clear!`,
    () => `Nothing pending. You're free to take a break!`,
    () => `All done! No tasks waiting for you.`
  ],

  // PAYMENT REQUESTS
  create_payment_request: [
    (e) => `I can create that payment request for ₹${e.amount}. Which vendor should I assign it to?`,
    (e) => `Okay — a payment of ₹${e.amount} for ${e.vendor || 'the vendor'}. Would you like to attach supporting docs?`,
    (e) => `Setting up payment of ₹${e.amount}. Need the vendor name or ID.`,
    (e) => `Payment request for ₹${e.amount} — got it. Which vendor is this for?`
  ],

  // INVENTORY CHECK
  check_inventory: [
    (e) => `Checking inventory status now. Which hub or product do you want to see?`,
    (e) => `I can pull inventory details. Do you want all hubs or a specific location?`,
    (e) => `Inventory check — no problem. Filter by hub or show everything?`,
    (e) => `Looking at stock levels. Need details for a specific hub or product?`
  ],

  // LEAVE REQUEST
  request_leave: [
    (e) => `I'll help with your leave request. When do you need time off?`,
    (e) => `Sure — setting up a leave request. What dates are you thinking?`,
    (e) => `Leave request coming up. Which dates should I mark?`,
    (e) => `No problem. When do you need leave? I'll get it started.`
  ],

  // DASHBOARD
  view_dashboard: [
    () => `Pulling up your dashboard now. One sec...`,
    () => `I'll show you the dashboard. Just a moment.`,
    () => `Loading your overview. Almost there.`,
    () => `Dashboard coming right up!`
  ],

  // UNKNOWN INTENT
  unknown: [
    () => `I didn't quite catch that. Could you rephrase or pick one: create task / check payments / show tasks?`,
    () => `Sorry — I couldn't understand. Do you want to create a task, check inventory, or view payments?`,
    () => `I'm not sure what you mean. Try: "show my tasks" or "create a reminder" or "check stock".`,
    () => `Hmm, I missed that. Want to create a task, request leave, or check something?`
  ],

  // FALLBACK
  fallback: [
    () => `Hmm, I can't do that right now. Want me to create a ticket for the team?`,
    () => `I don't have enough info to help. Would you like me to escalate this to support?`,
    () => `I can't complete that step yet. Should I file a ticket?`,
    () => `Sorry, that's outside my current abilities. Want me to get help from the team?`
  ],

  // PERMISSION DENIED
  permission_denied: [
    (e) => `I can't show ${e.feature} — looks like you don't have permission. Would you like me to request access?`,
    (e) => `Sorry, you don't have access to ${e.feature}. Want me to contact your manager about it?`,
    (e) => `I don't have permission to do that for you. Should I request it from the admin?`,
    (e) => `${e.feature} requires ${e.requiredRole || 'higher'} access. Want me to help you get it?`
  ],

  // ERRORS
  error: [
    () => `Oops, something went wrong on my end. Can you try again?`,
    () => `I hit a small snag. Mind repeating that?`,
    () => `Sorry, I ran into an issue. Let's give it another shot.`,
    () => `Something didn't work right. Could you try once more?`
  ],

  // CLARIFICATIONS
  clarify_date: [
    () => `When should I set the due date?`,
    () => `Which date did you have in mind?`,
    () => `What's the target date for this?`,
    () => `When do you need this done by?`
  ],

  clarify_vendor: [
    () => `Please confirm the vendor name or vendor ID.`,
    () => `Which vendor is this for?`,
    () => `I need the vendor name or ID.`,
    () => `Can you specify the vendor?`
  ],

  clarify_hub: [
    () => `Which hub should I apply this to?`,
    () => `Do you want this for a specific hub or all hubs?`,
    () => `Filter by hub or show all?`,
    () => `Which location — all hubs or one specific?`
  ],

  clarify_assignee: [
    () => `Who should be assigned to this task?`,
    () => `Which team member should handle this?`,
    () => `Who's responsible for this one?`,
    () => `Assign it to anyone in particular?`
  ],

  // CONFIRMATIONS
  confirmation: [
    () => `Done — I created it. Anything else?`,
    () => `All set. I sent the request.`,
    () => `Saved. I'll remind you later.`,
    () => `Complete. Need anything else?`,
    () => `Finished. What's next?`
  ],

  // SOFT TRANSITIONS
  soft_transition: [
    () => `Also, if you want, I can…`,
    () => `By the way — would you like me to…`,
    () => `Quick tip: you can say 'show my tasks' to see them.`,
    () => `FYI — I can also help with…`,
    () => `Just so you know, I can…`
  ]
};

/**
 * Clarification questions by intent
 */
const clarifiers = {
  create_task: [
    'When should I set the due date?',
    'Who should be assigned to this task?',
    'What priority level — high, medium, or low?'
  ],
  create_payment_request: [
    'Please confirm the vendor name or vendor ID.',
    'Do you want to attach an invoice or supporting document?',
    'Which hub should this payment be charged to?'
  ],
  show_pending_tasks: [
    'Do you want tasks for today or this week?',
    'Filter by hub or show all?',
    'Only high priority or all tasks?'
  ],
  check_inventory: [
    'Which hub do you want to check?',
    'Looking for a specific product?',
    'Show all items or just low stock?'
  ],
  request_leave: [
    'What type of leave — sick, vacation, or personal?',
    'How many days do you need?',
    'Starting when?'
  ]
};

/**
 * Format a human-like reply
 */
function formatHumanReply(params) {
  const {
    userName,
    userRole,
    intent,
    confidence,
    entities = {},
    baseText,
    taskCount = 0
  } = params;

  // Determine next action based on confidence
  const nextAction = confidence >= 0.85 ? 'EXECUTE'
                   : confidence >= 0.6 ? 'ASK_CLARIFICATION'
                   : 'FALLBACK';

  // Select base reply from templates
  let reply;
  
  if (baseText) {
    reply = baseText;
  } else if (intent === 'greeting') {
    reply = userName 
      ? pick(templates.greeting)(userName)
      : pick(templates.greeting_no_name)();
  } else if (intent === 'show_tasks' && taskCount === 0) {
    reply = pick(templates.show_tasks_empty)();
  } else if (templates[intent]) {
    reply = pick(templates[intent])({ ...entities, count: taskCount });
  } else if (nextAction === 'FALLBACK') {
    reply = pick(templates.fallback)();
  } else {
    reply = pick(templates.unknown)();
  }

  // Add clarification question if needed
  if (nextAction === 'ASK_CLARIFICATION' && !baseText) {
    const clarificationQuestions = clarifiers[intent];
    if (clarificationQuestions) {
      const question = pick(clarificationQuestions);
      reply = `${reply} ${question}`;
    } else {
      reply = `${reply} Can you provide a bit more detail?`;
    }
  }

  // Personalize with user name (50% chance to avoid overuse)
  if (userName && Math.random() < 0.5 && !reply.includes(userName)) {
    // Add name at the beginning
    reply = `${userName}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`;
  }

  // Humanize text (add contractions)
  reply = humanizeText(reply);

  // Add tiny human touches (starters, sign-offs)
  reply = addTinyHumanTouch(reply, persona.tone);

  return {
    reply,
    intent,
    confidence,
    entities,
    nextAction,
    persona: {
      name: persona.name,
      role: persona.role
    }
  };
}

/**
 * Handle permission denied gracefully
 */
function formatPermissionDenied(userName, feature, requiredRole, userRole) {
  const templates = [
    `I can't show ${feature} — looks like you need ${requiredRole} access. Want me to request it for you?`,
    `Sorry, ${feature} requires ${requiredRole} permissions. Should I contact your manager about access?`,
    `You don't have access to ${feature} yet. Would you like me to help you get ${requiredRole} permissions?`,
    `I'd love to help with ${feature}, but that needs ${requiredRole} access. Want me to file a request?`
  ];

  let reply = pick(templates);

  // Personalize
  if (userName && Math.random() < 0.6) {
    reply = `${userName}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`;
  }

  reply = humanizeText(reply);
  reply = addTinyHumanTouch(reply, persona.tone);

  return reply;
}

/**
 * Handle errors gracefully
 */
function formatError(userName, errorContext) {
  const templates = [
    `Oops, I hit a small snag. Can you try that again?`,
    `Something didn't work right on my end. Mind repeating that?`,
    `I ran into an issue. Let's give it another shot?`,
    `Sorry, something went wrong. Could you try once more?`
  ];

  let reply = pick(templates);

  if (userName && Math.random() < 0.4) {
    reply = `${userName}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`;
  }

  reply = humanizeText(reply);
  
  return reply;
}

/**
 * Format task list in a human-friendly way
 */
function formatTaskList(tasks, userName) {
  if (!tasks || tasks.length === 0) {
    return pick(templates.show_tasks_empty)();
  }

  const intros = [
    `Here's what you have pending:`,
    `You've got ${tasks.length} tasks:`,
    `Your task list:`,
    `Here are your ${tasks.length} pending items:`
  ];

  let reply = pick(intros) + '\n\n';

  tasks.forEach((task, index) => {
    const priority = task.priority === 'high' || task.priority === 'urgent' ? '🔥' : 
                    task.priority === 'medium' ? '⭐' : '🌱';
    const dueText = task.due_date 
      ? new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'No deadline';
    
    reply += `${index + 1}. ${priority} ${task.title}\n   Due: ${dueText} • #${task.id}\n\n`;
  });

  const closings = [
    `Want me to do anything with these?`,
    `Need help with any of them?`,
    `Should I mark any as complete?`,
    `Anything you'd like to update?`
  ];

  reply += pick(closings);

  return humanizeText(reply);
}

/**
 * Session memory for multi-turn conversations
 */
class SessionMemory {
  constructor() {
    this.sessions = new Map();
    this.MAX_TURNS = 2; // Remember last 2 turns
  }

  store(userId, data) {
    const session = this.sessions.get(userId) || { turns: [] };
    
    session.turns.push({
      intent: data.intent,
      entities: data.entities,
      timestamp: new Date()
    });

    // Keep only last MAX_TURNS
    if (session.turns.length > this.MAX_TURNS) {
      session.turns.shift();
    }

    this.sessions.set(userId, session);
  }

  get(userId) {
    return this.sessions.get(userId) || { turns: [] };
  }

  getPendingEntities(userId) {
    const session = this.get(userId);
    if (session.turns.length > 0) {
      return session.turns[session.turns.length - 1].entities || {};
    }
    return {};
  }

  getLastIntent(userId) {
    const session = this.get(userId);
    if (session.turns.length > 0) {
      return session.turns[session.turns.length - 1].intent;
    }
    return null;
  }

  clear(userId) {
    this.sessions.delete(userId);
  }
}

const sessionMemory = new SessionMemory();

module.exports = {
  formatHumanReply,
  formatPermissionDenied,
  formatError,
  formatTaskList,
  sessionMemory,
  persona,
  humanizeText,
  pick
};
