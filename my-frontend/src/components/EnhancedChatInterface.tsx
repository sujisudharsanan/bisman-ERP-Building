'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  spellCheck?: {
    corrections: Array<{ original: string; corrected: string }>;
  };
  suggestions?: string[];
  guidance?: any[];
  canCorrect?: boolean;
}

interface EnhancedChatInterfaceProps {
  userId: string;
  userName: string;
  userRole?: string;
  onClose?: () => void;
}

interface PendingItems {
  tasks: number;
  approvals: number;
  newApprovals: number;
}

export default function EnhancedChatInterface({
  userId,
  userName,
  userRole,
  onClose
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCorrectionInput, setShowCorrectionInput] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Send personalized greeting
    sendGreeting();
  }, [userName]);

  const sendGreeting = async () => {
    setLoading(true);
    try {
      // Use new unified chat greeting endpoint
      const response = await fetch('/api/unified-chat/greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId)
        })
      });

      const data = await response.json();

      const welcomeMessage: Message = {
        id: '0',
        text: data.greeting, // Humanized greeting from Mira
        sender: 'bot',
        timestamp: new Date(),
        suggestions: data.suggestions || ['Show my tasks', 'Show pending approvals', 'View reports', 'Help']
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error fetching greeting:', error);
      const fallbackMessage: Message = {
        id: '0',
        text: `Hi ${userName.split(' ')[0]}! 👋 I'm your AI assistant. How can I help you today?`,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: ['Show my tasks', 'View reports', 'Help']
      };
      setMessages([fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use new unified chat message endpoint
      const response = await fetch('/api/unified-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          message: text
        })
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response, // Humanized response from Mira
        sender: 'bot',
        timestamp: new Date(),
        spellCheck: data.spellCheck,
        suggestions: data.suggestions,
        guidance: data.guidance
      };

      setMessages(prev => [...prev, botMessage]);
      setShowSuggestions(data.suggestions && data.suggestions.length > 0);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (messageId: string, helpful: boolean) => {
    try {
      // Use new unified chat feedback endpoint
      await fetch('/api/unified-chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          messageId: parseInt(messageId),
          feedbackType: helpful ? 'positive' : 'negative'
        })
      });
      
      // Show a thank you message
      const thankYou: Message = {
        id: Date.now().toString(),
        text: helpful 
          ? "Thanks for the feedback! I'm always learning. 😊"
          : "Sorry that wasn't helpful. I'll try to do better!",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, thankYou]);
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const handleSpellingFeedback = async (original: string, corrected: string, helpful: boolean) => {
    try {
      // Use new unified chat correction endpoint for spelling feedback
      await fetch('/api/unified-chat/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          original,
          corrected,
          context: helpful ? 'spelling_correction_confirmed' : 'spelling_correction_rejected'
        })
      });
    } catch (error) {
      console.error('Error sending spelling feedback:', error);
    }
  };

  const handleUserCorrection = async (messageId: string) => {
    if (!correctionText.trim()) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      // Use new unified chat correction endpoint
      const response = await fetch('/api/unified-chat/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          original: message.text,
          corrected: correctionText,
          context: 'user_correction'
        })
      });

      const data = await response.json();

      if (data.success) {
        const thankYouMessage: Message = {
          id: Date.now().toString(),
          text: data.message + ' This will help me understand better next time!',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, thankYouMessage]);
      }

      setShowCorrectionInput(null);
      setCorrectionText('');
    } catch (error) {
      console.error('Error submitting correction:', error);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-full shadow-2xl cursor-pointer hover:shadow-3xl transition-all z-50 flex items-center gap-3"
           onClick={() => setIsMinimized(false)}>
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">AI Assistant</span>
        <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
          {messages.filter(m => m.sender === 'bot').length} messages
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-xs text-white/80">Always learning, always helpful</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Message bubble */}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>

              {/* Spell check notification */}
              {message.spellCheck && message.spellCheck.corrections.length > 0 && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1 text-blue-700 mb-1">
                    <CheckCircle className="w-3 h-3" />
                    <span className="font-medium">Auto-corrected:</span>
                  </div>
                  {message.spellCheck.corrections.map((correction, idx) => (
                    <div key={idx} className="flex items-center justify-between text-blue-600">
                      <span>
                        <span className="line-through">{correction.original}</span>
                        {' → '}
                        <span className="font-medium">{correction.corrected}</span>
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSpellingFeedback(correction.original, correction.corrected, true)}
                          className="hover:text-green-600"
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleSpellingFeedback(correction.original, correction.corrected, false)}
                          className="hover:text-red-600"
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Guidance */}
              {message.guidance && message.guidance.length > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1 text-amber-700 mb-1">
                    <Lightbulb className="w-3 h-3" />
                    <span className="font-medium">Helpful tip:</span>
                  </div>
                  <p className="text-amber-600">{message.guidance[0].message}</p>
                </div>
              )}

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(suggestion)}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs hover:bg-purple-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback buttons for bot messages */}
              {message.sender === 'bot' && !message.text.includes('feedback') && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => sendFeedback(message.id, true)}
                    className="text-gray-400 hover:text-green-600 transition-colors"
                    title="Helpful"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => sendFeedback(message.id, false)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowCorrectionInput(message.id)}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors ml-2"
                    title="I meant something else"
                  >
                    Correct this
                  </button>
                </div>
              )}

              {/* User correction input */}
              {showCorrectionInput === message.id && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 mb-2">What did you actually mean?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="Type what you meant..."
                      className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleUserCorrection(message.id)}
                    />
                    <button
                      onClick={() => handleUserCorrection(message.id)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => {
                        setShowCorrectionInput(null);
                        setCorrectionText('');
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          ✨ AI-powered • Spell-check enabled • Always learning
        </p>
      </div>
    </div>
  );
}
