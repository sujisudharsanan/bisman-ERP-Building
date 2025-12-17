'use client';

/**
 * 🛡️ BISMAN ERP – Trust & Security Page
 * 
 * Customer-facing page explaining BISMAN's security practices
 * in simple, non-technical language.
 * 
 * Audience: Non-technical customers evaluating trust
 * Purpose: Build confidence without exposing internals
 */

import React from 'react';
import { 
  Shield, 
  Lock, 
  Users, 
  Eye, 
  FileText, 
  Clock,
  CheckCircle,
  Building2,
  UserCheck,
  HeadphonesIcon,
  ScrollText,
  ShieldCheck
} from 'lucide-react';

// ============================================
// SECTION COMPONENTS
// ============================================

interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SecurityCard({ icon, title, children }: SecurityCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {title}
          </h3>
          <div className="text-gray-600 dark:text-gray-300 space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BulletPointProps {
  children: React.ReactNode;
}

function BulletPoint({ children }: BulletPointProps) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function TrustSecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Trust & Security
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Your business data is precious. Here&apos;s how BISMAN ERP keeps it safe, 
            private, and under your control.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Introduction */}
        <div className="text-center mb-12">
          <p className="text-lg text-gray-600 dark:text-gray-300">
            We understand that trusting a software with your business operations is a big decision. 
            That&apos;s why we&apos;ve built BISMAN ERP with security and privacy at its core.
          </p>
        </div>

        {/* Security Features Grid */}
        <div className="space-y-6">

          {/* Section: Your Data is Isolated */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <Lock className="w-7 h-7 text-blue-600" />
              Your Data is Completely Separate
            </h2>
            
            <div className="grid gap-6">
              <SecurityCard 
                icon={<Building2 className="w-6 h-6" />}
                title="Business Isolation"
              >
                <p>
                  Each business on BISMAN ERP operates in its own protected space. 
                  Your data never mixes with data from other businesses.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Your transactions stay yours</BulletPoint>
                  <BulletPoint>Your customer information remains private</BulletPoint>
                  <BulletPoint>Your financial records are accessible only to you</BulletPoint>
                </div>
              </SecurityCard>

              <SecurityCard 
                icon={<Users className="w-6 h-6" />}
                title="Customer Privacy"
              >
                <p>
                  No customer can see another customer&apos;s data. Period. 
                  Even if two businesses operate in the same industry, 
                  their information is completely invisible to each other.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Your competitors cannot see your data</BulletPoint>
                  <BulletPoint>Other users cannot browse your records</BulletPoint>
                  <BulletPoint>Search results only show your own data</BulletPoint>
                </div>
              </SecurityCard>
            </div>
          </div>

          {/* Section: Access Control */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <UserCheck className="w-7 h-7 text-blue-600" />
              People Only See What They Need
            </h2>
            
            <div className="grid gap-6">
              <SecurityCard 
                icon={<Eye className="w-6 h-6" />}
                title="Controlled Access"
              >
                <p>
                  Every user in your organization has a role. Each role determines 
                  exactly what that person can see and do. An accountant sees 
                  financial data, a store manager sees inventory, and so on.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Staff only access what their job requires</BulletPoint>
                  <BulletPoint>Managers can oversee their teams</BulletPoint>
                  <BulletPoint>Administrators control permissions for everyone</BulletPoint>
                </div>
              </SecurityCard>

              <SecurityCard 
                icon={<Lock className="w-6 h-6" />}
                title="Protected Actions"
              >
                <p>
                  Sensitive actions like deleting records, changing financial data, 
                  or modifying user permissions require special authorization. 
                  Not everyone can perform these actions.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Critical operations require proper permissions</BulletPoint>
                  <BulletPoint>Unauthorized attempts are blocked automatically</BulletPoint>
                  <BulletPoint>You decide who can do what in your organization</BulletPoint>
                </div>
              </SecurityCard>
            </div>
          </div>

          {/* Section: Audit Logging */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <ScrollText className="w-7 h-7 text-blue-600" />
              Everything is Recorded
            </h2>
            
            <div className="grid gap-6">
              <SecurityCard 
                icon={<FileText className="w-6 h-6" />}
                title="Complete Activity Log"
              >
                <p>
                  Every important action in your account is recorded: who did what, 
                  when they did it, and what changed. This includes logins, 
                  financial transactions, record changes, and more.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Know who logged in and when</BulletPoint>
                  <BulletPoint>Track every financial transaction</BulletPoint>
                  <BulletPoint>See history of changes to any record</BulletPoint>
                </div>
              </SecurityCard>

              <SecurityCard 
                icon={<ShieldCheck className="w-6 h-6" />}
                title="Tamper-Proof Records"
              >
                <p>
                  Once an action is logged, it cannot be changed or deleted — 
                  not by your staff, not by our staff, not by anyone. 
                  This ensures you always have an accurate history.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Logs cannot be edited after the fact</BulletPoint>
                  <BulletPoint>Ideal for audits and compliance</BulletPoint>
                  <BulletPoint>Reliable evidence if questions arise</BulletPoint>
                </div>
              </SecurityCard>
            </div>
          </div>

          {/* Section: Support Access */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <HeadphonesIcon className="w-7 h-7 text-blue-600" />
              How Our Support Team Works
            </h2>
            
            <div className="grid gap-6">
              <SecurityCard 
                icon={<Clock className="w-6 h-6" />}
                title="Time-Limited Access"
              >
                <p>
                  When you need help, our support team may need to look at your 
                  account to assist you. But this access is never permanent.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Support access is granted only when you request help</BulletPoint>
                  <BulletPoint>Access expires automatically after a short time</BulletPoint>
                  <BulletPoint>Once the session ends, access is revoked completely</BulletPoint>
                </div>
              </SecurityCard>

              <SecurityCard 
                icon={<Eye className="w-6 h-6" />}
                title="No Silent Access"
              >
                <p>
                  Our support team cannot access your data secretly. 
                  Every action they take is recorded, and you can see it.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>All support actions appear in your activity log</BulletPoint>
                  <BulletPoint>You can see exactly what they viewed or changed</BulletPoint>
                  <BulletPoint>No hidden backdoors or silent monitoring</BulletPoint>
                </div>
              </SecurityCard>

              <SecurityCard 
                icon={<ScrollText className="w-6 h-6" />}
                title="Visible in Your Audit Trail"
              >
                <p>
                  Whenever a BISMAN support team member accesses your account, 
                  it shows up in your audit logs with their name and actions.
                </p>
                <div className="mt-3 space-y-2">
                  <BulletPoint>Support sessions are clearly labeled</BulletPoint>
                  <BulletPoint>You see the reason for access</BulletPoint>
                  <BulletPoint>Full transparency, no surprises</BulletPoint>
                </div>
              </SecurityCard>
            </div>
          </div>

        </div>

        {/* Trust Summary */}
        <div className="mt-12 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border border-green-200 dark:border-green-800">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Our Security Promise
            </h2>
            <div className="max-w-2xl mx-auto space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                At BISMAN, we believe your business data belongs to you and only you. 
                We&apos;ve built our system from the ground up with this principle in mind.
              </p>
              <p>
                We don&apos;t sell your data. We don&apos;t share it. We don&apos;t peek at it 
                unless you ask for help. And when we do help, you can see exactly what we did.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Have questions about our security practices? 
            Contact our team — we&apos;re happy to explain.
          </p>
        </div>

      </div>
    </div>
  );
}
