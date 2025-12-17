'use client';

/**
 * 🎯 BISMAN ERP – Support Playbooks
 * 
 * Provides internal support staff with clear, repeatable procedures
 * for handling common support scenarios.
 * 
 * Access: BISMAN Staff Roles + ENTERPRISE_ADMIN
 * Management: ENTERPRISE_ADMIN only
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Users,
  CreditCard,
  Lock,
  Headphones,
  ClipboardList,
  Eye,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  Info,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface PlaybookStep {
  step: number;
  action: string;
  details?: string;
  auditRequired?: boolean;
}

interface PlaybookRule {
  type: 'do' | 'dont';
  text: string;
}

interface Playbook {
  id: string;
  title: string;
  category: 'access' | 'billing' | 'permissions' | 'support' | 'security';
  situation: string;
  steps: PlaybookStep[];
  rules: PlaybookRule[];
  relatedLinks: {
    label: string;
    description: string;
  }[];
  auditNotes: string[];
  lastUpdated: string;
}

// ============================================
// PLAYBOOK DATA
// ============================================

const PLAYBOOKS: Playbook[] = [
  {
    id: 'client-access-issue',
    title: 'Client Access Issue',
    category: 'access',
    situation: 'A customer reports they cannot log in or access their account. They may see error messages like "Access Denied" or "Invalid Credentials".',
    steps: [
      {
        step: 1,
        action: 'Verify the customer\'s identity',
        details: 'Ask for their registered email address and company name. Cross-check with our records before proceeding.',
        auditRequired: true,
      },
      {
        step: 2,
        action: 'Check the account status',
        details: 'Look up the customer in the system. Verify their account is active and not suspended or locked.',
        auditRequired: true,
      },
      {
        step: 3,
        action: 'Review recent login attempts',
        details: 'Check the audit logs for failed login attempts. Look for patterns like wrong password, IP blocks, or expired sessions.',
        auditRequired: false,
      },
      {
        step: 4,
        action: 'Identify the root cause',
        details: 'Common causes: wrong password, account locked after too many attempts, browser cache issues, or expired subscription.',
        auditRequired: false,
      },
      {
        step: 5,
        action: 'Apply the appropriate fix',
        details: 'Reset password if needed, unlock account if locked, or guide customer to clear browser cache.',
        auditRequired: true,
      },
      {
        step: 6,
        action: 'Confirm access is restored',
        details: 'Ask the customer to try logging in again while you\'re still on the call/chat.',
        auditRequired: true,
      },
      {
        step: 7,
        action: 'Document the resolution',
        details: 'Log what the issue was and how it was resolved for future reference.',
        auditRequired: true,
      },
    ],
    rules: [
      { type: 'do', text: 'Always verify customer identity before making any changes' },
      { type: 'do', text: 'Document every action you take in the support ticket' },
      { type: 'do', text: 'Stay on the line until access is confirmed restored' },
      { type: 'dont', text: 'Never share passwords verbally or via email' },
      { type: 'dont', text: 'Never access customer data without their explicit request' },
      { type: 'dont', text: 'Never skip the identity verification step, even for "urgent" requests' },
    ],
    relatedLinks: [
      { label: 'Support Sessions', description: 'Start a time-limited support session' },
      { label: 'Audit Logs', description: 'Review customer login history' },
    ],
    auditNotes: [
      'Every password reset must be logged with reason',
      'Account unlocks must include the lockout cause',
      'Customer identity verification must be recorded',
    ],
    lastUpdated: '2024-12-15',
  },
  {
    id: 'billing-dispute',
    title: 'Billing Dispute',
    category: 'billing',
    situation: 'A customer disputes a charge, claims they were overcharged, or doesn\'t recognize a transaction on their statement.',
    steps: [
      {
        step: 1,
        action: 'Listen and acknowledge',
        details: 'Let the customer explain their concern fully. Take notes and show empathy.',
        auditRequired: false,
      },
      {
        step: 2,
        action: 'Verify customer identity',
        details: 'Confirm their registered email and billing contact before discussing financial details.',
        auditRequired: true,
      },
      {
        step: 3,
        action: 'Pull up the transaction history',
        details: 'Review all charges for the period in question. Look for the specific transaction they\'re disputing.',
        auditRequired: true,
      },
      {
        step: 4,
        action: 'Compare against their subscription',
        details: 'Check what plan they\'re on, any add-ons, and whether charges match their agreement.',
        auditRequired: false,
      },
      {
        step: 5,
        action: 'Identify if error occurred',
        details: 'Determine if this is a legitimate overcharge, double charge, or a misunderstanding about pricing.',
        auditRequired: false,
      },
      {
        step: 6,
        action: 'Escalate to Finance if needed',
        details: 'If a refund or credit is warranted, escalate to the Finance team with all documentation.',
        auditRequired: true,
      },
      {
        step: 7,
        action: 'Communicate resolution timeline',
        details: 'Tell the customer when they can expect a resolution. Follow up as promised.',
        auditRequired: true,
      },
    ],
    rules: [
      { type: 'do', text: 'Always pull up actual transaction data before responding' },
      { type: 'do', text: 'Escalate to Finance for any refund over $100' },
      { type: 'do', text: 'Provide a clear timeline and follow up' },
      { type: 'dont', text: 'Never promise a refund without Finance approval' },
      { type: 'dont', text: 'Never share other customers\' billing information' },
      { type: 'dont', text: 'Never modify billing records directly — always use proper channels' },
    ],
    relatedLinks: [
      { label: 'Audit Logs', description: 'View payment transaction history' },
      { label: 'Support Sessions', description: 'Access customer billing details' },
    ],
    auditNotes: [
      'All billing inquiries must be logged with amount in question',
      'Refund requests must include approval chain',
      'Resolution outcome must be documented',
    ],
    lastUpdated: '2024-12-10',
  },
  {
    id: 'permission-misconfiguration',
    title: 'Permission Misconfiguration',
    category: 'permissions',
    situation: 'A user reports they can\'t access a feature they should have, or they can see something they shouldn\'t. This indicates their permissions may be set incorrectly.',
    steps: [
      {
        step: 1,
        action: 'Understand the expected behavior',
        details: 'Ask what the user is trying to do and what they expect to see vs. what actually happens.',
        auditRequired: false,
      },
      {
        step: 2,
        action: 'Verify with the customer admin',
        details: 'Contact the customer\'s administrator to confirm what access the user should have.',
        auditRequired: true,
      },
      {
        step: 3,
        action: 'Review current permissions',
        details: 'Look up the user\'s role and assigned permissions in the system.',
        auditRequired: true,
      },
      {
        step: 4,
        action: 'Compare against role requirements',
        details: 'Check what permissions are needed for the feature they\'re trying to access.',
        auditRequired: false,
      },
      {
        step: 5,
        action: 'Identify the gap',
        details: 'Determine exactly which permission is missing or incorrectly assigned.',
        auditRequired: false,
      },
      {
        step: 6,
        action: 'Guide admin to make changes',
        details: 'Permission changes must be made by the customer\'s administrator, not by support. Walk them through it.',
        auditRequired: true,
      },
      {
        step: 7,
        action: 'Verify the fix worked',
        details: 'Have the user test again and confirm the issue is resolved.',
        auditRequired: true,
      },
    ],
    rules: [
      { type: 'do', text: 'Always get admin approval before any permission discussion' },
      { type: 'do', text: 'Explain why certain permissions exist (without exposing system details)' },
      { type: 'do', text: 'Document the before/after permission state' },
      { type: 'dont', text: 'Never change customer permissions directly' },
      { type: 'dont', text: 'Never grant admin-level access to resolve a simple permission issue' },
      { type: 'dont', text: 'Never discuss another user\'s permissions without admin consent' },
    ],
    relatedLinks: [
      { label: 'Audit Logs', description: 'View permission change history' },
      { label: 'Support Sessions', description: 'Review user configuration' },
    ],
    auditNotes: [
      'All permission reviews must be logged',
      'Admin authorization must be recorded before any changes',
      'Before and after states must be documented',
    ],
    lastUpdated: '2024-12-12',
  },
  {
    id: 'support-session-initiation',
    title: 'Support Session Initiation',
    category: 'support',
    situation: 'You need to access a customer\'s account to investigate or resolve an issue. This requires starting a formal support session.',
    steps: [
      {
        step: 1,
        action: 'Confirm the support request',
        details: 'Ensure you have a valid support ticket and the customer has explicitly requested assistance.',
        auditRequired: true,
      },
      {
        step: 2,
        action: 'Explain what you\'ll be doing',
        details: 'Tell the customer exactly what you need to access and why. Get their verbal or written consent.',
        auditRequired: true,
      },
      {
        step: 3,
        action: 'Start the support session',
        details: 'Use the Support Sessions page to initiate a time-limited session. Enter the reason clearly.',
        auditRequired: true,
      },
      {
        step: 4,
        action: 'Perform only necessary actions',
        details: 'Access only the data relevant to the issue. Don\'t browse unrelated areas.',
        auditRequired: false,
      },
      {
        step: 5,
        action: 'Document what you viewed/changed',
        details: 'Keep notes of every screen you accessed and any changes you made.',
        auditRequired: true,
      },
      {
        step: 6,
        action: 'End the session promptly',
        details: 'As soon as the issue is resolved, end the support session. Don\'t leave it open.',
        auditRequired: true,
      },
      {
        step: 7,
        action: 'Update the support ticket',
        details: 'Document what you found and what was done in the support ticket for future reference.',
        auditRequired: true,
      },
    ],
    rules: [
      { type: 'do', text: 'Always explain what you\'re doing before accessing their account' },
      { type: 'do', text: 'Keep sessions as short as possible' },
      { type: 'do', text: 'End the session immediately when done' },
      { type: 'dont', text: 'Never start a session without a valid support ticket' },
      { type: 'dont', text: 'Never access data unrelated to the support request' },
      { type: 'dont', text: 'Never leave a session open and walk away' },
    ],
    relatedLinks: [
      { label: 'Support Sessions', description: 'Start and manage support sessions' },
      { label: 'Audit Logs', description: 'All session activity is logged here' },
    ],
    auditNotes: [
      'Session start/end times are automatically logged',
      'Every action during a session is recorded',
      'Customer can see all support activity in their audit logs',
    ],
    lastUpdated: '2024-12-14',
  },
  {
    id: 'security-incident-response',
    title: 'Security Incident Response',
    category: 'security',
    situation: 'A customer reports suspicious activity, unauthorized access, or believes their account may have been compromised.',
    steps: [
      {
        step: 1,
        action: 'Treat it as urgent',
        details: 'Security incidents take priority. Acknowledge immediately and assure the customer you\'re taking action.',
        auditRequired: true,
      },
      {
        step: 2,
        action: 'Gather incident details',
        details: 'Ask when they noticed the issue, what suspicious activity they saw, and if they\'ve made any changes since.',
        auditRequired: true,
      },
      {
        step: 3,
        action: 'Secure the account immediately',
        details: 'If there\'s evidence of compromise, recommend the customer change their password and log out all sessions.',
        auditRequired: true,
      },
      {
        step: 4,
        action: 'Review audit logs',
        details: 'Check login history, IP addresses, and recent actions for anything suspicious.',
        auditRequired: true,
      },
      {
        step: 5,
        action: 'Escalate to Security team',
        details: 'All security incidents must be escalated. Provide the ticket number and all gathered information.',
        auditRequired: true,
      },
      {
        step: 6,
        action: 'Keep customer informed',
        details: 'Let them know it\'s been escalated and when they\'ll hear back. Don\'t speculate about causes.',
        auditRequired: false,
      },
      {
        step: 7,
        action: 'Follow up after resolution',
        details: 'Once Security team resolves, ensure the customer is informed and any preventive measures are explained.',
        auditRequired: true,
      },
    ],
    rules: [
      { type: 'do', text: 'Always escalate security incidents — never try to handle alone' },
      { type: 'do', text: 'Document everything with timestamps' },
      { type: 'do', text: 'Recommend password change as first step' },
      { type: 'dont', text: 'Never downplay a security concern' },
      { type: 'dont', text: 'Never share specific security vulnerabilities with customers' },
      { type: 'dont', text: 'Never delay escalation, even if it seems minor' },
    ],
    relatedLinks: [
      { label: 'Audit Logs', description: 'Review all account activity' },
      { label: 'Support Sessions', description: 'Investigate with proper access' },
    ],
    auditNotes: [
      'All security incidents must be logged with severity level',
      'Escalation timestamp must be recorded',
      'Resolution and preventive measures must be documented',
    ],
    lastUpdated: '2024-12-13',
  },
  {
    id: 'data-export-request',
    title: 'Data Export Request',
    category: 'access',
    situation: 'A customer requests an export of their data, either for their own records or as part of leaving the platform.',
    steps: [
      {
        step: 1,
        action: 'Verify the requester\'s authority',
        details: 'Data exports can only be requested by account administrators. Verify the person\'s role.',
        auditRequired: true,
      },
      {
        step: 2,
        action: 'Understand the scope',
        details: 'Ask what data they need: all data, specific modules, or a date range.',
        auditRequired: true,
      },
      {
        step: 3,
        action: 'Explain available formats',
        details: 'We provide exports in standard formats (CSV, Excel). Explain what\'s included in each.',
        auditRequired: false,
      },
      {
        step: 4,
        action: 'Create the export request',
        details: 'Log the request in the system with all specifications and the requester\'s details.',
        auditRequired: true,
      },
      {
        step: 5,
        action: 'Set expectations for timing',
        details: 'Large exports may take time. Provide a realistic timeline.',
        auditRequired: false,
      },
      {
        step: 6,
        action: 'Deliver securely',
        details: 'Never send data via regular email. Use secure download links or encrypted transfer.',
        auditRequired: true,
      },
      {
        step: 7,
        action: 'Confirm receipt',
        details: 'Follow up to ensure they received the data successfully.',
        auditRequired: true,
      },
    ],
    rules: [
      { type: 'do', text: 'Always verify admin authority before processing' },
      { type: 'do', text: 'Use secure delivery methods only' },
      { type: 'do', text: 'Log every data export with full details' },
      { type: 'dont', text: 'Never email data files as attachments' },
      { type: 'dont', text: 'Never export data for anyone other than an authorized admin' },
      { type: 'dont', text: 'Never skip the verification step for "trusted" customers' },
    ],
    relatedLinks: [
      { label: 'Audit Logs', description: 'All exports are logged' },
      { label: 'Support Sessions', description: 'Access customer data for export' },
    ],
    auditNotes: [
      'All export requests must be logged with requester details',
      'Scope of export must be documented',
      'Delivery confirmation must be recorded',
    ],
    lastUpdated: '2024-12-11',
  },
];

// ============================================
// CATEGORY CONFIG
// ============================================

const CATEGORIES = {
  access: { label: 'Access Issues', icon: Lock, color: 'blue' },
  billing: { label: 'Billing', icon: CreditCard, color: 'green' },
  permissions: { label: 'Permissions', icon: Shield, color: 'purple' },
  support: { label: 'Support Sessions', icon: Headphones, color: 'orange' },
  security: { label: 'Security', icon: AlertTriangle, color: 'red' },
};

// ============================================
// COMPONENTS
// ============================================

interface PlaybookCardProps {
  playbook: Playbook;
  isExpanded: boolean;
  onToggle: () => void;
}

function PlaybookCard({ playbook, isExpanded, onToggle }: PlaybookCardProps) {
  const category = CATEGORIES[playbook.category];
  const CategoryIcon = category.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg bg-${category.color}-100 dark:bg-${category.color}-900/30`}>
            <CategoryIcon className={`w-5 h-5 text-${category.color}-600 dark:text-${category.color}-400`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {playbook.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {category.label} • Updated {playbook.lastUpdated}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-100 dark:border-gray-700">
          {/* Situation */}
          <div className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Info className="w-4 h-4" />
              Situation
            </div>
            <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              {playbook.situation}
            </p>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <ClipboardList className="w-4 h-4" />
              Step-by-Step Actions
            </div>
            <div className="space-y-3">
              {playbook.steps.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {step.step}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {step.action}
                      </p>
                      {step.auditRequired && (
                        <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-full">
                          Audit Required
                        </span>
                      )}
                    </div>
                    {step.details && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {step.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Do / Don't Rules */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 mb-3">
                <CheckCircle className="w-4 h-4" />
                Do
              </div>
              <div className="space-y-2">
                {playbook.rules.filter(r => r.type === 'do').map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-green-800 dark:text-green-300">
                      {rule.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 mb-3">
                <XCircle className="w-4 h-4" />
                Do Not
              </div>
              <div className="space-y-2">
                {playbook.rules.filter(r => r.type === 'dont').map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-800 dark:text-red-300">
                      {rule.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Notes */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-3">
              <FileText className="w-4 h-4" />
              Required Audit Logging
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <ul className="space-y-2">
                {playbook.auditNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Related Links */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Eye className="w-4 h-4" />
              Related Tools
            </div>
            <div className="flex flex-wrap gap-3">
              {playbook.relatedLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <span className="font-medium text-blue-700 dark:text-blue-400">
                    {link.label}
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-500">
                    — {link.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function SupportPlaybooksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);

  // Filter playbooks
  const filteredPlaybooks = PLAYBOOKS.filter(playbook => {
    const matchesSearch = searchQuery === '' || 
      playbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playbook.situation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === null || playbook.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
              <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Support Playbooks
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Step-by-step guides for handling common support scenarios
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search playbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Playbooks List */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {filteredPlaybooks.map((playbook) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              isExpanded={expandedPlaybook === playbook.id}
              onToggle={() => setExpandedPlaybook(
                expandedPlaybook === playbook.id ? null : playbook.id
              )}
            />
          ))}

          {filteredPlaybooks.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No playbooks found matching your search.
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Need a new playbook?</p>
              <p>
                If you encounter a situation not covered here, document it and escalate to your team lead. 
                ENTERPRISE_ADMIN can create new playbooks based on recurring scenarios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
