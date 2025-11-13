"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FiMessageCircle, FiX, FiCpu, FiUsers, FiMail } from "react-icons/fi";
import ChatWidget from "./ChatWidget";
import MattermostEmbed from "./MattermostEmbed";

/**
 * Unified Chat Widget with AI Assistant and Mattermost Team Chat
 */
export default function UnifiedChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai');

  if (!user) return null;

  return (
    <div className="fixed z-[60] right-4 bottom-4">
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Open Chat"
        >
          <FiMessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-96 h-[600px] flex flex-col border border-gray-200 dark:border-gray-700">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  activeTab === 'ai'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <FiCpu className="w-4 h-4" />
                <span className="text-sm font-medium">AI Assistant</span>
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  activeTab === 'team'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <FiUsers className="w-4 h-4" />
                <span className="text-sm font-medium">Team Chat</span>
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close Chat"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'ai' ? (
              <AIAssistantContent />
            ) : (
              <MattermostContent />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AI Assistant Content - Reuses ChatWidget logic
 */
function AIAssistantContent() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; text: string }>>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text })) 
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = typeof data?.reply === "string" ? data.reply : "I received your message.";
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: "assistant", 
        text: "Sorry, I couldn't reach the AI right now." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <FiCpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ask me anything about your ERP system!</p>
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mattermost Content - Embeds Mattermost iframe
 */
function MattermostContent() {
  return (
    <div className="h-full">
      <MattermostEmbed />
    </div>
  );
}
