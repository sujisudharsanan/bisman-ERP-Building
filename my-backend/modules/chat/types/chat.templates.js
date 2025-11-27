/**
 * BISMAN ERP - Assistant Tone Templates
 * Human-like conversation starters with variety and personality
 */

/**
 * Tone presets with multiple variations for natural conversation
 * Each tone has 5+ options to avoid repetitive responses
 */
const tonePresets = {
  friendly: [
    "Got it! Here's what I found:",
    "Sure, let me check that for you.",
    "Alright, this is what's happening right now:",
    "Done ✅ Here are the details:",
    "Perfect! Let me pull that up for you.",
    "Sure thing! Here's the information:",
    "Okay! Let me get that for you.",
    "No problem! Here's what I have:",
  ],
  
  alert: [
    "Heads up ⚠️ This needs attention:",
    "Important notice:",
    "You might want to act on this soon:",
    "Quick heads up! This requires action:",
    "Attention needed ⚠️",
    "This is time-sensitive:",
    "FYI - This needs your review:",
  ],
  
  error: [
    "Oops, something went wrong.",
    "Sorry, I couldn't complete that.",
    "That didn't work as expected.",
    "Hmm, I ran into an issue.",
    "Sorry about that, there was an error.",
    "Unfortunately, that didn't go through.",
    "I hit a snag with that request.",
  ],
  
  info: [
    "Here's the information you asked for:",
    "Here are the details:",
    "This is what I found:",
    "Based on what I see:",
    "Here's the current status:",
    "Here's what's available:",
    "Let me break this down for you:",
    "Here's the complete picture:",
  ],
};

/**
 * Pick a random tone prefix to make responses feel natural and varied
 * @param {import('./chat.types').Tone} tone - The tone to use
 * @returns {string} A random prefix string for that tone
 */
function pickTonePrefix(tone) {
  const options = tonePresets[tone] || tonePresets.info;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get contextual greetings based on time of day
 * @returns {string} Time-appropriate greeting
 */
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Get day part for casual conversation
 * @returns {'morning' | 'afternoon' | 'evening'}
 */
function getDayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Small talk responses with personality
 */
const smallTalkTemplates = {
  greeting: [
    "Hey there! 👋 How can I help you today?",
    "Hello! What can I do for you?",
    "Hi! Ready to help with whatever you need.",
    "Welcome back! What's on your mind?",
  ],
  
  thanks: [
    "You're welcome! Always here to help 😊",
    "Happy to help! Let me know if you need anything else.",
    "Anytime! That's what I'm here for.",
    "Glad I could assist! 😄",
    "My pleasure! Feel free to ask anything.",
  ],
  
  bye: [
    "See you later! Have a great day! 👋",
    "Goodbye! Come back anytime you need help.",
    "Take care! I'll be here when you need me.",
    "Catch you later! 😊",
  ],
};

/**
 * Pick random small talk response
 * @param {'greeting' | 'thanks' | 'bye'} type
 * @returns {string}
 */
function pickSmallTalk(type) {
  const options = smallTalkTemplates[type] || smallTalkTemplates.greeting;
  return options[Math.floor(Math.random() * options.length)];
}

module.exports = {
  tonePresets,
  pickTonePrefix,
  getTimeBasedGreeting,
  getDayPart,
  smallTalkTemplates,
  pickSmallTalk,
};
