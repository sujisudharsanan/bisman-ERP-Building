'use client';

import React from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - Backup & Restore Workflow Illustration
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * A vector-style SaaS ERP backup workflow illustration featuring:
 * - Server cluster with arrows to cloud storage (S3, SFTP, Azure)
 * - Git commit icons linked to backup snapshots
 * - Timeline with scheduled/manual backups
 * - Success/failure indicators
 * - Admin initiating restore
 * 
 * Brand Colors: #FEC925 (yellow), #16325C (navy blue)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export default function BackupRestoreIllustration({ 
  className = '',
  showTitle = true 
}: { 
  className?: string;
  showTitle?: boolean;
}) {
  return (
    <div className={`w-full ${className}`}>
      <svg
        viewBox="0 0 900 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        {/* Background */}
        <rect width="900" height="500" fill="#F8FAFC" rx="16" />
        
        {/* Grid Pattern Background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
          </pattern>
          
          {/* Gradients */}
          <linearGradient id="navyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16325C" />
            <stop offset="100%" stopColor="#1E4175" />
          </linearGradient>
          
          <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEC925" />
            <stop offset="100%" stopColor="#FFD54F" />
          </linearGradient>
          
          <linearGradient id="s3Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9900" />
            <stop offset="100%" stopColor="#FFB84D" />
          </linearGradient>
          
          <linearGradient id="azureGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0078D4" />
            <stop offset="100%" stopColor="#2B88D8" />
          </linearGradient>
          
          <linearGradient id="sftpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>

          {/* Arrow Marker */}
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#16325C" />
          </marker>
          
          <marker id="arrowheadYellow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#FEC925" />
          </marker>

          {/* Shadow Filter */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.1" />
          </filter>
          
          <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect width="900" height="500" fill="url(#grid)" />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TITLE SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showTitle && (
          <g>
            <text x="450" y="45" textAnchor="middle" fill="#16325C" fontSize="24" fontWeight="700" fontFamily="system-ui, sans-serif">
              Reliable Backups. Hassle-Free Restores.
            </text>
            <rect x="350" y="55" width="200" height="4" rx="2" fill="url(#yellowGradient)" />
          </g>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ERP SERVER CLUSTER (Left Side) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(80, 120)" filter="url(#shadow)">
          {/* Main Server Box */}
          <rect x="0" y="0" width="140" height="180" rx="12" fill="url(#navyGradient)" />
          
          {/* Server Rack Lines */}
          <rect x="15" y="20" width="110" height="25" rx="4" fill="#1E4175" stroke="#FEC925" strokeWidth="2" />
          <rect x="15" y="55" width="110" height="25" rx="4" fill="#1E4175" stroke="#FEC925" strokeWidth="2" />
          <rect x="15" y="90" width="110" height="25" rx="4" fill="#1E4175" stroke="#FEC925" strokeWidth="2" />
          
          {/* Server LEDs */}
          <circle cx="30" cy="32" r="4" fill="#22C55E">
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="45" cy="32" r="4" fill="#22C55E">
            <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="30" cy="67" r="4" fill="#22C55E">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="45" cy="67" r="4" fill="#FEC925">
            <animate attributeName="opacity" values="1;0.5;1" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="30" cy="102" r="4" fill="#22C55E">
            <animate attributeName="opacity" values="1;0.5;1" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="45" cy="102" r="4" fill="#22C55E">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.9s" repeatCount="indefinite" />
          </circle>
          
          {/* BISMAN Label */}
          <rect x="15" y="130" width="110" height="35" rx="6" fill="#FEC925" />
          <text x="70" y="153" textAnchor="middle" fill="#16325C" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">
            BISMAN ERP
          </text>
        </g>

        {/* Database Icon under server */}
        <g transform="translate(115, 320)">
          <ellipse cx="35" cy="10" rx="35" ry="12" fill="#16325C" />
          <rect x="0" y="10" width="70" height="40" fill="#16325C" />
          <ellipse cx="35" cy="50" rx="35" ry="12" fill="#1E4175" />
          <ellipse cx="35" cy="10" rx="28" ry="8" fill="#1E4175" />
          <text x="35" y="35" textAnchor="middle" fill="white" fontSize="10" fontFamily="system-ui, sans-serif">
            PostgreSQL
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ANIMATED BACKUP ARROWS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        
        {/* Arrow to S3 */}
        <g>
          <path
            d="M 220 180 Q 320 120, 420 100"
            stroke="#16325C"
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
            markerEnd="url(#arrowhead)"
          >
            <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
          </path>
          {/* Data packet animation */}
          <circle r="6" fill="#FEC925">
            <animateMotion dur="2s" repeatCount="indefinite">
              <mpath href="#pathToS3" />
            </animateMotion>
          </circle>
          <path id="pathToS3" d="M 220 180 Q 320 120, 420 100" fill="none" />
        </g>

        {/* Arrow to Azure */}
        <g>
          <path
            d="M 220 210 Q 320 210, 420 210"
            stroke="#16325C"
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
            markerEnd="url(#arrowhead)"
          >
            <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
          </path>
          <circle r="6" fill="#FEC925">
            <animateMotion dur="2.5s" repeatCount="indefinite">
              <mpath href="#pathToAzure" />
            </animateMotion>
          </circle>
          <path id="pathToAzure" d="M 220 210 Q 320 210, 420 210" fill="none" />
        </g>

        {/* Arrow to SFTP */}
        <g>
          <path
            d="M 220 240 Q 320 300, 420 320"
            stroke="#16325C"
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
            markerEnd="url(#arrowhead)"
          >
            <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
          </path>
          <circle r="6" fill="#FEC925">
            <animateMotion dur="3s" repeatCount="indefinite">
              <mpath href="#pathToSFTP" />
            </animateMotion>
          </circle>
          <path id="pathToSFTP" d="M 220 240 Q 320 300, 420 320" fill="none" />
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CLOUD STORAGE TARGETS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        
        {/* AWS S3 */}
        <g transform="translate(420, 70)" filter="url(#shadow)">
          <rect x="0" y="0" width="120" height="70" rx="10" fill="white" stroke="#FF9900" strokeWidth="2" />
          {/* S3 Bucket Icon */}
          <g transform="translate(15, 12)">
            <path d="M20 0 L40 10 L40 35 L20 45 L0 35 L0 10 Z" fill="url(#s3Gradient)" />
            <path d="M20 0 L20 45" stroke="white" strokeWidth="1" opacity="0.5" />
            <path d="M0 10 L40 10" stroke="white" strokeWidth="1" opacity="0.5" />
          </g>
          <text x="75" y="30" textAnchor="start" fill="#16325C" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
            AWS
          </text>
          <text x="75" y="45" textAnchor="start" fill="#6B7280" fontSize="10" fontFamily="system-ui, sans-serif">
            S3 Bucket
          </text>
          {/* Success indicator */}
          <circle cx="105" cy="15" r="8" fill="#22C55E" filter="url(#glowGreen)" />
          <path d="M101 15 L104 18 L109 12" stroke="white" strokeWidth="2" fill="none" />
        </g>

        {/* Azure Blob */}
        <g transform="translate(420, 170)" filter="url(#shadow)">
          <rect x="0" y="0" width="120" height="70" rx="10" fill="white" stroke="#0078D4" strokeWidth="2" />
          {/* Azure Cloud Icon */}
          <g transform="translate(12, 15)">
            <path d="M10 30 Q-5 30, 5 20 Q0 10, 15 10 Q20 0, 35 5 Q50 0, 50 15 Q60 20, 50 30 Z" fill="url(#azureGradient)" />
          </g>
          <text x="75" y="30" textAnchor="start" fill="#16325C" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
            Azure
          </text>
          <text x="75" y="45" textAnchor="start" fill="#6B7280" fontSize="10" fontFamily="system-ui, sans-serif">
            Blob Storage
          </text>
          {/* Success indicator */}
          <circle cx="105" cy="15" r="8" fill="#22C55E" filter="url(#glowGreen)" />
          <path d="M101 15 L104 18 L109 12" stroke="white" strokeWidth="2" fill="none" />
        </g>

        {/* SFTP Server */}
        <g transform="translate(420, 290)" filter="url(#shadow)">
          <rect x="0" y="0" width="120" height="70" rx="10" fill="white" stroke="#6B7280" strokeWidth="2" />
          {/* Server Icon */}
          <g transform="translate(15, 12)">
            <rect x="0" y="0" width="40" height="40" rx="4" fill="url(#sftpGradient)" />
            <rect x="5" y="8" width="30" height="6" rx="2" fill="white" opacity="0.3" />
            <rect x="5" y="18" width="30" height="6" rx="2" fill="white" opacity="0.3" />
            <rect x="5" y="28" width="30" height="6" rx="2" fill="white" opacity="0.3" />
            <circle cx="10" cy="11" r="2" fill="#22C55E" />
            <circle cx="10" cy="21" r="2" fill="#FEC925" />
            <circle cx="10" cy="31" r="2" fill="#EF4444" />
          </g>
          <text x="75" y="30" textAnchor="start" fill="#16325C" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">
            SFTP
          </text>
          <text x="75" y="45" textAnchor="start" fill="#6B7280" fontSize="10" fontFamily="system-ui, sans-serif">
            Backup Server
          </text>
          {/* Warning indicator */}
          <circle cx="105" cy="15" r="8" fill="#F59E0B" />
          <text x="105" y="19" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">!</text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* GIT COMMITS SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(560, 80)">
          {/* Git Branch Line */}
          <line x1="20" y1="0" x2="20" y2="140" stroke="#16325C" strokeWidth="3" />
          
          {/* Commit 1 - Success */}
          <g transform="translate(0, 10)">
            <circle cx="20" cy="0" r="12" fill="#22C55E" stroke="white" strokeWidth="2" />
            <path d="M15 0 L18 3 L25 -4" stroke="white" strokeWidth="2" fill="none" />
            <rect x="40" y="-12" width="80" height="24" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
            <text x="50" y="-2" fill="#16325C" fontSize="9" fontWeight="600" fontFamily="monospace">a1b2c3d</text>
            <text x="50" y="8" fill="#6B7280" fontSize="8" fontFamily="system-ui">Full Backup</text>
          </g>
          
          {/* Commit 2 - Success */}
          <g transform="translate(0, 50)">
            <circle cx="20" cy="0" r="12" fill="#22C55E" stroke="white" strokeWidth="2" />
            <path d="M15 0 L18 3 L25 -4" stroke="white" strokeWidth="2" fill="none" />
            <rect x="40" y="-12" width="80" height="24" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
            <text x="50" y="-2" fill="#16325C" fontSize="9" fontWeight="600" fontFamily="monospace">e4f5g6h</text>
            <text x="50" y="8" fill="#6B7280" fontSize="8" fontFamily="system-ui">Incremental</text>
          </g>
          
          {/* Commit 3 - Failed */}
          <g transform="translate(0, 90)">
            <circle cx="20" cy="0" r="12" fill="#EF4444" stroke="white" strokeWidth="2" />
            <path d="M15 -5 L25 5 M25 -5 L15 5" stroke="white" strokeWidth="2" />
            <rect x="40" y="-12" width="80" height="24" rx="4" fill="#FEF2F2" stroke="#FECACA" strokeWidth="1" />
            <text x="50" y="-2" fill="#DC2626" fontSize="9" fontWeight="600" fontFamily="monospace">i7j8k9l</text>
            <text x="50" y="8" fill="#DC2626" fontSize="8" fontFamily="system-ui">Failed</text>
          </g>
          
          {/* Commit 4 - Success */}
          <g transform="translate(0, 130)">
            <circle cx="20" cy="0" r="12" fill="#22C55E" stroke="white" strokeWidth="2" />
            <path d="M15 0 L18 3 L25 -4" stroke="white" strokeWidth="2" fill="none" />
            <rect x="40" y="-12" width="80" height="24" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
            <text x="50" y="-2" fill="#16325C" fontSize="9" fontWeight="600" fontFamily="monospace">m0n1o2p</text>
            <text x="50" y="8" fill="#6B7280" fontSize="8" fontFamily="system-ui">Config</text>
          </g>
          
          {/* Git Label */}
          <g transform="translate(-5, 160)">
            <rect x="0" y="0" width="60" height="22" rx="4" fill="#16325C" />
            <text x="30" y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">
              Git Tags
            </text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TIMELINE SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(80, 410)">
          {/* Timeline Base */}
          <rect x="0" y="20" width="480" height="4" rx="2" fill="#E5E7EB" />
          
          {/* Timeline Points */}
          {/* Scheduled Backup */}
          <g transform="translate(0, 0)">
            <circle cx="0" cy="22" r="10" fill="#16325C" stroke="white" strokeWidth="2" />
            <rect x="-3" y="19" width="6" height="6" fill="white" rx="1" />
            <text x="0" y="50" textAnchor="middle" fill="#16325C" fontSize="9" fontWeight="600">02:00</text>
            <text x="0" y="62" textAnchor="middle" fill="#6B7280" fontSize="8">Scheduled</text>
          </g>
          
          {/* Manual Backup */}
          <g transform="translate(120, 0)">
            <circle cx="0" cy="22" r="10" fill="#FEC925" stroke="white" strokeWidth="2" />
            <path d="M-4 22 L4 22 M0 18 L0 26" stroke="#16325C" strokeWidth="2" />
            <text x="0" y="50" textAnchor="middle" fill="#16325C" fontSize="9" fontWeight="600">08:30</text>
            <text x="0" y="62" textAnchor="middle" fill="#6B7280" fontSize="8">Manual</text>
          </g>
          
          {/* Scheduled Backup */}
          <g transform="translate(240, 0)">
            <circle cx="0" cy="22" r="10" fill="#16325C" stroke="white" strokeWidth="2" />
            <rect x="-3" y="19" width="6" height="6" fill="white" rx="1" />
            <text x="0" y="50" textAnchor="middle" fill="#16325C" fontSize="9" fontWeight="600">14:00</text>
            <text x="0" y="62" textAnchor="middle" fill="#6B7280" fontSize="8">Scheduled</text>
          </g>
          
          {/* Pre-Deploy Backup */}
          <g transform="translate(360, 0)">
            <circle cx="0" cy="22" r="10" fill="#8B5CF6" stroke="white" strokeWidth="2" />
            <path d="M-3 19 L3 22 L-3 25" fill="white" />
            <text x="0" y="50" textAnchor="middle" fill="#16325C" fontSize="9" fontWeight="600">18:45</text>
            <text x="0" y="62" textAnchor="middle" fill="#6B7280" fontSize="8">Pre-Deploy</text>
          </g>
          
          {/* Next Scheduled (Future) */}
          <g transform="translate(480, 0)">
            <circle cx="0" cy="22" r="10" fill="white" stroke="#16325C" strokeWidth="2" strokeDasharray="4,2" />
            <rect x="-3" y="19" width="6" height="6" fill="#E5E7EB" rx="1" />
            <text x="0" y="50" textAnchor="middle" fill="#9CA3AF" fontSize="9" fontWeight="600">02:00</text>
            <text x="0" y="62" textAnchor="middle" fill="#9CA3AF" fontSize="8">Tomorrow</text>
          </g>
          
          {/* Legend */}
          <g transform="translate(520, 10)">
            <rect x="0" y="0" width="120" height="55" rx="6" fill="white" stroke="#E5E7EB" />
            <g transform="translate(10, 12)">
              <circle cx="6" cy="0" r="5" fill="#16325C" />
              <text x="18" y="4" fill="#6B7280" fontSize="9">Scheduled</text>
            </g>
            <g transform="translate(10, 28)">
              <circle cx="6" cy="0" r="5" fill="#FEC925" />
              <text x="18" y="4" fill="#6B7280" fontSize="9">Manual</text>
            </g>
            <g transform="translate(10, 44)">
              <circle cx="6" cy="0" r="5" fill="#8B5CF6" />
              <text x="18" y="4" fill="#6B7280" fontSize="9">Pre-Deploy</text>
            </g>
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ADMIN RESTORE SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(700, 100)">
          {/* Admin Avatar */}
          <circle cx="60" cy="50" r="40" fill="#FEC925" />
          <circle cx="60" cy="35" r="18" fill="#16325C" />
          <ellipse cx="60" cy="75" rx="28" ry="18" fill="#16325C" />
          
          {/* Admin Badge */}
          <rect x="80" y="70" width="40" height="18" rx="4" fill="#16325C" />
          <text x="100" y="83" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">ADMIN</text>
          
          {/* Restore Action Panel */}
          <g transform="translate(0, 110)">
            <rect x="0" y="0" width="130" height="100" rx="10" fill="white" stroke="#E5E7EB" strokeWidth="2" filter="url(#shadow)" />
            
            {/* Panel Header */}
            <rect x="0" y="0" width="130" height="28" rx="10" fill="#16325C" />
            <rect x="0" y="18" width="130" height="10" fill="#16325C" />
            <text x="65" y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Restore Options</text>
            
            {/* Sandbox Option */}
            <g transform="translate(10, 38)">
              <rect x="0" y="0" width="110" height="24" rx="4" fill="#ECFDF5" stroke="#22C55E" strokeWidth="1" />
              <circle cx="14" cy="12" r="6" fill="#22C55E" />
              <path d="M11 12 L13 14 L17 10" stroke="white" strokeWidth="1.5" fill="none" />
              <text x="28" y="16" fill="#16325C" fontSize="10" fontWeight="500">Sandbox</text>
              <text x="95" y="16" fill="#22C55E" fontSize="9" fontWeight="600">SAFE</text>
            </g>
            
            {/* Production Option */}
            <g transform="translate(10, 68)">
              <rect x="0" y="0" width="110" height="24" rx="4" fill="#FEF2F2" stroke="#EF4444" strokeWidth="1" />
              <circle cx="14" cy="12" r="6" fill="#EF4444" />
              <text x="14" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">!</text>
              <text x="28" y="16" fill="#16325C" fontSize="10" fontWeight="500">Production</text>
              <text x="95" y="16" fill="#EF4444" fontSize="9" fontWeight="600">RISK</text>
            </g>
          </g>
          
          {/* Restore Arrow */}
          <g>
            <path
              d="M 60 220 Q 60 260, 300 260 Q 540 260, 540 320"
              stroke="#FEC925"
              strokeWidth="3"
              fill="none"
              strokeDasharray="10,5"
              markerEnd="url(#arrowheadYellow)"
            />
            <text x="300" y="250" textAnchor="middle" fill="#16325C" fontSize="10" fontWeight="600" fontFamily="system-ui">
              Initiating Restore...
            </text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RESTORE TARGET */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(700, 320)">
          <rect x="0" y="0" width="140" height="80" rx="10" fill="white" stroke="#22C55E" strokeWidth="3" filter="url(#shadow)" />
          
          {/* Sandbox Environment Icon */}
          <g transform="translate(15, 15)">
            <rect x="0" y="0" width="40" height="50" rx="4" fill="#ECFDF5" stroke="#22C55E" strokeWidth="1" />
            <rect x="5" y="5" width="30" height="20" rx="2" fill="#22C55E" opacity="0.3" />
            <rect x="5" y="30" width="12" height="12" rx="2" fill="#22C55E" opacity="0.5" />
            <rect x="20" y="30" width="15" height="5" rx="1" fill="#22C55E" opacity="0.5" />
            <rect x="20" y="37" width="15" height="5" rx="1" fill="#22C55E" opacity="0.5" />
          </g>
          
          <text x="70" y="35" textAnchor="start" fill="#16325C" fontSize="12" fontWeight="600">Sandbox</text>
          <text x="70" y="50" textAnchor="start" fill="#6B7280" fontSize="10">Environment</text>
          
          {/* Success Animation */}
          <g transform="translate(110, 55)">
            <circle cx="0" cy="0" r="12" fill="#22C55E">
              <animate attributeName="r" values="12;14;12" dur="1s" repeatCount="indefinite" />
            </circle>
            <path d="M-5 0 L-2 3 L5 -4" stroke="white" strokeWidth="2" fill="none" />
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STATUS INDICATORS LEGEND */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(560, 270)">
          <rect x="0" y="0" width="130" height="70" rx="8" fill="white" stroke="#E5E7EB" filter="url(#shadow)" />
          <text x="65" y="18" textAnchor="middle" fill="#16325C" fontSize="10" fontWeight="700">Status Indicators</text>
          
          <g transform="translate(12, 28)">
            <circle cx="8" cy="8" r="6" fill="#22C55E" />
            <text x="22" y="12" fill="#6B7280" fontSize="9">Success</text>
          </g>
          
          <g transform="translate(70, 28)">
            <circle cx="8" cy="8" r="6" fill="#F59E0B" />
            <text x="22" y="12" fill="#6B7280" fontSize="9">Warning</text>
          </g>
          
          <g transform="translate(12, 48)">
            <circle cx="8" cy="8" r="6" fill="#EF4444" />
            <text x="22" y="12" fill="#6B7280" fontSize="9">Failed</text>
          </g>
          
          <g transform="translate(70, 48)">
            <circle cx="8" cy="8" r="6" fill="#3B82F6">
              <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
            </circle>
            <text x="22" y="12" fill="#6B7280" fontSize="9">Running</text>
          </g>
        </g>

      </svg>
    </div>
  );
}
