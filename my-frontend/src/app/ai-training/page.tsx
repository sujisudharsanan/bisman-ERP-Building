'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  Brain,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  XCircle,
  Target,
  BookOpen,
  Zap,
  Users,
  BarChart3
} from 'lucide-react';

interface TrainingExample {
  id: string;
  message: string;
  intent: string;
  entities?: any;
  timestamp: string;
  userId?: string;
}

interface Feedback {
  id: string;
  helpful: boolean;
  correction?: string;
  timestamp: string;
}

interface Stats {
  totalInteractions: number;
  successfulResponses: number;
  spellingCorrections: number;
  learningUpdates: number;
  guidanceProvided: number;
  trainingExamples: number;
  feedbackEntries: number;
  successRate: string;
}

export default function AITrainingPage() {
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [newExample, setNewExample] = useState({ message: '', intent: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'train' | 'stats' | 'feedback'>('train');

  useEffect(() => {
    loadTrainingData();
    loadStats();
  }, []);

  const loadTrainingData = async () => {
    try {
      const response = await fetch('/api/ai/training');
      const data = await response.json();
      setTrainingData(data.training || []);
    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/ai/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const addTrainingExample = async () => {
    if (!newExample.message || !newExample.intent) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExample),
      });

      if (response.ok) {
        setNewExample({ message: '', intent: '' });
        loadTrainingData();
        loadStats();
      }
    } catch (error) {
      console.error('Error adding example:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteExample = async (id: string) => {
    try {
      await fetch(`/api/ai/training/${id}`, { method: 'DELETE' });
      loadTrainingData();
    } catch (error) {
      console.error('Error deleting example:', error);
    }
  };

  const exportTrainingData = async () => {
    try {
      const response = await fetch('/api/ai/training/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-training-${Date.now()}.json`;
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const importTrainingData = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/ai/training/import', {
        method: 'POST',
        body: formData,
      });
      loadTrainingData();
      loadStats();
    } catch (error) {
      console.error('Error importing:', error);
    }
  };

  const retrainModel = async () => {
    setLoading(true);
    try {
      await fetch('/api/ai/retrain', { method: 'POST' });
      loadStats();
      alert('Model retrained successfully!');
    } catch (error) {
      console.error('Error retraining:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">AI Training Center</h1>
                <p className="text-gray-600 mt-1">Train your AI assistant to be smarter and more helpful</p>
              </div>
            </div>
            <button
              onClick={retrainModel}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              {loading ? 'Training...' : 'Retrain Model'}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              icon={<MessageSquare className="w-6 h-6" />}
              label="Total Interactions"
              value={stats.totalInteractions.toLocaleString()}
              color="blue"
            />
            <StatCard
              icon={<CheckCircle className="w-6 h-6" />}
              label="Success Rate"
              value={stats.successRate}
              color="green"
            />
            <StatCard
              icon={<BookOpen className="w-6 h-6" />}
              label="Training Examples"
              value={stats.trainingExamples.toLocaleString()}
              color="purple"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Learning Updates"
              value={stats.learningUpdates.toLocaleString()}
              color="pink"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-200">
            <TabButton
              active={activeTab === 'train'}
              onClick={() => setActiveTab('train')}
              icon={<Brain />}
              label="Training Data"
            />
            <TabButton
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<BarChart3 />}
              label="Statistics"
            />
            <TabButton
              active={activeTab === 'feedback'}
              onClick={() => setActiveTab('feedback')}
              icon={<Users />}
              label="User Feedback"
            />
          </div>

          <div className="p-8">
            {/* Training Tab */}
            {activeTab === 'train' && (
              <div className="space-y-6">
                {/* Add New Example */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Add New Training Example
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="User message..."
                      value={newExample.message}
                      onChange={(e) => setNewExample({ ...newExample, message: e.target.value })}
                      className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Intent (e.g., create_task)"
                      value={newExample.intent}
                      onChange={(e) => setNewExample({ ...newExample, intent: e.target.value })}
                      className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={addTrainingExample}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    Add Example
                  </button>
                </div>

                {/* Import/Export */}
                <div className="flex gap-4">
                  <button
                    onClick={exportTrainingData}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Import Data
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) importTrainingData(file);
                      }}
                    />
                  </label>
                </div>

                {/* Training Examples List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Training Examples ({trainingData.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {trainingData.slice(0, 50).map((example) => (
                      <div
                        key={example.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-800 font-medium">{example.message}</p>
                            <p className="text-sm text-purple-600 mt-1">Intent: {example.intent}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(example.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteExample(example.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MetricCard label="Successful Responses" value={stats.successfulResponses} />
                  <MetricCard label="Spelling Corrections" value={stats.spellingCorrections} />
                  <MetricCard label="Guidance Provided" value={stats.guidanceProvided} />
                  <MetricCard label="Feedback Entries" value={stats.feedbackEntries} />
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      AI is learning from {stats.trainingExamples} real user interactions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Successfully handled {stats.successfulResponses} conversations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Automatically corrected {stats.spellingCorrections} spelling mistakes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Provided helpful guidance {stats.guidanceProvided} times
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">User feedback will appear here as it's collected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 transition-colors ${
        active
          ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {React.cloneElement(icon, { className: 'w-5 h-5' })}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function MetricCard({ label, value }: any) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
      <p className="text-gray-600 text-sm mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value.toLocaleString()}</p>
    </div>
  );
}
