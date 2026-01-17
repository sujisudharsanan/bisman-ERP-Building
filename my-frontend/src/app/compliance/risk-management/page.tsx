'use client';

import React, { useState } from 'react';
import { AlertTriangle, Plus, Search, Eye, Edit2, Shield, TrendingDown, CheckCircle, Clock, Activity, BarChart } from 'lucide-react';

interface Risk {
  id: string;
  title: string;
  category: 'Operational' | 'Financial' | 'Strategic' | 'Compliance' | 'Technology' | 'Reputational';
  description: string;
  likelihood: 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';
  impact: 'Critical' | 'High' | 'Medium' | 'Low' | 'Negligible';
  riskScore: number;
  owner: string;
  department: string;
  status: 'Open' | 'Mitigating' | 'Monitoring' | 'Closed' | 'Accepted';
  mitigationPlan: string;
  identifiedDate: string;
  reviewDate: string;
}

export default function RiskManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const risks: Risk[] = [
    { id: 'RSK-001', title: 'Supply Chain Disruption', category: 'Operational', description: 'Risk of raw material shortage due to supplier issues', likelihood: 'Medium', impact: 'High', riskScore: 12, owner: 'Procurement Head', department: 'Procurement', status: 'Mitigating', mitigationPlan: 'Diversify supplier base, maintain safety stock', identifiedDate: '2024-10-15', reviewDate: '2025-01-31' },
    { id: 'RSK-002', title: 'Cybersecurity Breach', category: 'Technology', description: 'Potential data breach or ransomware attack', likelihood: 'Medium', impact: 'Critical', riskScore: 16, owner: 'IT Director', department: 'IT', status: 'Monitoring', mitigationPlan: 'Enhanced security protocols, regular audits', identifiedDate: '2024-08-20', reviewDate: '2025-02-15' },
    { id: 'RSK-003', title: 'Currency Fluctuation', category: 'Financial', description: 'Exchange rate volatility impacting import costs', likelihood: 'High', impact: 'Medium', riskScore: 12, owner: 'CFO', department: 'Finance', status: 'Mitigating', mitigationPlan: 'Hedging strategies, forward contracts', identifiedDate: '2024-11-10', reviewDate: '2025-01-20' },
    { id: 'RSK-004', title: 'Regulatory Changes', category: 'Compliance', description: 'New tax or labor regulations impacting operations', likelihood: 'Medium', impact: 'High', riskScore: 12, owner: 'Compliance Manager', department: 'Legal', status: 'Monitoring', mitigationPlan: 'Regular policy updates, legal consultation', identifiedDate: '2024-09-05', reviewDate: '2025-03-01' },
    { id: 'RSK-005', title: 'Key Personnel Departure', category: 'Operational', description: 'Risk of losing critical employees', likelihood: 'Low', impact: 'High', riskScore: 8, owner: 'HR Director', department: 'HR', status: 'Monitoring', mitigationPlan: 'Succession planning, retention programs', identifiedDate: '2024-12-01', reviewDate: '2025-02-28' },
    { id: 'RSK-006', title: 'Market Competition', category: 'Strategic', description: 'Increasing competition affecting market share', likelihood: 'High', impact: 'Medium', riskScore: 12, owner: 'Sales Director', department: 'Sales', status: 'Open', mitigationPlan: 'Product differentiation, customer retention', identifiedDate: '2025-01-05', reviewDate: '2025-02-05' },
    { id: 'RSK-007', title: 'Quality Control Failure', category: 'Operational', description: 'Product quality issues leading to recalls', likelihood: 'Low', impact: 'Critical', riskScore: 10, owner: 'Quality Manager', department: 'Quality', status: 'Monitoring', mitigationPlan: 'Enhanced QC processes, regular audits', identifiedDate: '2024-07-15', reviewDate: '2025-01-31' },
    { id: 'RSK-008', title: 'Negative Media Coverage', category: 'Reputational', description: 'Risk of brand damage from negative publicity', likelihood: 'Low', impact: 'High', riskScore: 8, owner: 'Marketing Head', department: 'Marketing', status: 'Accepted', mitigationPlan: 'PR crisis management plan, media monitoring', identifiedDate: '2024-06-20', reviewDate: '2025-06-20' },
  ];

  const categories = ['Operational', 'Financial', 'Strategic', 'Compliance', 'Technology', 'Reputational'];

  const filteredRisks = risks.filter((risk) => {
    const matchesSearch = risk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || risk.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || risk.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.riskScore >= 15).length,
    high: risks.filter(r => r.riskScore >= 10 && r.riskScore < 15).length,
    mitigating: risks.filter(r => r.status === 'Mitigating').length,
    avgScore: (risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length).toFixed(1)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Mitigating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Monitoring: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Accepted: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getRiskScoreBadge = (score: number) => {
    let color = 'bg-green-100 text-green-700';
    if (score >= 15) color = 'bg-red-100 text-red-700';
    else if (score >= 10) color = 'bg-orange-100 text-orange-700';
    else if (score >= 6) color = 'bg-yellow-100 text-yellow-700';
    return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color}`}>{score}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      Operational: 'bg-blue-100 text-blue-700',
      Financial: 'bg-green-100 text-green-700',
      Strategic: 'bg-purple-100 text-purple-700',
      Compliance: 'bg-orange-100 text-orange-700',
      Technology: 'bg-cyan-100 text-cyan-700',
      Reputational: 'bg-pink-100 text-pink-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[category]}`}>{category}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-600" />Risk Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Identify, assess, and mitigate business risks</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" />Add Risk
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Risks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">High</p>
              <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mitigating</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.mitigating}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Score</p>
              <p className="text-2xl font-bold text-blue-600">{stats.avgScore}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search risks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="Mitigating">Mitigating</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Risk</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Likelihood</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Impact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Review Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRisks.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-center">{getRiskScoreBadge(risk.riskScore)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{risk.title}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">{risk.description}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getCategoryBadge(risk.category)}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{risk.likelihood}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{risk.impact}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{risk.owner}</div>
                    <div className="text-xs text-gray-500">{risk.department}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(risk.reviewDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(risk.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
