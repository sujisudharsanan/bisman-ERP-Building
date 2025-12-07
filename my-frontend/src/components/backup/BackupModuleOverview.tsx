'use client';

import React from 'react';
import {
  Shield,
  Clock,
  GitBranch,
  Cloud,
  Server,
  Lock,
  Users,
  Bell,
  Calendar,
  Database,
  CheckCircle,
  FileText,
  Layers,
  RefreshCw,
  HardDrive,
  Eye,
  Settings,
  Zap,
} from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - Backup & Restore Module Overview
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Enterprise-grade documentation component highlighting:
 * - Auto and manual backup support per client
 * - Git-aware backup tagging with commit history
 * - Multi-destination storage (S3, Azure, SFTP, custom nodes)
 * - Restore in sandbox or production with safety checks
 * - Full and partial restore capability
 * - Audit logs, backup health status, and alerts
 * - Backup schedule viewer and smart retention policies
 * - Role-based restore permissions
 * - Fully encrypted, multi-tenant aware
 * 
 * Tone: Corporate, Technical, Trustworthy
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, highlights }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-[#FEC925] transition-all duration-300 group">
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-xl bg-[#16325C]/5 group-hover:bg-[#FEC925]/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-[#16325C] mb-2">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
        <ul className="space-y-2">
          {highlights.map((highlight, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

interface StatBadgeProps {
  label: string;
  value: string;
}

const StatBadge: React.FC<StatBadgeProps> = ({ label, value }) => (
  <div className="text-center">
    <div className="text-3xl font-bold text-[#16325C]">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
);

export default function BackupModuleOverview() {
  const features: FeatureCardProps[] = [
    {
      icon: <Clock className="w-6 h-6 text-[#16325C]" />,
      title: 'Automated & Manual Backup Support',
      description: 'Configure scheduled backups per client or trigger on-demand backups with granular control over backup scope and frequency.',
      highlights: [
        'Per-client backup scheduling with custom intervals',
        'Full, incremental, config-only, and database-only modes',
        'Pre-deployment automatic backup triggers',
        'One-click manual backup with real-time progress',
      ],
    },
    {
      icon: <GitBranch className="w-6 h-6 text-[#16325C]" />,
      title: 'Git-Aware Backup Tagging',
      description: 'Every backup is tagged with the current Git commit hash and branch, enabling precise version tracking and deployment rollback.',
      highlights: [
        'Automatic commit hash and branch tagging',
        'Linked deployment history with restore points',
        'Pre and post-deploy backup snapshots',
        'Visual timeline of backup-commit correlation',
      ],
    },
    {
      icon: <Cloud className="w-6 h-6 text-[#16325C]" />,
      title: 'Multi-Destination Storage',
      description: 'Store backups across multiple storage providers simultaneously with intelligent failover and redundancy.',
      highlights: [
        'AWS S3, Azure Blob Storage, Google Cloud Storage',
        'SFTP/SSH remote servers with key-based auth',
        'Custom storage nodes for on-premise requirements',
        'Automatic replication across destinations',
      ],
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-[#16325C]" />,
      title: 'Sandbox & Production Restore',
      description: 'Restore data safely with isolated sandbox environments for validation before applying changes to production.',
      highlights: [
        'Isolated sandbox restore with full data validation',
        'Production restore with multi-step confirmation',
        'Pre-restore health checks and compatibility validation',
        'Automatic rollback on restore failure',
      ],
    },
    {
      icon: <Layers className="w-6 h-6 text-[#16325C]" />,
      title: 'Full & Partial Restore Capability',
      description: 'Restore entire system snapshots or selectively recover specific modules, tables, or configuration files.',
      highlights: [
        'Granular table-level and module-level restore',
        'Configuration-only restore for settings recovery',
        'User data selective restoration with masking',
        'Cross-environment restore with data mapping',
      ],
    },
    {
      icon: <FileText className="w-6 h-6 text-[#16325C]" />,
      title: 'Comprehensive Audit Logging',
      description: 'Full audit trail of all backup and restore operations with user attribution, timestamps, and outcome tracking.',
      highlights: [
        'Immutable audit logs with tamper detection',
        'User-triggered action tracking with IP logging',
        'Automated operation logging with error details',
        'Exportable compliance reports (SOC2, GDPR)',
      ],
    },
    {
      icon: <Bell className="w-6 h-6 text-[#16325C]" />,
      title: 'Health Monitoring & Alerts',
      description: 'Real-time backup health dashboard with proactive alerting for failures, storage issues, and policy violations.',
      highlights: [
        'Real-time backup status with health indicators',
        'Email, Slack, and webhook alert integrations',
        'Storage capacity warnings and threshold alerts',
        'Automated retry on transient failures',
      ],
    },
    {
      icon: <Calendar className="w-6 h-6 text-[#16325C]" />,
      title: 'Schedule Viewer & Retention Policies',
      description: 'Visual schedule management with intelligent retention policies that balance storage costs with compliance requirements.',
      highlights: [
        'Visual calendar view of scheduled backups',
        'Customizable retention periods per backup type',
        'Automated cleanup with grace period warnings',
        'Compliance-aware retention (7yr financial, 3yr ops)',
      ],
    },
    {
      icon: <Users className="w-6 h-6 text-[#16325C]" />,
      title: 'Role-Based Restore Permissions',
      description: 'Granular access controls ensure only authorized personnel can initiate restore operations with appropriate scope.',
      highlights: [
        'Separate permissions for backup vs restore actions',
        'Production restore requires elevated privileges',
        'Multi-user approval workflow for critical restores',
        'Audit trail of permission changes',
      ],
    },
    {
      icon: <Lock className="w-6 h-6 text-[#16325C]" />,
      title: 'Encrypted & Multi-Tenant Aware',
      description: 'Enterprise-grade security with AES-256 encryption at rest and in transit, with complete tenant data isolation.',
      highlights: [
        'AES-256 encryption for all backup data',
        'TLS 1.3 for secure data transmission',
        'Per-tenant encryption keys (BYOK supported)',
        'Complete logical isolation between tenants',
      ],
    },
  ];

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-[#16325C] text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#FEC925] rounded-lg">
              <Database className="w-6 h-6 text-[#16325C]" />
            </div>
            <span className="text-[#FEC925] font-medium text-sm uppercase tracking-wider">
              BISMAN ERP Module
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Backup & Restore
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl leading-relaxed mb-8">
            Enterprise-grade data protection for your business-critical operations. 
            Automated backups, intelligent retention, and seamless recovery—built for 
            organizations that demand reliability, compliance, and peace of mind.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Shield className="w-4 h-4 text-[#FEC925]" />
              <span>SOC2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Lock className="w-4 h-4 text-[#FEC925]" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Zap className="w-4 h-4 text-[#FEC925]" />
              <span>99.99% Uptime SLA</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Eye className="w-4 h-4 text-[#FEC925]" />
              <span>Full Audit Trail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <StatBadge label="RPO Target" value="< 1hr" />
            <StatBadge label="RTO Target" value="< 15min" />
            <StatBadge label="Retention Options" value="7+ Years" />
            <StatBadge label="Storage Providers" value="10+" />
            <StatBadge label="Encryption" value="AES-256" />
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-[#16325C] mb-6">
            Module Overview
          </h2>
          
          <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
            <p>
              The <strong>BISMAN ERP Backup & Restore Module</strong> provides comprehensive data 
              protection capabilities designed for multi-tenant enterprise environments. Built with 
              a defense-in-depth approach, the module ensures your organization's critical data is 
              protected, recoverable, and compliant with industry regulations.
            </p>
            
            <p>
              Whether you're managing a single organization or hundreds of clients across your 
              platform, our backup infrastructure scales seamlessly while maintaining strict tenant 
              isolation and security boundaries. Every backup operation is tracked, encrypted, and 
              stored redundantly across geographically distributed storage providers.
            </p>
            
            <p>
              From automated nightly backups to pre-deployment snapshots triggered by CI/CD 
              pipelines, BISMAN ERP gives you complete control over your data protection strategy 
              while minimizing operational overhead through intelligent automation.
            </p>
          </div>
        </div>

        {/* Architecture Highlights */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#16325C] mb-2">
            Architecture Highlights
          </h2>
          <p className="text-gray-500 mb-8">
            Built on proven infrastructure patterns for reliability and performance
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#16325C] to-[#1E4175] rounded-xl p-6 text-white">
              <Server className="w-8 h-8 text-[#FEC925] mb-4" />
              <h3 className="text-lg font-semibold mb-2">Distributed Backup Engine</h3>
              <p className="text-gray-300 text-sm">
                Horizontally scalable backup workers process jobs in parallel, ensuring 
                consistent performance regardless of data volume.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-[#16325C] to-[#1E4175] rounded-xl p-6 text-white">
              <HardDrive className="w-8 h-8 text-[#FEC925] mb-4" />
              <h3 className="text-lg font-semibold mb-2">Intelligent Deduplication</h3>
              <p className="text-gray-300 text-sm">
                Block-level deduplication reduces storage costs by up to 80% while 
                maintaining full restore fidelity.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-[#16325C] to-[#1E4175] rounded-xl p-6 text-white">
              <Settings className="w-8 h-8 text-[#FEC925] mb-4" />
              <h3 className="text-lg font-semibold mb-2">Policy-Driven Automation</h3>
              <p className="text-gray-300 text-sm">
                Define backup policies once and apply them across organizations with 
                inheritance and override capabilities.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#16325C] mb-2">
            Core Capabilities
          </h2>
          <p className="text-gray-500 mb-8">
            Comprehensive features designed for enterprise data protection requirements
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} />
            ))}
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="bg-[#16325C]/5 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-[#16325C] mb-6">
            Security & Compliance
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-[#16325C] mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FEC925]" />
                Data Protection Standards
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Encryption at Rest:</strong> AES-256-GCM encryption for all stored backup data with hardware security module (HSM) key management.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Encryption in Transit:</strong> TLS 1.3 with perfect forward secrecy for all data transmission between systems.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Key Rotation:</strong> Automated encryption key rotation with configurable intervals and zero-downtime rollover.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>BYOK Support:</strong> Bring Your Own Key capability for organizations with specific key management requirements.</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#16325C] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#FEC925]" />
                Compliance Frameworks
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>SOC 2 Type II:</strong> Audited controls for security, availability, and confidentiality with annual certification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>GDPR:</strong> Right to erasure support with selective backup purging and data subject access request handling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>HIPAA:</strong> Business Associate Agreement (BAA) available with enhanced access controls and audit logging.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>ISO 27001:</strong> Information security management aligned with international standards.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-[#16325C] mb-6">
            Technical Specifications
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-[#16325C] mb-3 pb-2 border-b border-gray-200">
                Backup Performance
              </h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 text-gray-600">Maximum Backup Size</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Unlimited (chunked)</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Compression Ratio</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Up to 10:1</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Parallel Streams</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">32 concurrent</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Incremental Support</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Block-level delta</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Backup Verification</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">SHA-256 checksums</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#16325C] mb-3 pb-2 border-b border-gray-200">
                Restore Capabilities
              </h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 text-gray-600">Point-in-Time Recovery</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">1-second granularity</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Restore Target Options</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Original, Sandbox, New</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Partial Restore</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Table/module level</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Cross-Region Restore</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Supported</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Restore Validation</td>
                    <td className="py-2 text-right font-medium text-[#16325C]">Automated integrity check</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-[#16325C] py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Enterprise Data Protection You Can Trust
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join organizations worldwide that rely on BISMAN ERP's Backup & Restore 
            module to protect their business-critical data.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button className="px-6 py-3 bg-[#FEC925] text-[#16325C] font-semibold rounded-lg hover:bg-[#FFD54F] transition-colors">
              Schedule Demo
            </button>
            <button className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
