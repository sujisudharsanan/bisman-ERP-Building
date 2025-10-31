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
// Navbar and Sidebar are injected by the enterprise-admin layout
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
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [allModules, setAllModules] = useState<any[]>([]);

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
  fetchSettings();
  fetchAllModules();
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

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/ai/settings', { credentials: 'include' });
      const j = await res.json();
      if (j.ok) setSettings(j.settings);
    } catch (e) {}
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/ai/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(settings) });
      const j = await res.json();
      if (j.ok) setSettings(j.settings);
    } finally {
      setSaving(false);
    }
  };

  const fetchAllModules = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const r = await fetch(`${baseURL}/api/enterprise-admin/master-modules`, { credentials: 'include' });
      if (!r.ok) return;
      const j = await r.json();
      if (j.ok && Array.isArray(j.modules)) setAllModules(j.modules);
      else if (Array.isArray(j)) setAllModules(j);
    } catch (e) {
      // ignore
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
      <div className="flex">
        <main className="flex-1 p-8">
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

      {/* Settings Card (Centered in AI Models section) */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg mt-4">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-600" />
              AI Settings
            </div>
            <button onClick={saveSettings} disabled={!settings || saving} className="px-3 py-1 text-sm rounded bg-purple-600 text-white disabled:opacity-60">{saving? 'Saving…':'Save'}</button>
          </div>
          <div className="p-4 space-y-5 text-sm">
            {!settings ? (
              <div className="text-gray-500">Loading…</div>
            ) : (
              <>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!settings.enabled} onChange={e=>setSettings((s:any)=>({...s, enabled: e.target.checked}))} />
                  Enable AI
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Provider</label>
                    <select className="w-full border rounded px-2 py-1" value={settings.provider} onChange={e=>setSettings((s:any)=>({...s, provider: e.target.value}))}>
                      <option value="local">Local (Ollama)</option>
                      <option value="api">API (placeholder)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Model</label>
                    <input className="w-full border rounded px-2 py-1" value={settings.model||''} onChange={e=>setSettings((s:any)=>({...s, model: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Temperature</label>
                    <input type="number" step="0.1" min="0" max="1" className="w-full border rounded px-2 py-1" value={settings.temperature} onChange={e=>setSettings((s:any)=>({...s, temperature: Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Top‑K</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={settings.rag?.topK||6} onChange={e=>setSettings((s:any)=>({...s, rag:{...s.rag, topK: Number(e.target.value)}}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Retention (days)</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={settings.security?.retentionDays||180} onChange={e=>setSettings((s:any)=>({...s, security:{...s.security, retentionDays: Number(e.target.value)}}))} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Domains</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(settings.domains||{}).map((k)=> (
                      <label key={k} className="flex items-center gap-2">
                        <input type="checkbox" checked={!!settings.domains[k]} onChange={e=>setSettings((s:any)=>({...s, domains:{...s.domains, [k]: e.target.checked}}))} /> {k}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tools</div>
                  <div className="flex flex-wrap gap-2">
                    {['query-data','export-csv','create-task','send-email','raise-ticket'].map(t=> (
                      <label key={t} className="flex items-center gap-1 border rounded px-2 py-1">
                        <input type="checkbox" checked={settings.tools?.includes(t)} onChange={e=>setSettings((s:any)=> ({...s, tools: e.target.checked ? Array.from(new Set([...(s.tools||[]), t])) : (s.tools||[]).filter((x:string)=>x!==t)}))} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Module Allow/Deny List */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Modules (Allow AI Access)</div>
                  {allModules.length === 0 ? (
                    <div className="text-gray-500">No modules found or insufficient permission.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allModules.map((m)=>{
                        const modId = m.id ?? m.module_name ?? m.name;
                        const allowed: string[] = settings.allowedModules || [];
                        const isChecked = allowed.includes(String(modId));
                        return (
                          <label key={String(modId)} className="flex items-center gap-2 border rounded px-2 py-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e)=>setSettings((s:any)=>{
                                const idStr = String(modId);
                                const cur: string[] = s.allowedModules || [];
                                return { ...s, allowedModules: e.target.checked
                                  ? Array.from(new Set([...cur, idStr]))
                                  : cur.filter((x)=>x!==idStr)
                                };
                              })}
                            />
                            <span className="truncate" title={m.display_name || m.name || m.module_name}>{m.display_name || m.name || m.module_name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Unchecked modules will be blocked for AI features.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!settings.security?.rls} onChange={e=>setSettings((s:any)=>({...s, security:{...s.security, rls: e.target.checked}}))} />
                    Enforce Row‑Level Security
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!settings.security?.redactPII} onChange={e=>setSettings((s:any)=>({...s, security:{...s.security, redactPII: e.target.checked}}))} />
                    Redact PII
                  </label>
                  <div>
                    <label className="text-xs text-gray-500">Prompt Logging</label>
                    <select className="w-full border rounded px-2 py-1" value={settings.security?.promptLogging||'hashed'} onChange={e=>setSettings((s:any)=>({...s, security:{...s.security, promptLogging: e.target.value}}))}>
                      <option value="on">On</option>
                      <option value="hashed">Hashed</option>
                      <option value="off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Model Allow‑list</label>
                    <input className="w-full border rounded px-2 py-1" value={(settings.security?.modelAllow||[]).join(',')} onChange={e=>setSettings((s:any)=>({...s, security:{...s.security, modelAllow: e.target.value.split(',').map((x)=>x.trim()).filter(Boolean)}}))} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
