'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Loader2, 
  Trash2, 
  FileText, 
  TrendingUp, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import apiClient from '@/services/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Report {
  id: number;
  report_type: string;
  report_date: string;
  executive_summary: string;
  created_at: string;
}

/**
 * Common Module - AI Assistant Page
 * Local AI-powered assistant for ERP insights and queries
 */
export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'reports' | 'analytics'>('chat');
  const [reports, setReports] = useState<Report[]>([]);
  const [aiHealth, setAiHealth] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check AI service health on mount
  useEffect(() => {
    checkAIHealth();
    loadConversationHistory();
    if (activeTab === 'reports') {
      loadReports();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab]);

  const checkAIHealth = async () => {
    try {
      const response = await apiClient.get('/api/ai/health');
      setAiHealth(response.data.status === 'healthy' ? 'healthy' : 'unhealthy');
    } catch (error) {
      setAiHealth('unhealthy');
    }
  };

  const loadConversationHistory = async () => {
    try {
      const response = await apiClient.get('/api/ai/conversations', {
        params: { limit: 20 }
      });
      
      if (response.data.success) {
        const history = response.data.conversations.map((conv: any) => ([
          {
            id: `${conv.id}-user`,
            role: 'user' as const,
            content: conv.message,
            timestamp: new Date(conv.created_at)
          },
          {
            id: `${conv.id}-assistant`,
            role: 'assistant' as const,
            content: conv.response,
            timestamp: new Date(conv.created_at)
          }
        ])).flat().reverse();
        
        setMessages(history);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const loadReports = async () => {
    try {
      const response = await apiClient.get('/api/ai/analytics/reports', {
        params: { limit: 10 }
      });
      
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiClient.post('/api/ai/query', {
        prompt: input
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message}\n\n${error.response?.data?.hint || ''}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    if (window.confirm('Clear all messages?')) {
      setMessages([]);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/ai/analytics/generate-report');
      if (response.data.success) {
        alert('Report generated successfully!');
        loadReports();
      }
    } catch (error) {
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "What were our sales yesterday?",
    "Show me inventory status",
    "Predict sales for next week",
    "Which items need reordering?"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    AI Assistant
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Powered by local AI • Fully offline • Private
                  </p>
                </div>
              </div>
            </div>
            
            {/* AI Health Status */}
            <div className="flex items-center gap-2">
              {aiHealth === 'healthy' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Online</span>
                </div>
              ) : aiHealth === 'unhealthy' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Checking...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Chat
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Reports
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Start a conversation with your AI assistant
                  </p>
                  
                  {/* Quick Prompts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(prompt)}
                        className="p-4 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">{prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="flex gap-2">
                <button
                  onClick={clearConversation}
                  disabled={messages.length === 0}
                  className="p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Clear conversation"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your ERP data..."
                  className="flex-1 resize-none p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100"
                  rows={1}
                  disabled={loading || aiHealth !== 'healthy'}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || aiHealth !== 'healthy'}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {aiHealth === 'unhealthy' && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    ⚠️ AI service is offline. Please ensure Ollama is installed and running.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                AI Generated Reports
              </h2>
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
                Generate New Report
              </button>
            </div>

            <div className="grid gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                        {report.report_type.replace('_', ' ')} Report
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(report.report_date).toLocaleDateString()}
                      </p>
                    </div>
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  
                  {report.executive_summary && (
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                      {report.executive_summary}
                    </p>
                  )}
                  
                  <div className="mt-4">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                      View Full Report →
                    </button>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No reports generated yet. Click "Generate New Report" to create one.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Advanced Analytics Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive charts, trends, and predictions will be available here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
