'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Cpu,
  Activity,
  TrendingUp,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  RefreshCw,
  Database,
  MessageSquare,
  FileText,
} from 'lucide-react';
import EnterpriseAdminNavbar from '@/components/EnterpriseAdminNavbar';
import EnterpriseAdminSidebar from '@/components/EnterpriseAdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  usage: number;
  avgResponseTime: number;
  lastUsed: string;
}

interface AIMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  activeModels: number;
  costThisMonth: number;
}

export default function AIHandlingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<AIMetrics>({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    activeModels: 0,
    costThisMonth: 0,
  });
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user || user.role !== 'ENTERPRISE_ADMIN') {
      router.push('/auth/login');
      return;
    }
    fetchAIData();
  }, [user, router, mounted]);

  const fetchAIData = async () => {
    setIsLoading(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const [metricsRes, modelsRes] = await Promise.all([
        fetch(`${baseURL}/api/enterprise-admin/ai/metrics`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/enterprise-admin/ai/models`, {
          credentials: 'include',
        }),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.ok) setMetrics(data.metrics);
      }

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        if (data.ok) setModels(data.models);
      }
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <EnterpriseAdminNavbar />
      
      <div className="flex">
        <EnterpriseAdminSidebar />
        
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Brain className="w-10 h-10 text-purple-600" />
                    AI Handling & Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Monitor and manage AI models, usage, and performance
                  </p>
                </div>
                <button
                  onClick={fetchAIData}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </motion.div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <MetricCard
                icon={<MessageSquare className="w-6 h-6" />}
                label="Total Requests"
                value={metrics.totalRequests.toLocaleString()}
                trend="+12%"
                color="purple"
                loading={isLoading}
              />
              <MetricCard
                icon={<CheckCircle className="w-6 h-6" />}
                label="Success Rate"
                value={`${metrics.successRate.toFixed(1)}%`}
                trend="+2.5%"
                color="green"
                loading={isLoading}
              />
              <MetricCard
                icon={<Zap className="w-6 h-6" />}
                label="Avg Response"
                value={`${metrics.avgResponseTime}ms`}
                trend="-8%"
                color="blue"
                loading={isLoading}
              />
              <MetricCard
                icon={<Cpu className="w-6 h-6" />}
                label="Active Models"
                value={metrics.activeModels.toString()}
                color="indigo"
                loading={isLoading}
              />
              <MetricCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Cost This Month"
                value={`₹${metrics.costThisMonth.toFixed(2)}`}
                trend="+5%"
                color="pink"
                loading={isLoading}
              />
            </div>

            {/* AI Models Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-600" />
                  AI Models
                </h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    ))
                ) : models.length === 0 ? (
                  <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AI models configured yet</p>
                  </div>
                ) : (
                  models.map((model) => (
                    <motion.div
                      key={model.id}
                      whileHover={{ scale: 1.02 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                      onClick={() => setSelectedModel(model)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {model.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {model.provider}
                          </p>
                        </div>
                        {getStatusIcon(model.status)}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Usage:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {model.usage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Response:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {model.avgResponseTime}ms
                          </span>
                        </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last used: {mounted ? new Date(model.lastUsed).toLocaleString() : 'Loading...'}
                    </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className={`h-2 rounded-full ${getStatusColor(model.status)}`}></div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Usage Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                Usage Analytics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Data Processing
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">2.4TB</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Processed this month
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Documents Analyzed
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">1,245</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    This month
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Uptime
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">99.98%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Last 30 days
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  color: 'purple' | 'green' | 'blue' | 'indigo' | 'pink';
  loading?: boolean;
}

function MetricCard({ icon, label, value, trend, color, loading }: MetricCardProps) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6"
    >
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {trend}
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
