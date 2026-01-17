'use client';

import React, { useState } from 'react';
import { 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Settings,
  Clock,
  Zap
} from 'lucide-react';

interface ReconciliationStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  itemsProcessed: number;
  totalItems: number;
}

export default function BankReconciliationExecutePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<ReconciliationStep[]>([
    { id: 1, name: 'Load Bank Statement', description: 'Import and parse bank statement data', status: 'pending', progress: 0, itemsProcessed: 0, totalItems: 245 },
    { id: 2, name: 'Match by Reference', description: 'Match transactions using reference numbers', status: 'pending', progress: 0, itemsProcessed: 0, totalItems: 245 },
    { id: 3, name: 'Match by Amount & Date', description: 'Match remaining items by amount and date proximity', status: 'pending', progress: 0, itemsProcessed: 0, totalItems: 50 },
    { id: 4, name: 'Identify Discrepancies', description: 'Flag unmatched transactions for review', status: 'pending', progress: 0, itemsProcessed: 0, totalItems: 15 },
    { id: 5, name: 'Generate Report', description: 'Create reconciliation summary report', status: 'pending', progress: 0, itemsProcessed: 0, totalItems: 1 },
  ]);

  const [settings, setSettings] = useState({
    autoMatchThreshold: 0.95,
    dateToleranceDays: 3,
    amountTolerancePercent: 0.01,
    includePartialMatches: true,
  });

  const startReconciliation = () => {
    setIsRunning(true);
    // Simulate reconciliation process
    let currentStep = 0;
    const interval = setInterval(() => {
      setSteps(prev => {
        const updated = [...prev];
        if (currentStep < updated.length) {
          if (updated[currentStep].progress < 100) {
            updated[currentStep].status = 'running';
            updated[currentStep].progress += 20;
            updated[currentStep].itemsProcessed = Math.floor((updated[currentStep].progress / 100) * updated[currentStep].totalItems);
          } else {
            updated[currentStep].status = 'completed';
            currentStep++;
          }
        } else {
          clearInterval(interval);
          setIsRunning(false);
        }
        return updated;
      });
    }, 500);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'running': return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="w-6 h-6 text-red-500" />;
      default: return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const overallProgress = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Zap className="w-8 h-8 text-blue-600" />
          Execute Bank Reconciliation
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Automated matching of bank transactions with accounting records
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Process Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reconciliation Progress</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{completedSteps}/{steps.length} steps completed</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {index < steps.length - 1 && (
                    <div className="absolute left-3 top-10 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 bg-white dark:bg-gray-800">
                      {getStepIcon(step.status)}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white">{step.name}</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {step.itemsProcessed}/{step.totalItems}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.description}</p>
                      {step.status === 'running' && (
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={startReconciliation}
              disabled={isRunning}
              className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold transition-all ${
                isRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6" />
                  Start Reconciliation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              Matching Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Match Confidence Threshold
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1"
                  step="0.01"
                  value={settings.autoMatchThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoMatchThreshold: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>80%</span>
                  <span className="font-medium text-blue-600">{(settings.autoMatchThreshold * 100).toFixed(0)}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Tolerance (Days)
                </label>
                <select
                  value={settings.dateToleranceDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, dateToleranceDays: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value={1}>1 day</option>
                  <option value={2}>2 days</option>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Tolerance
                </label>
                <select
                  value={settings.amountTolerancePercent}
                  onChange={(e) => setSettings(prev => ({ ...prev, amountTolerancePercent: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value={0}>Exact match only</option>
                  <option value={0.01}>± 1%</option>
                  <option value={0.02}>± 2%</option>
                  <option value={0.05}>± 5%</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include Partial Matches
                </label>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, includePartialMatches: !prev.includePartialMatches }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.includePartialMatches ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.includePartialMatches ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last Reconciliation</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Date</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Jan 15, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Transactions</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Auto-matched</span>
                <span className="text-sm font-medium text-green-600">218 (93%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Manual review</span>
                <span className="text-sm font-medium text-yellow-600">16 (7%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
