'use client';

import React from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  Award, 
  Clock, 
  Heart, 
  TrendingUp, 
  DollarSign,
  BookOpen,
  Lock,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Globe
} from 'lucide-react';

export default function HRPolicyPage() {
  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction',
      icon: <FileText className="w-5 h-5" />,
      content: `Welcome to the HR Policy Manual. This document outlines standardized, internationally aligned policies that ensure fairness, transparency, and compliance within the organization. It applies to all employees, departments, and management teams.`
    },
    {
      id: 'code-of-conduct',
      title: '2. Code of Conduct & Ethics',
      icon: <Shield className="w-5 h-5" />,
      content: [
        'Employees must maintain professionalism, integrity, and respect at all times.',
        'Zero tolerance for harassment, discrimination, or bullying.',
        'Confidential company information must be protected.',
        'Conflicts of interest must be disclosed to HR.'
      ]
    },
    {
      id: 'recruitment',
      title: '3. Recruitment & Hiring Policy',
      icon: <Users className="w-5 h-5" />,
      content: [
        'All job openings must follow a standardized hiring workflow.',
        'Equal Opportunity Employment (EOE) principles apply to all candidates.',
        'Background verification is mandatory.',
        'No form of discrimination based on gender, age, race, religion, disability, nationality, or orientation.'
      ]
    },
    {
      id: 'onboarding',
      title: '4. Employee Onboarding & Orientation',
      icon: <Briefcase className="w-5 h-5" />,
      content: [
        'New hires must complete the onboarding checklist.',
        'Mandatory orientation sessions include:',
        '  • Company culture & values',
        '  • Policies overview',
        '  • IT & security guidelines',
        'HR must collect all KYC, identity, and compliance documents.'
      ]
    },
    {
      id: 'attendance',
      title: '5. Attendance & Working Hours',
      icon: <Clock className="w-5 h-5" />,
      content: [
        'Standard working hours: 8 hours per day / 40 hours per week (subject to regional laws).',
        'Attendance must be recorded via the official system.',
        'Remote work or hybrid arrangements require HR approval.',
        'Overtime requires written approval from reporting manager.'
      ]
    },
    {
      id: 'leave',
      title: '6. Leave Policy',
      icon: <Heart className="w-5 h-5" />,
      subsections: [
        {
          title: '6.1 Annual Leave',
          points: [
            'Entitlement follows local labor regulations.',
            'Leave must be applied through the HRMS at least 7 days in advance.'
          ]
        },
        {
          title: '6.2 Sick Leave',
          points: ['Medical certificate required for extended sick leave.']
        },
        {
          title: '6.3 Maternity/Paternity Leave',
          points: [
            'Granted as per international and regional legal standards.',
            'Job protection during maternity leave is ensured.'
          ]
        },
        {
          title: '6.4 Emergency Leave',
          points: ['Allowed for immediate family emergencies.']
        }
      ]
    },
    {
      id: 'performance',
      title: '7. Performance Management',
      icon: <TrendingUp className="w-5 h-5" />,
      content: [
        'Annual performance appraisal cycle.',
        'KPI-driven evaluation.',
        '360° feedback where applicable.',
        'Underperformance results in:',
        '  • Coaching',
        '  • Performance Improvement Plan (PIP)',
        '  • Review meetings'
      ]
    },
    {
      id: 'compensation',
      title: '8. Salary, Compensation & Payroll',
      icon: <DollarSign className="w-5 h-5" />,
      content: [
        'Transparent compensation structure.',
        'Payroll is processed monthly.',
        'Deductions must comply with local tax & labor rules.',
        'All payments must be documented.'
      ]
    },
    {
      id: 'learning',
      title: '9. Learning & Development (L&D)',
      icon: <BookOpen className="w-5 h-5" />,
      content: [
        'Mandatory compliance training for all employees.',
        'Skill-development programs.',
        'Leadership training for management roles.'
      ]
    },
    {
      id: 'health-safety',
      title: '10. Workplace Health & Safety',
      icon: <Award className="w-5 h-5" />,
      content: [
        'The company ensures a safe and hazard-free work environment.',
        'Fire drill, emergency plan, and first-aid availability.',
        'Employees must follow occupational safety guidelines.'
      ]
    },
    {
      id: 'it-security',
      title: '11. IT & Data Security Policy',
      icon: <Lock className="w-5 h-5" />,
      content: [
        'Employees must use official company systems only.',
        'Strong password policy applies to all accounts.',
        'Unauthorized access or data sharing is prohibited.',
        'All devices must follow cybersecurity protocols.'
      ]
    },
    {
      id: 'anti-harassment',
      title: '12. Anti-Harassment & Anti-Discrimination Policy',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: [
        'Zero-tolerance policy.',
        'Complaints handled confidentially.',
        'Investigations follow international HR standards.',
        'Retaliation against complainants is prohibited.'
      ]
    },
    {
      id: 'disciplinary',
      title: '13. Disciplinary Policy',
      icon: <Shield className="w-5 h-5" />,
      content: [
        'Dedicated process for misconduct:',
        '  1. Warning (verbal or written)',
        '  2. Investigation',
        '  3. Disciplinary action',
        '  4. Termination (if required)',
        'Documentation mandatory at each stage.'
      ]
    },
    {
      id: 'exit',
      title: '14. Exit, Resignation & Termination Policy',
      icon: <Briefcase className="w-5 h-5" />,
      content: [
        'Minimum notice period applies (as per contract/law).',
        'Exit interviews are mandatory.',
        'All company property must be returned.',
        'Final settlement processed within standard timelines.'
      ]
    },
    {
      id: 'confidentiality',
      title: '15. Confidentiality & Non-Disclosure',
      icon: <Lock className="w-5 h-5" />,
      content: [
        'NDA applies to all employees.',
        'Confidential data must not be shared externally.',
        'Obligation continues after employment ends.'
      ]
    },
    {
      id: 'compliance',
      title: '16. Global Compliance & Legal Standards',
      icon: <Globe className="w-5 h-5" />,
      content: [
        'This policy adheres to international HR frameworks including:',
        '  • ISO 30400 HR Standards',
        '  • GDPR (where applicable)',
        '  • International Labor Organization (ILO) guidelines'
      ]
    },
    {
      id: 'review',
      title: '17. Policy Review',
      icon: <CheckCircle2 className="w-5 h-5" />,
      content: [
        'Policies are reviewed annually by HR.',
        'Any updates will be communicated to all employees.'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">HR Policy Manual</h1>
              <p className="text-blue-100 text-lg">International Standard</p>
            </div>
          </div>
          <p className="text-blue-50 max-w-3xl">
            Comprehensive guidelines ensuring fairness, transparency, and compliance across all departments and teams.
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-4 overflow-x-auto">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Quick Links:
            </span>
            {sections.slice(0, 6).map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-md transition-colors whitespace-nowrap"
              >
                {section.title.split('.')[1]?.trim() || section.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {section.title}
                  </h2>
                </div>
              </div>

              <div className="px-6 py-5">
                {typeof section.content === 'string' ? (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {section.content}
                  </p>
                ) : section.content ? (
                  <ul className="space-y-2">
                    {section.content.map((item, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-3 text-gray-700 dark:text-gray-300 ${
                          item.startsWith(' ') ? 'ml-6' : ''
                        }`}
                      >
                        {!item.startsWith(' ') && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : section.subsections ? (
                  <div className="space-y-5">
                    {section.subsections.map((subsection, subIdx) => (
                      <div key={subIdx} className="pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {subsection.title}
                        </h3>
                        <ul className="space-y-2">
                          {subsection.points.map((point, pointIdx) => (
                            <li key={pointIdx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Need Additional Policies?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                This manual can be extended with additional sections including:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Travel & Expense Policy
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Grievance Redressal Mechanism
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Probation Period Rules
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Employee Benefits & Perks
                </li>
              </ul>
              <div className="mt-4">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Contact HR for Clarifications
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Last Updated: November 15, 2025 • Version 1.0</p>
          <p className="mt-1">© {new Date().getFullYear()} BISMAN ERP - All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
