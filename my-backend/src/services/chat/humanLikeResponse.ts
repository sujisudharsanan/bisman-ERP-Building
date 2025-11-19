/**
 * Human-Like Response Generator
 * Adds warmth, empathy, and natural conversation patterns
 */

export interface ResponseTemplate {
  empathy: string[];
  clarification: string[];
  support: string[];
  confirmation: string[];
  error: string[];
  success: string[];
  thinking: string[];
  transition: string[];
}

export class HumanLikeResponseGenerator {
  
  private templates: ResponseTemplate = {
    empathy: [
      "No worries, I'll help you fix this.",
      "I understand why that's confusing.",
      "Thanks for sharing the details—it helps a lot.",
      "I can see why this would be frustrating.",
      "Let me help you sort this out.",
      "I get it — let's work through this together.",
    ],
    
    clarification: [
      "Just to be sure I'm following correctly…",
      "When you say '{term}', do you mean {option1} or {option2}?",
      "Can you share one example? Then I can solve it perfectly.",
      "To give you the exact solution, could you clarify:",
      "Help me understand — are you asking about {topic}?",
      "Quick question to make sure I help you correctly:",
    ],
    
    support: [
      "Let me simplify this for you…",
      "Here's the best way to handle it step-by-step:",
      "I can help with that right away.",
      "Great question! Here's how this works:",
      "Let me break this down for you:",
      "I'll walk you through this:",
    ],
    
    confirmation: [
      "Got it!",
      "Perfect, I understand.",
      "Thanks for clarifying!",
      "That makes sense.",
      "Okay, I see what you need.",
      "Understood!",
    ],
    
    error: [
      "I'm having trouble with this part:",
      "I might be misunderstanding this:",
      "Let me make sure I have this right:",
      "I want to be 100% accurate here, so let me confirm:",
      "I'm not fully sure about this part, can you confirm?",
    ],
    
    success: [
      "Great! I've {action} for you.",
      "Done! {result}",
      "All set! {next_step}",
      "Perfect! That's completed.",
      "Success! {confirmation}",
    ],
    
    thinking: [
      "Let me check that for you…",
      "Give me just a moment…",
      "Looking that up now…",
      "Let me find that information…",
      "Checking the system…",
    ],
    
    transition: [
      "By the way,",
      "One more thing —",
      "Also,",
      "While we're at it,",
      "Quick note:",
    ]
  };

  /**
   * Add empathetic opening to response
   */
  addEmpathy(response: string, context?: string): string {
    const empathy = this.randomFromArray(this.templates.empathy);
    return `${empathy} ${response}`;
  }

  /**
   * Add clarification request
   */
  addClarification(topic: string, options?: string[]): string {
    const clarification = this.randomFromArray(this.templates.clarification);
    
    if (options && options.length > 0) {
      const optionsList = options.map((opt, i) => `  ${i + 1}. ${opt}`).join('\n');
      return `${clarification}\n\n${optionsList}\n\nWhich one applies to you?`;
    }
    
    return clarification.replace('{topic}', topic);
  }

  /**
   * Add supportive framing
   */
  addSupportiveFrame(response: string): string {
    const support = this.randomFromArray(this.templates.support);
    return `${support}\n\n${response}`;
  }

  /**
   * Format success message
   */
  formatSuccess(action: string, nextSteps?: string): string {
    const success = this.randomFromArray(this.templates.success);
    const message = success.replace('{action}', action);
    
    if (nextSteps) {
      return `${message}\n\n${nextSteps}`;
    }
    
    return message;
  }

  /**
   * Handle repeated question with escalating responses
   */
  handleRepeatedQuestion(
    repeatCount: number,
    originalQuestion: string,
    previousResponse?: string
  ): string {
    
    if (repeatCount === 1) {
      // First repeat - acknowledge and ask for clarification
      return `I noticed you're asking about this again.\n\n` +
        `Just to make sure I give you the exact solution, could you clarify:\n` +
        `  • What result are you expecting?\n` +
        `  • Which part is still unclear?\n` +
        `  • Do you want a step-by-step guide or a quick summary?\n\n` +
        `This will help me give you the perfect answer!`;
    }
    
    if (repeatCount === 2) {
      // Second repeat - provide options and external help
      return `I want to make sure you get the right solution.\n\n` +
        `Let me offer a few options:\n` +
        `  1. Share one specific example or screenshot of what you're trying to do\n` +
        `  2. Tell me exactly what happened when you tried\n` +
        `  3. Or I can create a support ticket for detailed help\n\n` +
        `Which would help you most?`;
    }
    
    // Third+ repeat - escalate or provide external resources
    return `It looks like this needs more specific attention.\n\n` +
      `Here's what I can do:\n` +
      `  • Create a high-priority support ticket for you\n` +
      `  • Connect you with a specialist who can help\n` +
      `  • Or search for broader references: ` +
      `[Search on Google](https://www.google.com/search?q=${encodeURIComponent(originalQuestion)})\n\n` +
      `Would you like me to create a ticket and get you expert help?`;
  }

  /**
   * Format low-confidence response with options
   */
  formatLowConfidenceResponse(
    possibleIntents: Array<{ intent: string; description: string }>,
    userMessage: string
  ): string {
    const clarification = this.randomFromArray(this.templates.clarification);
    
    const intentOptions = possibleIntents
      .map((item, i) => `  ${i + 1}. ${item.description}`)
      .join('\n');
    
    return `${clarification}\n\n` +
      `I want to help you correctly. Are you asking about:\n\n` +
      `${intentOptions}\n\n` +
      `Or something else? Please let me know!`;
  }

  /**
   * Add helpful follow-up options
   */
  addFollowUpOptions(response: string, options: string[]): string {
    const optionsList = options.map((opt, i) => `  • ${opt}`).join('\n');
    
    return `${response}\n\n` +
      `What would you like me to do next?\n${optionsList}`;
  }

  /**
   * Format permission denied message warmly
   */
  formatPermissionDenied(action: string, requiredRole: string): string {
    return `I understand you'd like to ${action}.\n\n` +
      `This action requires ${requiredRole} permissions. ` +
      `I can help you in a couple of ways:\n\n` +
      `  • Create a request for approval\n` +
      `  • Guide you on how to request access\n` +
      `  • Connect you with someone who has the right permissions\n\n` +
      `Which would help you most?`;
  }

  /**
   * Random selection from array
   */
  private randomFromArray<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Make response more conversational
   */
  makeConversational(response: string): string {
    // Add occasional transitions
    if (Math.random() > 0.7 && response.includes('\n')) {
      const transition = this.randomFromArray(this.templates.transition);
      const parts = response.split('\n');
      if (parts.length > 1) {
        parts.splice(1, 0, transition);
        return parts.join('\n');
      }
    }
    
    // Add thinking phrase for complex operations
    if (response.includes('checking') || response.includes('looking up')) {
      const thinking = this.randomFromArray(this.templates.thinking);
      return `${thinking}\n\n${response}`;
    }
    
    return response;
  }

  /**
   * Add context-aware greeting
   */
  addGreeting(timeOfDay?: 'morning' | 'afternoon' | 'evening'): string {
    const greetings = {
      morning: ['Good morning!', 'Morning!', 'Hey there!'],
      afternoon: ['Good afternoon!', 'Hi!', 'Hello!'],
      evening: ['Good evening!', 'Hey!', 'Hi there!'],
    };
    
    if (timeOfDay && greetings[timeOfDay]) {
      return this.randomFromArray(greetings[timeOfDay]);
    }
    
    // Default greetings
    return this.randomFromArray(['Hi!', 'Hello!', 'Hey there!', 'Hi there!']);
  }

  /**
   * Format step-by-step instructions
   */
  formatStepByStep(steps: string[], intro?: string): string {
    const support = this.randomFromArray(this.templates.support);
    const formattedSteps = steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
    
    if (intro) {
      return `${support}\n\n${intro}\n\n${formattedSteps}`;
    }
    
    return `${support}\n\n${formattedSteps}`;
  }

  /**
   * Add mini-paragraphs for readability
   */
  formatWithParagraphs(sections: string[]): string {
    return sections.join('\n\n');
  }
}

export const humanLikeResponse = new HumanLikeResponseGenerator();
