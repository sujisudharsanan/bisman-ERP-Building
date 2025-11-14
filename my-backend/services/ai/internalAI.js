/**
 * Internal Offline AI Engine
 * Uses NLP libraries (natural + compromise) for intelligent chat
 * No external APIs, completely internal and free
 */

const natural = require('natural');
const nlp = require('compromise');

class InternalAI {
  constructor() {
    // Initialize tokenizer and classifier
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    this.tfidf = new natural.TfIdf();
    
    // Train the classifier with intent examples
    this.trainClassifier();
    
    // Intent patterns
    this.intentPatterns = this.buildIntentPatterns();
    
    console.log('[InternalAI] Initialized - Ready for offline processing');
  }

  /**
   * Train the classifier with example phrases
   */
  trainClassifier() {
    // Greetings
    this.classifier.addDocument('hello', 'greeting');
    this.classifier.addDocument('hi', 'greeting');
    this.classifier.addDocument('hey', 'greeting');
    this.classifier.addDocument('good morning', 'greeting');
    this.classifier.addDocument('good afternoon', 'greeting');
    
    // Task creation
    this.classifier.addDocument('create task', 'create_task');
    this.classifier.addDocument('add task', 'create_task');
    this.classifier.addDocument('new task', 'create_task');
    this.classifier.addDocument('make task', 'create_task');
    this.classifier.addDocument('create a task for', 'create_task');
    
    // Show tasks
    this.classifier.addDocument('show tasks', 'show_tasks');
    this.classifier.addDocument('list tasks', 'show_tasks');
    this.classifier.addDocument('my tasks', 'show_tasks');
    this.classifier.addDocument('pending tasks', 'show_tasks');
    this.classifier.addDocument('what are my tasks', 'show_tasks');
    
    // Help
    this.classifier.addDocument('help', 'help');
    this.classifier.addDocument('what can you do', 'help');
    this.classifier.addDocument('commands', 'help');
    this.classifier.addDocument('how to use', 'help');
    
    // Status
    this.classifier.addDocument('status', 'status');
    this.classifier.addDocument('how are you', 'status');
    this.classifier.addDocument('are you working', 'status');
    
    this.classifier.train();
    console.log('[InternalAI] Classifier trained with', this.classifier.docs.length, 'examples');
  }

  /**
   * Build regex patterns for intent detection
   */
  buildIntentPatterns() {
    return {
      create_task: [
        /create\s+(a\s+)?task/i,
        /add\s+(a\s+)?task/i,
        /new\s+task/i,
        /make\s+(a\s+)?task/i,
      ],
      show_tasks: [
        /show\s+(my\s+)?tasks?/i,
        /list\s+(my\s+)?tasks?/i,
        /(what\s+are\s+)?my\s+tasks?/i,
        /pending\s+tasks?/i,
      ],
      help: [
        /help/i,
        /what\s+can\s+you\s+do/i,
        /commands?/i,
        /how\s+to/i,
      ],
      greeting: [
        /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
      ],
    };
  }

  /**
   * Detect intent from user message
   */
  detectIntent(message) {
    if (!message || typeof message !== 'string') {
      return { intent: 'unknown', confidence: 0 };
    }

    const normalized = message.toLowerCase().trim();
    
    // Try pattern matching first (more accurate)
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          return { intent, confidence: 0.95, method: 'pattern' };
        }
      }
    }

    // Fall back to classifier
    const classification = this.classifier.getClassifications(message);
    const topResult = classification[0];
    
    if (topResult && topResult.value > 0.5) {
      return { 
        intent: topResult.label, 
        confidence: topResult.value,
        method: 'classifier'
      };
    }

    return { intent: 'unknown', confidence: 0 };
  }

  /**
   * Extract entities from message using NLP
   */
  extractEntities(message) {
    const doc = nlp(message);
    
    const entities = {
      people: [],
      dates: [],
      times: [],
      places: [],
      numbers: [],
      description: null,
    };

    // Extract people names
    try {
      const people = doc.people().json();
      if (people && people.length > 0) {
        entities.people = people.map(p => p.text);
        entities.assignee = entities.people[0]; // First person as assignee
      }
    } catch (e) {
      // Fallback: look for capitalized words
      const words = message.split(' ');
      const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));
      if (capitalizedWords.length > 0) {
        entities.people = capitalizedWords;
        entities.assignee = capitalizedWords[0];
      }
    }

    // Extract dates
    try {
      const dateMatches = doc.match('#Date').json();
      if (dateMatches && dateMatches.length > 0) {
        entities.dates = dateMatches.map(d => d.text);
        entities.dueDate = this.parseDate(entities.dates[0]);
      } else {
        // Check for common date patterns
        const dateWords = ['today', 'tomorrow', 'next week', 'next month'];
        for (const dateWord of dateWords) {
          if (message.toLowerCase().includes(dateWord)) {
            entities.dates = [dateWord];
            entities.dueDate = this.parseDate(dateWord);
            break;
          }
        }
      }
    } catch (e) {
      // Silent fallback
    }

    // Extract numbers
    try {
      const numberMatches = doc.match('#Value').json();
      if (numberMatches && numberMatches.length > 0) {
        entities.numbers = numberMatches.map(n => n.text);
      }
    } catch (e) {
      // Extract numbers using regex
      const numberPattern = /\d+/g;
      const matches = message.match(numberPattern);
      if (matches) {
        entities.numbers = matches;
      }
    }

    // Extract task description (everything after "for" or "to")
    const forMatch = message.match(/(?:for|to)\s+([^,]+)/i);
    if (forMatch) {
      entities.description = forMatch[1].trim();
    } else {
      // Use the main verb phrase as description
      try {
        const verbs = doc.verbs().json();
        if (verbs && verbs.length > 0) {
          entities.description = verbs[0].text;
        }
      } catch (e) {
        // Use the whole message minus command words
        const commandWords = ['create', 'add', 'new', 'show', 'list', 'task', 'tasks'];
        const words = message.split(' ');
        const descWords = words.filter(w => !commandWords.includes(w.toLowerCase()));
        if (descWords.length > 0) {
          entities.description = descWords.join(' ');
        }
      }
    }

    return entities;
  }

  /**
   * Parse natural date expressions
   */
  parseDate(dateStr) {
    const normalized = dateStr.toLowerCase();
    const today = new Date();
    
    if (normalized.includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    if (normalized.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (normalized.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    // Try to parse as date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  }

  /**
   * Calculate semantic similarity between two texts
   */
  calculateSimilarity(text1, text2) {
    const tokens1 = this.tokenizer.tokenize(text1.toLowerCase());
    const tokens2 = this.tokenizer.tokenize(text2.toLowerCase());
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Generate natural language response
   */
  generateResponse(intent, entities, context = {}) {
    const templates = {
      greeting: [
        `Hello ${context.userName || 'there'}! How can I help you today?`,
        `Hi ${context.userName || 'there'}! What would you like to do?`,
        `Hey! I'm here to help. What can I do for you?`,
      ],
      create_task: [
        `I'll create that task for you!`,
        `Got it! Creating the task now.`,
        `Task created successfully!`,
      ],
      show_tasks: [
        `Here are your tasks:`,
        `Let me show you your tasks:`,
        `Your current tasks:`,
      ],
      help: [
        `I can help you with:\n• Create tasks\n• View your tasks\n• Manage your work\n\nJust tell me what you need!`,
        `Here's what I can do:\n📝 Create tasks\n📋 Show tasks\n👥 Assign tasks\n\nHow can I help?`,
      ],
      status: [
        `I'm running perfectly! All systems operational. 🚀`,
        `Everything's working great! How can I assist you?`,
      ],
      unknown: [
        `I'm not sure I understand. Can you rephrase that?`,
        `Could you clarify what you'd like me to do?`,
        `I didn't quite catch that. Try saying it differently?`,
      ],
    };

    const options = templates[intent] || templates.unknown;
    const response = options[Math.floor(Math.random() * options.length)];
    
    return response;
  }

  /**
   * Analyze sentiment of the message
   */
  analyzeSentiment(message) {
    const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    const tokens = this.tokenizer.tokenize(message.toLowerCase());
    const score = analyzer.getSentiment(tokens);
    
    let sentiment;
    if (score > 0.2) sentiment = 'positive';
    else if (score < -0.2) sentiment = 'negative';
    else sentiment = 'neutral';
    
    return { score, sentiment };
  }

  /**
   * Main processing function
   */
  async process(message, context = {}) {
    try {
      // Detect intent
      const { intent, confidence, method } = this.detectIntent(message);
      
      // Extract entities
      const entities = this.extractEntities(message);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(message);
      
      // Generate response
      const response = this.generateResponse(intent, entities, context);
      
      return {
        success: true,
        intent,
        confidence,
        method,
        entities,
        sentiment,
        response,
        processed: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[InternalAI] Processing error:', error);
      return {
        success: false,
        error: error.message,
        response: "I encountered an error processing your message. Please try again.",
      };
    }
  }

  /**
   * Get AI statistics
   */
  getStats() {
    return {
      classifierDocs: this.classifier.docs.length,
      intentPatterns: Object.keys(this.intentPatterns).length,
      status: 'ready',
      mode: 'offline',
      provider: 'internal-nlp',
    };
  }
}

// Create singleton instance
let aiInstance = null;

function getAI() {
  if (!aiInstance) {
    aiInstance = new InternalAI();
  }
  return aiInstance;
}

module.exports = {
  InternalAI,
  getAI,
};
