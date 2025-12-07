'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  Clock,
  GitCommit,
  Cloud,
  Server,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Database,
  Shield,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - Backup & Restore Explainer Animation Storyboard
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * A comprehensive storyboard for an explainer animation featuring:
 * - Dashboard with backup status summary
 * - Git commit → auto-backup trigger flow
 * - Storage nodes receiving backup copies
 * - Failed deployment → restore → recovery sequence
 * - Timeline visualization of backup snapshots
 * - Closing slogan: "Rest Easy with BISMAN ERP – Your Data. Always Safe."
 * 
 * Music Direction: Corporate/instrumental, clean animations
 * Brand Colors: #FEC925 (yellow), #16325C (navy blue)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface StoryboardScene {
  id: number;
  title: string;
  duration: string;
  timestamp: string;
  description: string;
  visualElements: string[];
  animation: string;
  voiceover: string;
  musicNote: string;
  thumbnail: React.ReactNode;
}

const scenes: StoryboardScene[] = [
  {
    id: 1,
    title: 'Opening – Brand Intro',
    duration: '0:00 – 0:04',
    timestamp: '4s',
    description: 'BISMAN ERP logo animates in with a subtle glow effect. Navy blue background transitions to reveal the product tagline.',
    visualElements: [
      'BISMAN logo (yellow on navy)',
      'Particle effects converging to form logo',
      'Tagline fade-in: "Enterprise Resource Planning"',
    ],
    animation: 'Logo particles converge → pulse → settle. Smooth 3D rotation.',
    voiceover: '"In today\'s data-driven world, protecting your business information isn\'t optional—it\'s essential."',
    musicNote: 'Soft piano intro, building anticipation. Corporate instrumental begins.',
    thumbnail: (
      <div className="w-full h-full bg-[#16325C] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#FEC925] rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `pulse 2s ease-in-out infinite ${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        <div className="text-center z-10">
          <div className="w-16 h-16 bg-[#FEC925] rounded-xl mx-auto mb-2 flex items-center justify-center">
            <Database className="w-8 h-8 text-[#16325C]" />
          </div>
          <div className="text-white font-bold text-lg">BISMAN</div>
          <div className="text-[#FEC925] text-xs">ERP</div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Dashboard Overview',
    duration: '0:04 – 0:12',
    timestamp: '8s',
    description: 'Camera zooms into a sleek backup dashboard. Status cards animate in showing last backup, success rate, and storage usage.',
    visualElements: [
      'Backup status summary card (green indicator)',
      'Statistics: 99.9% success rate, 45.2 GB stored',
      'Timeline preview with recent backups',
      'Quick action buttons (Manual Backup, Restore)',
    ],
    animation: 'Dashboard elements slide in from left/right. Numbers count up. Status indicators pulse.',
    voiceover: '"Meet BISMAN ERP\'s Backup & Restore module—your command center for data protection."',
    musicNote: 'Tempo picks up slightly. Light percussion enters.',
    thumbnail: (
      <div className="w-full h-full bg-gray-100 p-3">
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[8px] text-gray-600">Last Backup: 2 min ago</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="bg-white rounded p-1.5">
            <div className="text-[10px] font-bold text-[#16325C]">99.9%</div>
            <div className="text-[6px] text-gray-500">Success</div>
          </div>
          <div className="bg-white rounded p-1.5">
            <div className="text-[10px] font-bold text-[#FEC925]">45.2 GB</div>
            <div className="text-[6px] text-gray-500">Stored</div>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          <div className="flex-1 bg-[#16325C] rounded py-1 text-center">
            <span className="text-[6px] text-white">Backup</span>
          </div>
          <div className="flex-1 bg-[#FEC925] rounded py-1 text-center">
            <span className="text-[6px] text-[#16325C]">Restore</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Git Commit → Auto-Backup Trigger',
    duration: '0:12 – 0:22',
    timestamp: '10s',
    description: 'Developer pushes code to Git. Commit notification appears. System automatically triggers a pre-deployment backup.',
    visualElements: [
      'Terminal/code editor with git push command',
      'Git commit icon with hash (e.g., a1b2c3d)',
      'Notification: "Pre-deploy backup initiated"',
      'Progress bar filling with brand yellow',
      'Backup snapshot being created',
    ],
    animation: 'Code types in terminal → commit icon pulses → arrow flows to backup engine → progress animates.',
    voiceover: '"Every code deployment automatically triggers a backup. Your commit history is linked to restore points—always."',
    musicNote: 'Synth layers add. Rhythmic pulses match the data flow.',
    thumbnail: (
      <div className="w-full h-full bg-gray-900 p-3 font-mono">
        <div className="text-[8px] text-gray-400 mb-1">$ git push origin main</div>
        <div className="flex items-center gap-2 mb-2">
          <GitCommit className="w-4 h-4 text-[#FEC925]" />
          <span className="text-[8px] text-green-400">a1b2c3d</span>
        </div>
        <div className="bg-[#16325C] rounded p-1.5">
          <div className="text-[7px] text-white mb-1">Pre-deploy backup</div>
          <div className="h-1.5 bg-gray-700 rounded overflow-hidden">
            <div className="h-full bg-[#FEC925] w-3/4 animate-pulse" />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-[6px] text-green-400">Snapshot created</span>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'Multi-Storage Distribution',
    duration: '0:22 – 0:34',
    timestamp: '12s',
    description: 'Backup data flows from the ERP server to multiple storage destinations simultaneously. Each storage icon lights up as data arrives.',
    visualElements: [
      'Central BISMAN server (navy blue)',
      'Animated data streams (yellow particles)',
      'AWS S3 bucket icon (orange)',
      'Azure Blob icon (blue)',
      'SFTP server icon (gray)',
      'Custom node icon (purple)',
      'Checkmarks appearing on each destination',
    ],
    animation: 'Data particles flow outward from center. Storage icons light up sequentially. Encryption lock icon flashes on streams.',
    voiceover: '"Backups are automatically distributed across AWS S3, Azure, SFTP, and custom storage nodes—encrypted and redundant."',
    musicNote: 'Full orchestra builds. Triumphant feel as data reaches destinations.',
    thumbnail: (
      <div className="w-full h-full bg-[#16325C] p-3 relative">
        {/* Center server */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#FEC925] rounded-lg flex items-center justify-center z-10">
          <Server className="w-5 h-5 text-[#16325C]" />
        </div>
        {/* Storage nodes */}
        <div className="absolute top-2 left-2">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
            <Cloud className="w-3 h-3 text-white" />
          </div>
          <div className="text-[5px] text-white mt-0.5 text-center">S3</div>
        </div>
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <Cloud className="w-3 h-3 text-white" />
          </div>
          <div className="text-[5px] text-white mt-0.5 text-center">Azure</div>
        </div>
        <div className="absolute bottom-2 left-2">
          <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center">
            <Server className="w-3 h-3 text-white" />
          </div>
          <div className="text-[5px] text-white mt-0.5 text-center">SFTP</div>
        </div>
        <div className="absolute bottom-2 right-2">
          <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
            <Database className="w-3 h-3 text-white" />
          </div>
          <div className="text-[5px] text-white mt-0.5 text-center">Custom</div>
        </div>
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
          <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="#FEC925" strokeWidth="1" strokeDasharray="2,2">
            <animate attributeName="stroke-dashoffset" from="4" to="0" dur="0.5s" repeatCount="indefinite" />
          </line>
          <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="#FEC925" strokeWidth="1" strokeDasharray="2,2">
            <animate attributeName="stroke-dashoffset" from="4" to="0" dur="0.5s" repeatCount="indefinite" />
          </line>
          <line x1="50%" y1="50%" x2="20%" y2="75%" stroke="#FEC925" strokeWidth="1" strokeDasharray="2,2">
            <animate attributeName="stroke-dashoffset" from="4" to="0" dur="0.5s" repeatCount="indefinite" />
          </line>
          <line x1="50%" y1="50%" x2="80%" y2="75%" stroke="#FEC925" strokeWidth="1" strokeDasharray="2,2">
            <animate attributeName="stroke-dashoffset" from="4" to="0" dur="0.5s" repeatCount="indefinite" />
          </line>
        </svg>
      </div>
    ),
  },
  {
    id: 5,
    title: 'Deployment Failure Scenario',
    duration: '0:34 – 0:44',
    timestamp: '10s',
    description: 'A deployment goes wrong. Error alerts appear. The admin reviews the failure and decides to initiate a restore.',
    visualElements: [
      'Deployment progress bar turning red',
      'Error notification: "Deployment Failed"',
      'Alert icons flashing',
      'Admin avatar viewing the dashboard',
      'Cursor moving to "Restore" button',
      'Restore options panel appearing',
    ],
    animation: 'Progress bar → red. Screen shakes slightly. Alert notifications stack. Admin clicks restore.',
    voiceover: '"When deployments fail, don\'t panic. BISMAN ERP has your back—literally."',
    musicNote: 'Music becomes tense. Minor key shift. Suspenseful undertone.',
    thumbnail: (
      <div className="w-full h-full bg-red-50 p-3">
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[8px] font-bold text-red-600">Deployment Failed</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-red-500 w-2/3" />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-[#16325C] rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white">A</span>
          </div>
          <span className="text-[7px] text-gray-600">Admin reviewing...</span>
        </div>
        <div className="bg-[#FEC925] rounded py-1.5 text-center cursor-pointer">
          <span className="text-[8px] font-bold text-[#16325C]">🔄 Initiate Restore</span>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: 'Restore Process',
    duration: '0:44 – 0:56',
    timestamp: '12s',
    description: 'Admin selects a restore point from the timeline. Sandbox restore option chosen. System validates and begins recovery.',
    visualElements: [
      'Timeline of backup snapshots',
      'Highlighted restore point (pre-deploy backup)',
      'Restore type selector: Sandbox (selected), Production',
      'Validation checkmarks appearing',
      '"Restoring..." progress animation',
      'Data flowing back to server',
    ],
    animation: 'Timeline scrolls. Restore point highlights with glow. Data particles flow in reverse (back to server).',
    voiceover: '"Select your restore point, choose sandbox for safety, and let the system handle the rest."',
    musicNote: 'Music transitions to hopeful. Rising melody begins.',
    thumbnail: (
      <div className="w-full h-full bg-gray-100 p-3">
        {/* Timeline */}
        <div className="flex items-center gap-1 mb-2 overflow-hidden">
          <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
          <div className="w-3 h-0.5 bg-gray-300" />
          <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
          <div className="w-3 h-0.5 bg-gray-300" />
          <div className="w-3 h-3 bg-[#FEC925] rounded-full flex-shrink-0 ring-2 ring-[#FEC925]/30" />
          <div className="w-3 h-0.5 bg-gray-300" />
          <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
        </div>
        <div className="text-[6px] text-gray-500 mb-2 text-center">Pre-deploy • a1b2c3d</div>
        
        {/* Restore options */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1 bg-green-100 rounded p-1 border border-green-300">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[7px] text-green-700 font-medium">Sandbox</span>
          </div>
          <div className="flex items-center gap-1 bg-white rounded p-1 border border-gray-200">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <span className="text-[7px] text-gray-500">Production</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="bg-white rounded p-1.5">
          <div className="text-[7px] text-[#16325C] mb-1">Restoring...</div>
          <div className="h-1 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-[#16325C] w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: 'Recovery Successful',
    duration: '0:56 – 1:06',
    timestamp: '10s',
    description: 'Restore completes. Green success indicators light up across the dashboard. System is fully operational again.',
    visualElements: [
      'Large green checkmark animation',
      '"Restore Complete" notification',
      'Dashboard showing healthy status',
      'All systems green indicators',
      'Timestamp: Recovery time shown',
      'Confetti or particle celebration effect',
    ],
    animation: 'Checkmark draws in. Green spreads across UI. Celebratory particles. Dashboard refreshes with healthy state.',
    voiceover: '"Recovery complete. Your system is back online in minutes, not hours."',
    musicNote: 'Triumphant crescendo. Major key resolution. Uplifting finale.',
    thumbnail: (
      <div className="w-full h-full bg-green-50 p-3 relative overflow-hidden">
        {/* Confetti particles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: ['#FEC925', '#16325C', '#22C55E', '#3B82F6'][i % 4],
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i % 3) * 15}%`,
              animation: `bounce 1s ease-in-out infinite ${i * 0.1}s`,
            }}
          />
        ))}
        
        {/* Success content */}
        <div className="text-center relative z-10">
          <div className="w-12 h-12 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-2">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="text-[10px] font-bold text-green-700 mb-1">Restore Complete!</div>
          <div className="text-[7px] text-gray-600 mb-2">Recovery time: 3m 42s</div>
          
          <div className="flex justify-center gap-2">
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[6px] text-gray-600">Database</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[6px] text-gray-600">Config</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[6px] text-gray-600">Files</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    title: 'Timeline Visualization',
    duration: '1:06 – 1:16',
    timestamp: '10s',
    description: 'Showcase the comprehensive timeline view of all backup snapshots with Git integration, types, and status indicators.',
    visualElements: [
      'Horizontal timeline with backup points',
      'Color-coded: green (success), red (failed), yellow (warning)',
      'Git commit hashes linked to each point',
      'Backup types: Full, Incremental, Config',
      'Hover states showing details',
      'Date/time markers',
    ],
    animation: 'Timeline scrolls through history. Hover effects on points. Details panels slide in.',
    voiceover: '"A complete timeline of every backup, every commit, every restore—all in one view."',
    musicNote: 'Steady rhythm. Reflective tone. Ambient background.',
    thumbnail: (
      <div className="w-full h-full bg-white p-3">
        <div className="text-[8px] font-bold text-[#16325C] mb-2">Backup Timeline</div>
        
        {/* Timeline */}
        <div className="relative">
          <div className="h-0.5 bg-gray-200 absolute top-3 left-0 right-0" />
          
          <div className="flex justify-between relative">
            {/* Point 1 */}
            <div className="text-center">
              <div className="w-6 h-6 bg-green-500 rounded-full mx-auto flex items-center justify-center relative z-10">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <div className="text-[5px] text-gray-500 mt-1">Dec 5</div>
              <div className="text-[5px] font-mono text-gray-400">a1b2</div>
            </div>
            
            {/* Point 2 */}
            <div className="text-center">
              <div className="w-6 h-6 bg-green-500 rounded-full mx-auto flex items-center justify-center relative z-10">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <div className="text-[5px] text-gray-500 mt-1">Dec 6</div>
              <div className="text-[5px] font-mono text-gray-400">c3d4</div>
            </div>
            
            {/* Point 3 - Failed */}
            <div className="text-center">
              <div className="w-6 h-6 bg-red-500 rounded-full mx-auto flex items-center justify-center relative z-10">
                <span className="text-white text-[8px]">✕</span>
              </div>
              <div className="text-[5px] text-gray-500 mt-1">Dec 6</div>
              <div className="text-[5px] font-mono text-gray-400">e5f6</div>
            </div>
            
            {/* Point 4 */}
            <div className="text-center">
              <div className="w-6 h-6 bg-green-500 rounded-full mx-auto flex items-center justify-center relative z-10 ring-2 ring-[#FEC925]">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <div className="text-[5px] text-gray-500 mt-1">Dec 7</div>
              <div className="text-[5px] font-mono text-gray-400">g7h8</div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-3 mt-3">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[5px] text-gray-500">Success</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-[5px] text-gray-500">Failed</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 bg-[#FEC925] rounded-full" />
            <span className="text-[5px] text-gray-500">Restored</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 9,
    title: 'Feature Highlights Montage',
    duration: '1:16 – 1:26',
    timestamp: '10s',
    description: 'Quick montage of key features: encryption, multi-tenant, role-based permissions, alerts, and scheduling.',
    visualElements: [
      'AES-256 encryption badge',
      'Multi-tenant isolation diagram',
      'Role-based permissions matrix',
      'Alert notification examples',
      'Schedule calendar view',
      'Each feature with checkmark',
    ],
    animation: 'Fast-paced montage. Each feature slides in, gets a checkmark, slides out.',
    voiceover: '"Encrypted. Multi-tenant. Role-based. Automated. Everything enterprise data protection demands."',
    musicNote: 'Uptempo. Quick cuts match beat. Energetic.',
    thumbnail: (
      <div className="w-full h-full bg-[#16325C] p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-white/10 rounded p-1.5 flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#FEC925]" />
            <span className="text-[6px] text-white">AES-256</span>
          </div>
          <div className="bg-white/10 rounded p-1.5 flex items-center gap-1">
            <Database className="w-3 h-3 text-[#FEC925]" />
            <span className="text-[6px] text-white">Multi-Tenant</span>
          </div>
          <div className="bg-white/10 rounded p-1.5 flex items-center gap-1">
            <Server className="w-3 h-3 text-[#FEC925]" />
            <span className="text-[6px] text-white">RBAC</span>
          </div>
          <div className="bg-white/10 rounded p-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#FEC925]" />
            <span className="text-[6px] text-white">Scheduled</span>
          </div>
        </div>
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-1 bg-[#FEC925] rounded-full px-2 py-0.5">
            <CheckCircle className="w-3 h-3 text-[#16325C]" />
            <span className="text-[7px] font-bold text-[#16325C]">Enterprise Ready</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 10,
    title: 'Closing – Slogan & CTA',
    duration: '1:26 – 1:35',
    timestamp: '9s',
    description: 'Final screen with BISMAN logo, slogan, and call-to-action. Fade to brand colors.',
    visualElements: [
      'BISMAN ERP logo (centered, large)',
      'Slogan: "Rest Easy with BISMAN ERP"',
      'Subtext: "Your Data. Always Safe."',
      'CTA: "Learn More" button',
      'Website URL',
      'Subtle animation/glow effect',
    ],
    animation: 'Logo fades in with glow. Slogan types in letter by letter. CTA pulses.',
    voiceover: '"Rest easy with BISMAN ERP. Your data—always safe."',
    musicNote: 'Final chord. Soft piano outro. Fade to silence.',
    thumbnail: (
      <div className="w-full h-full bg-gradient-to-b from-[#16325C] to-[#0F2240] flex items-center justify-center relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute w-32 h-32 bg-[#FEC925]/20 rounded-full blur-xl" />
        
        <div className="text-center relative z-10">
          <div className="w-12 h-12 bg-[#FEC925] rounded-xl mx-auto mb-2 flex items-center justify-center">
            <Database className="w-6 h-6 text-[#16325C]" />
          </div>
          <div className="text-[10px] font-bold text-white mb-0.5">Rest Easy with</div>
          <div className="text-[14px] font-bold text-[#FEC925] mb-1">BISMAN ERP</div>
          <div className="text-[8px] text-gray-300 mb-2">Your Data. Always Safe.</div>
          <div className="bg-[#FEC925] rounded px-3 py-1 inline-block">
            <span className="text-[7px] font-bold text-[#16325C]">Learn More →</span>
          </div>
        </div>
      </div>
    ),
  },
];

export default function BackupRestoreStoryboard() {
  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePrevScene = () => {
    setActiveScene((prev) => (prev > 0 ? prev - 1 : scenes.length - 1));
  };

  const handleNextScene = () => {
    setActiveScene((prev) => (prev < scenes.length - 1 ? prev + 1 : 0));
  };

  const currentScene = scenes[activeScene];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#16325C] text-white py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#FEC925] rounded-lg">
              <Play className="w-5 h-5 text-[#16325C]" />
            </div>
            <span className="text-[#FEC925] font-medium text-sm uppercase tracking-wider">
              Explainer Animation Storyboard
            </span>
          </div>
          <h1 className="text-3xl font-bold">Backup & Restore Module</h1>
          <p className="text-gray-300 mt-2">
            BISMAN ERP • Estimated Runtime: 1:35 • 10 Scenes
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Scene Preview */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Video Player Mockup */}
          <div className="bg-black aspect-video relative">
            {/* Scene Thumbnail Preview */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[500px] h-[280px] rounded-lg overflow-hidden shadow-2xl">
                {currentScene.thumbnail}
              </div>
            </div>
            
            {/* Scene Number Overlay */}
            <div className="absolute top-4 left-4 bg-black/70 px-3 py-1.5 rounded-lg">
              <span className="text-white text-sm font-medium">
                Scene {currentScene.id} of {scenes.length}
              </span>
            </div>
            
            {/* Duration Overlay */}
            <div className="absolute top-4 right-4 bg-[#FEC925] px-3 py-1.5 rounded-lg">
              <span className="text-[#16325C] text-sm font-bold">
                {currentScene.timestamp}
              </span>
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevScene}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-[#FEC925] rounded-full text-[#16325C] hover:bg-[#FFD54F] transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleNextScene}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>{currentScene.duration}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <Volume2 className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FEC925] transition-all duration-300"
                  style={{ width: `${((activeScene + 1) / scenes.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scene Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left Column - Scene Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#16325C] mb-4">
              {currentScene.title}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {currentScene.description}
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#16325C] mb-2">Visual Elements</h3>
                <ul className="space-y-1.5">
                  {currentScene.visualElements.map((element, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-[#FEC925] flex-shrink-0 mt-0.5" />
                      <span>{element}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-[#16325C] mb-2">Animation Notes</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {currentScene.animation}
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Column - Audio */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-[#16325C] mb-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#FEC925]" />
                  Voiceover Script
                </h3>
                <div className="bg-[#16325C]/5 p-4 rounded-lg">
                  <p className="text-gray-700 italic">
                    {currentScene.voiceover}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-[#16325C] mb-2 flex items-center gap-2">
                  <span className="text-[#FEC925]">♪</span>
                  Music Direction
                </h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {currentScene.musicNote}
                </p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#16325C] mb-3">Scene Navigation</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevScene}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex-1 text-center text-sm text-gray-500">
                    {activeScene + 1} / {scenes.length}
                  </div>
                  <button
                    onClick={handleNextScene}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scene Thumbnails */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#16325C] mb-4">All Scenes</h3>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {scenes.map((scene, idx) => (
              <button
                key={scene.id}
                onClick={() => setActiveScene(idx)}
                className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  activeScene === idx
                    ? 'border-[#FEC925] ring-2 ring-[#FEC925]/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-full relative">
                  {scene.thumbnail}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                    {scene.id}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Production Notes */}
        <div className="mt-8 bg-[#16325C]/5 rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#16325C] mb-4">Production Notes</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-[#16325C] mb-2">Style Guide</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Primary: #16325C (Navy Blue)</li>
                <li>• Accent: #FEC925 (Yellow)</li>
                <li>• Clean, flat corporate illustration</li>
                <li>• Smooth easing (ease-in-out)</li>
                <li>• 60fps animation target</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#16325C] mb-2">Audio</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Corporate instrumental track</li>
                <li>• Professional male/female VO</li>
                <li>• Subtle UI sound effects</li>
                <li>• Mix: VO -6dB, Music -18dB</li>
                <li>• Duration: ~1:35</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#16325C] mb-2">Deliverables</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 1080p / 4K versions</li>
                <li>• With/without subtitles</li>
                <li>• Social cuts (30s, 15s)</li>
                <li>• Thumbnail for YouTube</li>
                <li>• Source files (After Effects)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Final Slogan Banner */}
      <div className="bg-gradient-to-r from-[#16325C] to-[#1E4175] py-12 mt-8">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="inline-block bg-[#FEC925] rounded-xl p-4 mb-6">
            <Database className="w-10 h-10 text-[#16325C]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Rest Easy with BISMAN ERP
          </h2>
          <p className="text-xl text-[#FEC925] font-medium">
            Your Data. Always Safe.
          </p>
        </div>
      </div>
    </div>
  );
}
