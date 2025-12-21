'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { 
  Shield, Users, Briefcase, Building2, FileCheck, 
  ChevronRight, AlertTriangle, CheckCircle, ArrowUp,
  Sparkles, RefreshCw, Info, TrendingUp, XCircle,
  ZoomIn, ZoomOut, Move, RotateCcw, UserCheck, UserX,
  Flame, Activity, Plus, HelpCircle, Zap, Heart
} from 'lucide-react';

// =============================================================================
// ROLE STATUS & BUSINESS INTELLIGENCE TYPES
// =============================================================================

type RoleStatus = 'active' | 'missing' | 'overloaded';
type StressLevel = 'low' | 'medium' | 'high' | 'critical';

interface RoleIntelligence {
  status: RoleStatus;
  stressLevel: StressLevel;
  tasksHandled: number;
  fallbackApprovals: number;
  avgApprovalTime: string;
  riskContext: string;
  whyImportant: string;
  whatHappensWithout: string;
}

// Simulated business intelligence data - in real app this comes from API
// Roles match actual ERP roles from seed-rbac.js
const roleIntelligenceData: Record<string, RoleIntelligence> = {
  'Super Admin': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 12,
    fallbackApprovals: 0,
    avgApprovalTime: '1.0 hrs',
    riskContext: 'Platform-level authority, handles multi-tenant operations',
    whyImportant: 'Full system access, platform configuration, multi-tenant management',
    whatHappensWithout: 'N/A - Highest authority in system'
  },
  'Admin': {
    status: 'active',
    stressLevel: 'high',
    tasksHandled: 156,
    fallbackApprovals: 89,
    avgApprovalTime: '2.3 hrs',
    riskContext: 'Admin is handling 89 approvals that should go to missing roles',
    whyImportant: 'Central authority for all business decisions and escalations',
    whatHappensWithout: 'Super Admin must handle business operations directly'
  },
  'System Administrator': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 18,
    fallbackApprovals: 3,
    avgApprovalTime: '1.5 hrs',
    riskContext: 'Handling system governance and user provisioning',
    whyImportant: 'System administration, user access, security configuration',
    whatHappensWithout: 'Admin handles all system tasks, adding to workload'
  },
  'CFO': {
    status: 'missing',
    stressLevel: 'low',
    tasksHandled: 0,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Financial approvals over ₹1L are handled by Admin, causing delays',
    whyImportant: 'Strategic financial oversight, budget control, compliance',
    whatHappensWithout: 'Admin handles all high-value financial decisions, increasing workload by ~35%'
  },
  'Finance Controller': {
    status: 'active',
    stressLevel: 'medium',
    tasksHandled: 67,
    fallbackApprovals: 12,
    avgApprovalTime: '4.1 hrs',
    riskContext: 'Handling some CFO-level approvals due to missing CFO',
    whyImportant: 'Financial control and reporting, vendor payments, budgets',
    whatHappensWithout: 'CFO or Admin must handle all payment approvals ₹1L+'
  },
  'IT Admin': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 23,
    fallbackApprovals: 5,
    avgApprovalTime: '1.5 hrs',
    riskContext: 'Stable workload, handling normal IT operations',
    whyImportant: 'IT administration, platform operations, access provisioning',
    whatHappensWithout: 'System Admin handles IT requests, causing delays for technical issues'
  },
  'Operations Manager': {
    status: 'active',
    stressLevel: 'high',
    tasksHandled: 89,
    fallbackApprovals: 34,
    avgApprovalTime: '3.2 hrs',
    riskContext: 'Covering for missing incharges and handling broad operations',
    whyImportant: 'Operations oversight and coordination, resource allocation',
    whatHappensWithout: 'Finance Controller must handle operations, creating bottlenecks'
  },
  'Treasury': {
    status: 'missing',
    stressLevel: 'low',
    tasksHandled: 0,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Cash and bank transactions handled by Finance Controller',
    whyImportant: 'Cash management and treasury operations, bank relations',
    whatHappensWithout: 'Finance Controller handles banking, adding 15-20% to their workload'
  },
  'Manager': {
    status: 'active',
    stressLevel: 'medium',
    tasksHandled: 45,
    fallbackApprovals: 8,
    avgApprovalTime: '2.8 hrs',
    riskContext: 'Handling normal department operations',
    whyImportant: 'Managerial access, department oversight, team management',
    whatHappensWithout: 'Operations Manager handles department decisions, increasing bottleneck'
  },
  'Compliance': {
    status: 'missing',
    stressLevel: 'low',
    tasksHandled: 0,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Regulatory compliance handled by Admin directly',
    whyImportant: 'Compliance and audit, regulatory adherence, policy enforcement',
    whatHappensWithout: 'Compliance risk increases; Admin handles audits and policies'
  },
  'Legal': {
    status: 'missing',
    stressLevel: 'low',
    tasksHandled: 0,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Contract reviews handled by Admin, may miss legal nuances',
    whyImportant: 'Legal and contracts, dispute resolution, vendor agreements',
    whatHappensWithout: 'Admin reviews contracts; consider external legal counsel for complex matters'
  },
  'Accounts': {
    status: 'active',
    stressLevel: 'medium',
    tasksHandled: 78,
    fallbackApprovals: 15,
    avgApprovalTime: '1.8 hrs',
    riskContext: 'Covering AP and banking tasks due to missing Banker',
    whyImportant: 'General ledger and accounting, invoice processing, expense management',
    whatHappensWithout: 'Manager handles accounts, causing financial oversight gaps'
  },
  'Banker': {
    status: 'missing',
    stressLevel: 'low',
    tasksHandled: 0,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Banking operations handled by Accounts',
    whyImportant: 'Banking liaison and reconciliation, cheque processing, transfers',
    whatHappensWithout: 'Accounts handles banking, adding 20% to their workload'
  },
  'Accounts Payable': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 34,
    fallbackApprovals: 0,
    avgApprovalTime: '1.2 hrs',
    riskContext: 'Operating normally within expected workload',
    whyImportant: 'Vendor invoices and payments, invoice matching, payment scheduling',
    whatHappensWithout: 'Accounts handles AP, slowing down payment processing'
  },
  'Procurement Officer': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 28,
    fallbackApprovals: 0,
    avgApprovalTime: '2.1 hrs',
    riskContext: 'Operating normally within expected workload',
    whyImportant: 'Purchase requests and orders, vendor sourcing, quote comparisons',
    whatHappensWithout: 'Manager handles procurement, slowing down purchasing'
  },
  'Hub Incharge': {
    status: 'active',
    stressLevel: 'medium',
    tasksHandled: 52,
    fallbackApprovals: 0,
    avgApprovalTime: '0.5 hrs',
    riskContext: 'Handling hub operations and covering for missing Store Incharge',
    whyImportant: 'Hub operations and coordination, local decisions, daily management',
    whatHappensWithout: 'Operations Manager handles hub operations directly'
  },
  'Store Incharge': {
    status: 'missing',
    stressLevel: 'low',
    tasksHandled: 0,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Store and warehouse operations handled by Hub Incharge',
    whyImportant: 'Warehouse and inventory custody, store expenses, staff scheduling',
    whatHappensWithout: 'Hub Incharge handles stores, adding to their workload'
  },
  'Staff': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 120,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Entry-level role - creates requests only',
    whyImportant: 'Standard user access, core workforce, task execution',
    whatHappensWithout: 'N/A - Entry level role'
  },
  'Demo User': {
    status: 'active',
    stressLevel: 'low',
    tasksHandled: 5,
    fallbackApprovals: 0,
    avgApprovalTime: '-',
    riskContext: 'Demonstration account - limited access',
    whyImportant: 'Demonstration account for testing and demos',
    whatHappensWithout: 'N/A - Demo account'
  }
};

interface RoleConfig {
  level: number;
  levelLabel: string;
  wing: 'Executive' | 'Management' | 'Officer' | 'Operations' | 'Execution';
  roles: {
    name: string;
    description: string;
    canApprove: string[];
    reportsTo: string;
    fallbackWhenMissing: string;
  }[];
}

const rolesConfig: RoleConfig[] = [
  {
    level: 10,
    levelLabel: 'L10 - Super Admin',
    wing: 'Executive',
    roles: [
      { 
        name: 'Super Admin', 
        description: 'Full system access - Platform level administrator',
        canApprove: ['All system operations', 'Multi-tenant management', 'Platform configuration'],
        reportsTo: '-',
        fallbackWhenMissing: 'N/A - Highest authority'
      }
    ]
  },
  {
    level: 9,
    levelLabel: 'L9 - Admin & Executive',
    wing: 'Executive',
    roles: [
      { 
        name: 'Admin', 
        description: 'Organization administrator - Central authority for this business',
        canApprove: ['High-value approvals (₹10L+)', 'User management', 'Module access', 'All escalations'],
        reportsTo: 'Super Admin (L10)',
        fallbackWhenMissing: 'System escalates to Super Admin'
      },
      { 
        name: 'System Administrator', 
        description: 'System administration and governance',
        canApprove: ['System configuration', 'User provisioning', 'Security settings'],
        reportsTo: 'Super Admin (L10)',
        fallbackWhenMissing: 'Admin handles system tasks'
      },
      { 
        name: 'CFO', 
        description: 'Chief Financial Officer',
        canApprove: ['All financial approvals', 'Budget allocations', 'Expense claims over ₹1L'],
        reportsTo: 'Admin (L9)',
        fallbackWhenMissing: 'Admin takes over financial approvals'
      }
    ]
  },
  {
    level: 8,
    levelLabel: 'L8 - Controller & IT Admin',
    wing: 'Executive',
    roles: [
      { 
        name: 'Finance Controller', 
        description: 'Financial control and reporting',
        canApprove: ['Purchase orders ₹1L-10L', 'Vendor payments', 'Budget transfers'],
        reportsTo: 'CFO (L9)',
        fallbackWhenMissing: 'CFO or Admin takes over'
      },
      { 
        name: 'IT Admin', 
        description: 'IT administration and platform operations',
        canApprove: ['IT requests', 'Access provisioning', 'System updates'],
        reportsTo: 'System Administrator (L9)',
        fallbackWhenMissing: 'System Admin handles IT approvals'
      }
    ]
  },
  {
    level: 7,
    levelLabel: 'L7 - Operations & Treasury',
    wing: 'Management',
    roles: [
      { 
        name: 'Operations Manager', 
        description: 'Operations oversight and coordination',
        canApprove: ['Operational expenses ₹50K-1L', 'Staff scheduling', 'Resource allocation'],
        reportsTo: 'Finance Controller (L8)',
        fallbackWhenMissing: 'Finance Controller approves operations'
      },
      { 
        name: 'Treasury', 
        description: 'Cash management and treasury operations',
        canApprove: ['Cash management', 'Bank transactions', 'Investment decisions'],
        reportsTo: 'CFO (L9)',
        fallbackWhenMissing: 'CFO directly handles treasury'
      }
    ]
  },
  {
    level: 6,
    levelLabel: 'L6 - Manager & Compliance',
    wing: 'Management',
    roles: [
      { 
        name: 'Manager', 
        description: 'Managerial access - Department manager',
        canApprove: ['Team expenses ₹10K-50K', 'Task assignments', 'Performance reviews'],
        reportsTo: 'Operations Manager (L7)',
        fallbackWhenMissing: 'Ops Manager takes department decisions'
      },
      { 
        name: 'Compliance', 
        description: 'Compliance and audit',
        canApprove: ['Compliance documents', 'Audit responses', 'Policy changes'],
        reportsTo: 'CFO (L9)',
        fallbackWhenMissing: 'CFO handles compliance matters'
      },
      { 
        name: 'Legal', 
        description: 'Legal and contracts',
        canApprove: ['Contract reviews', 'Legal disputes', 'Vendor agreements'],
        reportsTo: 'Admin (L9)',
        fallbackWhenMissing: 'Admin handles legal matters'
      }
    ]
  },
  {
    level: 5,
    levelLabel: 'L5 - Senior Officer',
    wing: 'Officer',
    roles: [
      { 
        name: 'Accounts', 
        description: 'General ledger and accounting',
        canApprove: ['Invoice verifications', 'Payment processing', 'Expense reports up to ₹10K'],
        reportsTo: 'Manager (L6)',
        fallbackWhenMissing: 'Manager verifies accounts'
      },
      { 
        name: 'Banker', 
        description: 'Banking liaison and reconciliation',
        canApprove: ['Bank reconciliation', 'Cheque processing', 'Transfer requests'],
        reportsTo: 'Treasury (L7)',
        fallbackWhenMissing: 'Treasury handles banking'
      }
    ]
  },
  {
    level: 4,
    levelLabel: 'L4 - Officer',
    wing: 'Officer',
    roles: [
      { 
        name: 'Accounts Payable', 
        description: 'Vendor invoices and payments',
        canApprove: ['Vendor invoice matching', 'Payment scheduling', 'AP queries'],
        reportsTo: 'Accounts (L5)',
        fallbackWhenMissing: 'Senior Accounts handles AP'
      },
      { 
        name: 'Procurement Officer', 
        description: 'Purchase requests and orders',
        canApprove: ['Purchase requisitions up to ₹5K', 'Vendor selection', 'Quote comparisons'],
        reportsTo: 'Manager (L6)',
        fallbackWhenMissing: 'Manager handles procurement'
      }
    ]
  },
  {
    level: 3,
    levelLabel: 'L3 - Incharge',
    wing: 'Operations',
    roles: [
      { 
        name: 'Hub Incharge', 
        description: 'Hub operations and coordination',
        canApprove: ['Daily operations', 'Local purchases up to ₹2K', 'Staff attendance'],
        reportsTo: 'Operations Manager (L7)',
        fallbackWhenMissing: 'Ops Manager controls hub operations'
      },
      { 
        name: 'Store Incharge', 
        description: 'Warehouse and inventory custody',
        canApprove: ['Inventory adjustments', 'Store expenses up to ₹2K', 'Staff scheduling'],
        reportsTo: 'Operations Manager (L7)',
        fallbackWhenMissing: 'Ops Manager takes over store operations'
      }
    ]
  },
  {
    level: 1,
    levelLabel: 'L1 - Staff',
    wing: 'Execution',
    roles: [
      { 
        name: 'Staff', 
        description: 'Standard user access - General staff member',
        canApprove: ['Cannot approve - only creates requests'],
        reportsTo: 'Hub/Store Incharge (L3)',
        fallbackWhenMissing: 'N/A - Entry level role'
      },
      { 
        name: 'Demo User', 
        description: 'Demonstration account',
        canApprove: ['Cannot approve - demo only'],
        reportsTo: 'Manager (L6)',
        fallbackWhenMissing: 'N/A - Demo account'
      }
    ]
  }
];

// Workflow scenarios for simulation - using actual ERP roles
const workflowScenarios = [
  {
    title: 'High-Value Payment Request',
    description: 'A ₹15L payment request initiated by Staff',
    path: [
      { key: 'L1-Staff', msg: 'Staff initiates payment request for ₹15L' },
      { key: 'L3-Hub Incharge', msg: 'Hub Incharge reviews and forwards' },
      { key: 'L4-Accounts Payable', msg: 'AP validates vendor and invoice' },
      { key: 'L5-Accounts', msg: 'Accounts verifies budget availability' },
      { key: 'L8-Finance Controller', msg: 'Controller reviews for ₹10L+ threshold' },
      { key: 'L9-CFO', msg: 'CFO gives final approval for high-value payment' }
    ]
  },
  {
    title: 'Purchase Order Flow',
    description: 'A ₹75K equipment purchase request',
    path: [
      { key: 'L1-Staff', msg: 'Staff creates purchase requisition' },
      { key: 'L3-Hub Incharge', msg: 'Hub Incharge validates the need' },
      { key: 'L4-Procurement Officer', msg: 'Procurement gets vendor quotes' },
      { key: 'L6-Manager', msg: 'Manager approves ₹10K-50K range' },
      { key: 'L7-Operations Manager', msg: 'Ops Manager approves ₹50K+ purchase' }
    ]
  },
  {
    title: 'Employee Expense Claim',
    description: 'A ₹25K travel expense reimbursement',
    path: [
      { key: 'L1-Staff', msg: 'Staff submits expense claim with receipts' },
      { key: 'L3-Hub Incharge', msg: 'Hub Incharge verifies claim authenticity' },
      { key: 'L5-Accounts', msg: 'Accounts validates expense policies' },
      { key: 'L6-Manager', msg: 'Manager approves ₹10K-50K claim' }
    ]
  },
  {
    title: 'Vendor Onboarding',
    description: 'New vendor registration and approval',
    path: [
      { key: 'L4-Procurement Officer', msg: 'Procurement initiates vendor registration' },
      { key: 'L5-Accounts', msg: 'Accounts reviews vendor documents' },
      { key: 'L6-Legal', msg: 'Legal reviews contract terms' },
      { key: 'L6-Compliance', msg: 'Compliance verifies regulatory status' },
      { key: 'L8-Finance Controller', msg: 'Controller approves vendor credit terms' }
    ]
  },
  {
    title: 'System Access Request',
    description: 'New employee needs ERP access',
    path: [
      { key: 'L6-Manager', msg: 'Manager initiates access request for new hire' },
      { key: 'L7-Operations Manager', msg: 'Ops Manager specifies required modules' },
      { key: 'L8-IT Admin', msg: 'IT Admin provisions access credentials' },
      { key: 'L9-Admin', msg: 'Admin approves role and permissions' }
    ]
  }
];

// Role progression roadmap - when to hire each role (using actual ERP roles)
const roleProgressionRoadmap = [
  {
    stage: 'Startup (1-5 employees)',
    roles: ['Staff', 'Admin'],
    advice: 'Start with Admin handling everything. Staff does data entry.',
    nextHire: 'Hub Incharge - when you have 3+ staff members at a location'
  },
  {
    stage: 'Small Business (5-15 employees)',
    roles: ['Staff', 'Hub Incharge', 'Manager', 'Admin'],
    advice: 'Add Hub Incharge for location oversight. Manager handles department decisions.',
    nextHire: 'Accounts - when financial transactions exceed 50/month'
  },
  {
    stage: 'Growing Business (15-50 employees)',
    roles: ['Staff', 'Hub Incharge', 'Accounts', 'Manager', 'Operations Manager', 'Admin'],
    advice: 'Operations Manager coordinates across locations. Accounts handles finances.',
    nextHire: 'Finance Controller - when monthly transactions exceed ₹50L'
  },
  {
    stage: 'Established Business (50-200 employees)',
    roles: ['Full L1-L8 hierarchy', 'CFO', 'Admin'],
    advice: 'CFO for strategic financial decisions. Full hierarchy for accountability.',
    nextHire: 'Specialized roles (IT Admin, Legal, Compliance) based on need'
  },
  {
    stage: 'Enterprise (200+ employees)',
    roles: ['Full L1-L10 hierarchy'],
    advice: 'Super Admin for multi-tenant/multi-location oversight. Full role specialization.',
    nextHire: 'System Administrator for platform governance'
  }
];

// =============================================================================
// COMPONENT
// =============================================================================

// Interface for real role data from API
interface RealRoleData {
  roleName: string;
  userCount: number;
  activeUserCount: number;
  users: { id: number; name: string; email: string }[];
}

export default function SystemFlowPage() {
  const { hasAccess, user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<typeof workflowScenarios[0] | null>(null);
  const [simulationStep, setSimulationStep] = useState<number>(-1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'roadmap' | 'fallback'>('hierarchy');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [virtuallyAddedRoles, setVirtuallyAddedRoles] = useState<Set<string>>(new Set());
  
  // View Mode: 'real' shows actual database data, 'simulation' shows testing mode
  const [viewMode, setViewMode] = useState<'real' | 'simulation'>('real');
  const [realRoleData, setRealRoleData] = useState<RealRoleData[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [realDataError, setRealDataError] = useState<string | null>(null);
  
  // Zoom and Pan state
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Fetch real role data from API
  useEffect(() => {
    if (viewMode === 'real') {
      fetchRealRoleData();
    }
  }, [viewMode]);

  const fetchRealRoleData = async () => {
    setIsLoadingRealData(true);
    setRealDataError(null);
    try {
      const response = await fetch('/api/privileges/roles-with-users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Transform API response to our format
        const roleData: RealRoleData[] = (data.roles || data || []).map((role: any) => ({
          roleName: role.name || role.roleName,
          userCount: role.userCount || role.users?.length || 0,
          activeUserCount: role.activeUserCount || role.users?.filter((u: any) => u.isActive !== false).length || 0,
          users: role.users || []
        }));
        setRealRoleData(roleData);
      } else {
        // Fallback: try alternative endpoint
        const altResponse = await fetch('/api/privileges/roles', {
          credentials: 'include'
        });
        if (altResponse.ok) {
          const data = await altResponse.json();
          const roleData: RealRoleData[] = (data.roles || data || []).map((role: any) => ({
            roleName: role.name || role.roleName,
            userCount: role.userCount || 0,
            activeUserCount: role.activeUserCount || 0,
            users: []
          }));
          setRealRoleData(roleData);
        } else {
          setRealDataError('Could not fetch role data');
        }
      }
    } catch (error) {
      console.error('Error fetching role data:', error);
      setRealDataError('Failed to connect to server');
    } finally {
      setIsLoadingRealData(false);
    }
  };

  // Get real role info
  const getRealRoleInfo = useCallback((roleName: string) => {
    const found = realRoleData.find(r => 
      r.roleName.toLowerCase() === roleName.toLowerCase() ||
      r.roleName.toLowerCase().replace(/\s+/g, '') === roleName.toLowerCase().replace(/\s+/g, '')
    );
    return found || { roleName, userCount: 0, activeUserCount: 0, users: [] };
  }, [realRoleData]);

  // Calculate real stats
  const realStats = useMemo(() => {
    const totalRolesInERP = rolesConfig.flatMap(l => l.roles).length;
    const rolesWithUsers = realRoleData.filter(r => r.userCount > 0).length;
    const rolesWithoutUsers = totalRolesInERP - rolesWithUsers;
    const totalUsers = realRoleData.reduce((sum, r) => sum + r.userCount, 0);
    const activeUsers = realRoleData.reduce((sum, r) => sum + r.activeUserCount, 0);
    
    return {
      totalRolesInERP,
      rolesWithUsers,
      rolesWithoutUsers,
      totalUsers,
      activeUsers,
      coveragePercent: totalRolesInERP > 0 ? Math.round((rolesWithUsers / totalRolesInERP) * 100) : 0
    };
  }, [realRoleData]);

  // Calculate business metrics
  const businessMetrics = useMemo(() => {
    const missingRoles = Object.entries(roleIntelligenceData)
      .filter(([_, data]) => data.status === 'missing' && !virtuallyAddedRoles.has(_))
      .map(([name]) => name);
    
    const overloadedRoles = Object.entries(roleIntelligenceData)
      .filter(([_, data]) => data.status !== 'missing' && (data.stressLevel === 'high' || data.stressLevel === 'critical'))
      .map(([name]) => name);
    
    const totalFallbackApprovals = Object.values(roleIntelligenceData)
      .reduce((sum, data) => sum + data.fallbackApprovals, 0);
    
    const adminData = roleIntelligenceData['Admin'];
    const adminFallbackPercentage = adminData ? 
      Math.round((adminData.fallbackApprovals / adminData.tasksHandled) * 100) : 0;
    
    // Calculate workload reduction if virtual roles were added
    const potentialReduction = Array.from(virtuallyAddedRoles).reduce((sum, role) => {
      const roleData = roleIntelligenceData[role];
      if (roleData && roleData.status === 'missing') {
        // Estimate based on typical workload for this role type
        const levelMatch = rolesConfig.flatMap(l => l.roles).find(r => r.name === role);
        if (levelMatch) {
          // Higher level roles reduce more Admin burden
          const level = rolesConfig.find(l => l.roles.some(r => r.name === role))?.level || 5;
          return sum + (level * 3); // Rough estimate: higher levels = more reduction
        }
      }
      return sum;
    }, 0);
    
    return {
      missingRoles,
      missingCount: missingRoles.length,
      overloadedRoles,
      overloadedCount: overloadedRoles.length,
      totalFallbackApprovals,
      adminFallbackPercentage,
      potentialReduction: Math.min(potentialReduction, 70), // Cap at 70%
      activeRolesCount: Object.values(roleIntelligenceData).filter(d => d.status === 'active').length,
    };
  }, [virtuallyAddedRoles]);

  // Get role intelligence for a role
  const getRoleIntelligence = useCallback((roleName: string): RoleIntelligence => {
    const baseData = roleIntelligenceData[roleName];
    if (!baseData) {
      return {
        status: 'active',
        stressLevel: 'low',
        tasksHandled: 0,
        fallbackApprovals: 0,
        avgApprovalTime: '-',
        riskContext: 'No data available',
        whyImportant: 'Role information not available',
        whatHappensWithout: 'Unknown impact'
      };
    }
    
    // If virtually added, change status to active
    if (virtuallyAddedRoles.has(roleName) && baseData.status === 'missing') {
      return {
        ...baseData,
        status: 'active',
        stressLevel: 'low',
        tasksHandled: 15, // Simulated
        riskContext: '(Virtually added) Would handle normal workload'
      };
    }
    
    return baseData;
  }, [virtuallyAddedRoles]);

  // Toggle virtual role
  const toggleVirtualRole = useCallback((roleName: string) => {
    setVirtuallyAddedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleName)) {
        newSet.delete(roleName);
      } else {
        newSet.add(roleName);
      }
      return newSet;
    });
  }, []);

  // Get stress color
  const getStressColor = (level: StressLevel, status: RoleStatus) => {
    if (status === 'missing') return 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500';
    switch (level) {
      case 'low': return 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600';
      case 'high': return 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600';
      case 'critical': return 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  };

  // Get stress badge color
  const getStressBadgeColor = (level: StressLevel) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Get all roles flattened for lookup (moved up before getPathExplanation needs it)
  const allRoles = rolesConfig.flatMap(lvl => 
    lvl.roles.map(r => ({ ...r, level: lvl.level, levelLabel: lvl.levelLabel, wing: lvl.wing }))
  );

  // Create roleExistenceState from roleIntelligenceData
  const roleExistenceState = useMemo(() => {
    const state: Record<string, 'active' | 'missing' | 'overloaded'> = {};
    Object.entries(roleIntelligenceData).forEach(([role, data]) => {
      if (virtuallyAddedRoles.has(role)) {
        state[role] = 'active';
      } else {
        state[role] = data.status;
      }
    });
    return state;
  }, [virtuallyAddedRoles]);

  // Calculate admin fallback metrics
  const adminFallbackMetrics = useMemo(() => {
    const missingRoles = Object.entries(roleIntelligenceData)
      .filter(([role, data]) => data.status === 'missing' && !virtuallyAddedRoles.has(role));
    
    const adminData = roleIntelligenceData['Admin'];
    return {
      rolesFallingBack: missingRoles.length,
      totalApprovalsHandled: adminData?.fallbackApprovals || 0,
      percentageOfWork: adminData ? Math.round((adminData.fallbackApprovals / adminData.tasksHandled) * 100) : 0
    };
  }, [virtuallyAddedRoles]);

  // Generate path explanation for simulation
  const getPathExplanation = useCallback((step: { key: string; msg: string }, stepIndex: number) => {
    const roleName = step.key.split('-')[1];
    const roleData = getRoleIntelligence(roleName);
    
    if (roleData.status === 'missing' && !virtuallyAddedRoles.has(roleName)) {
      // Find who handles this
      const roleConfig = allRoles.find(r => r.name === roleName);
      const fallback = roleConfig?.fallbackWhenMissing || 'Admin';
      return {
        skipped: true,
        reason: `${roleName} role does not exist`,
        handledBy: fallback.includes('Admin') ? 'Admin' : fallback.split(' ')[0],
        impact: `Approval redirected to ${fallback}`
      };
    }
    
    return { skipped: false, reason: null, handledBy: roleName, impact: null };
  }, [allRoles, getRoleIntelligence, virtuallyAddedRoles]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.3, Math.min(2, z + delta)));
  };

  const resetView = () => {
    setZoom(0.75);
    setPan({ x: 0, y: 0 });
  };

  // Get node positions - 4 LAYER CIRCULAR LAYOUT
  // Layer 0 (Center): Admin
  // Layer 1: Top Executives (L9: Admin, CFO, CTO, Director)
  // Layer 2: Controllers/Managers (L7-L8)
  // Layer 3: Officers and Staff (L1-L6)
  const getNodePosition = useCallback((level: number, index: number, total: number, wing: string) => {
    const centerX = 500;
    const centerY = 500;
    
    // Admin at center
    if (level === 10) {
      return { x: centerX, y: centerY };
    }
    
    // Determine which layer based on level
    let layerRadius: number;
    let layerRoles: number; // How many roles in this layer for angle calculation
    let layerIndex: number; // Position of this role within the layer
    
    if (level === 9) {
      // Layer 1: Top Executives - closest to center
      layerRadius = 140;
      layerRoles = total; // L9 has 4 roles
      layerIndex = index;
    } else if (level === 7 || level === 8) {
      // Layer 2: Controllers and Senior Managers
      layerRadius = 250;
      // Need to combine L7 and L8 roles for positioning
      // Get count of all L7+L8 roles
      const l7l8Roles = rolesConfig.filter(l => l.level === 7 || l.level === 8);
      layerRoles = l7l8Roles.reduce((sum, l) => sum + l.roles.length, 0);
      // Calculate global index within this combined layer
      const l8Count = rolesConfig.find(l => l.level === 8)?.roles.length || 0;
      layerIndex = level === 8 ? index : l8Count + index;
    } else {
      // Layer 3: All other roles (L1-L6) - outermost
      layerRadius = 380;
      // Combine all L1-L6 roles
      const l1to6Roles = rolesConfig.filter(l => l.level >= 1 && l.level <= 6);
      layerRoles = l1to6Roles.reduce((sum, l) => sum + l.roles.length, 0);
      // Calculate global index - count all roles from higher levels first
      let runningIndex = 0;
      for (const cfg of l1to6Roles.sort((a, b) => b.level - a.level)) {
        if (cfg.level === level) {
          layerIndex = runningIndex + index;
          break;
        }
        runningIndex += cfg.roles.length;
      }
      layerIndex = layerIndex!;
    }
    
    // Distribute evenly around the circle
    const angleStep = (2 * Math.PI) / layerRoles;
    const startAngle = -Math.PI / 2; // Start from top
    const angle = startAngle + (layerIndex * angleStep);
    
    const x = centerX + layerRadius * Math.cos(angle);
    const y = centerY + layerRadius * Math.sin(angle);

    return { x, y };
  }, []);

  // Run simulation
  const runSimulation = useCallback(async (scenario: typeof workflowScenarios[0]) => {
    setActiveScenario(scenario);
    setIsSimulating(true);
    setSimulationStep(-1);

    for (let i = 0; i < scenario.path.length; i++) {
      setSimulationStep(i);
      setSelectedNode(scenario.path[i].key);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setIsSimulating(false);
  }, []);

  // Get color for wing
  const getWingColor = (wing: string) => {
    switch (wing) {
      case 'Executive': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      case 'Management': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'Officer': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'Operations': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
      case 'Execution': return 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  };

  const getWingTextColor = (wing: string) => {
    switch (wing) {
      case 'Executive': return 'text-purple-700 dark:text-purple-300';
      case 'Management': return 'text-blue-700 dark:text-blue-300';
      case 'Officer': return 'text-green-700 dark:text-green-300';
      case 'Operations': return 'text-orange-700 dark:text-orange-300';
      case 'Execution': return 'text-gray-700 dark:text-gray-300';
      default: return 'text-gray-700 dark:text-gray-300';
    }
  };

  // Access check - allow ADMIN, SUPER_ADMIN, ENTERPRISE_ADMIN
  const userRole = user?.roleName || user?.role || '';
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'];
  const hasPageAccess = allowedRoles.some(role => 
    userRole.toUpperCase().includes(role) || userRole.toUpperCase() === role
  );

  if (!hasPageAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
            Structural Flow Architect
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
            A 10-level hierarchy visualization mapping 21 authority nodes. Interactive pathing shows exactly how decisions move from entry-level Staff to Admin.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'hierarchy'
              ? 'bg-[#102A4A] text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Role Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'roadmap'
                ? 'bg-[#102A4A] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Growth Roadmap
          </button>
          <button
            onClick={() => setActiveTab('fallback')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'fallback'
                ? 'bg-[#102A4A] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Fallback Rules
          </button>
        </div>
      </div>

      {/* View Mode Toggle - Real Scenario vs Simulation */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">View Mode:</span>
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setViewMode('real')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'real'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Real Scenario</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('simulation')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'simulation'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Simulation</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Mode Description */}
        <div className="flex items-center gap-3">
          {viewMode === 'real' ? (
            <>
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Live Database View</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Showing actual users assigned to roles</p>
              </div>
              <button
                onClick={fetchRealRoleData}
                disabled={isLoadingRealData}
                className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRealData ? 'animate-spin' : ''}`} />
              </button>
            </>
          ) : (
            <div className="text-right">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Testing Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Simulate workflows & virtual role additions</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Real Mode: Show actual database stats */}
          {viewMode === 'real' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Total Roles in ERP */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Roles</span>
                </div>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {realStats.totalRolesInERP}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Defined in ERP</p>
              </div>
              
              {/* Roles With Users */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Roles Filled</span>
                </div>
                <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {isLoadingRealData ? '...' : realStats.rolesWithUsers}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Have assigned users</p>
              </div>
              
              {/* Roles Without Users */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Roles Empty</span>
                </div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {isLoadingRealData ? '...' : realStats.rolesWithoutUsers}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Need user assignment</p>
              </div>
              
              {/* Total Users */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {isLoadingRealData ? '...' : realStats.totalUsers}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Across all roles</p>
              </div>
              
              {/* Coverage */}
              <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                realStats.coveragePercent >= 70 
                  ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700'
                  : realStats.coveragePercent >= 40
                    ? 'from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-200 dark:border-yellow-700'
                    : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5" />
                  <span className="text-sm font-medium">Coverage</span>
                </div>
                <div className="text-2xl font-bold">
                  {isLoadingRealData ? '...' : `${realStats.coveragePercent}%`}
                </div>
                <p className="text-xs mt-1">Role utilization</p>
              </div>
            </div>
          )}

          {/* Simulation Mode: Show simulated business intelligence */}
          {viewMode === 'simulation' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Active Roles */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Active Roles</span>
                </div>
                <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {Object.values(roleExistenceState).filter(s => s === 'active').length}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Simulated staffed positions</p>
              </div>
              
              {/* Missing Roles */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 border border-red-200 dark:border-red-700">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Missing Roles</span>
                </div>
                <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {Object.values(roleExistenceState).filter(s => s === 'missing').length}
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Positions need hiring</p>
              </div>
              
              {/* Admin Workload */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Admin Overload</span>
                </div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {adminFallbackMetrics.totalApprovalsHandled}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Extra tasks from {adminFallbackMetrics.rolesFallingBack} missing roles</p>
              </div>
              
              {/* System Health */}
              <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                adminFallbackMetrics.rolesFallingBack === 0 
                  ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700'
                  : adminFallbackMetrics.rolesFallingBack <= 2
                    ? 'from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-200 dark:border-yellow-700'
                    : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className={`w-5 h-5 ${
                    adminFallbackMetrics.rolesFallingBack === 0 
                      ? 'text-green-600 dark:text-green-400'
                      : adminFallbackMetrics.rolesFallingBack <= 2
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    adminFallbackMetrics.rolesFallingBack === 0 
                      ? 'text-green-700 dark:text-green-300'
                      : adminFallbackMetrics.rolesFallingBack <= 2
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-red-700 dark:text-red-300'
                  }`}>System Health</span>
                </div>
                <div className={`text-2xl font-bold ${
                  adminFallbackMetrics.rolesFallingBack === 0 
                    ? 'text-green-800 dark:text-green-200'
                    : adminFallbackMetrics.rolesFallingBack <= 2
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-red-800 dark:text-red-200'
                }`}>
                  {adminFallbackMetrics.rolesFallingBack === 0 ? 'Healthy' : adminFallbackMetrics.rolesFallingBack <= 2 ? 'Warning' : 'Critical'}
                </div>
                <p className={`text-xs mt-1 ${
                  adminFallbackMetrics.rolesFallingBack === 0 
                    ? 'text-green-600 dark:text-green-400'
                    : adminFallbackMetrics.rolesFallingBack <= 2
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                }`}>
                  {adminFallbackMetrics.rolesFallingBack === 0 ? 'All roles filled' : 'Hiring recommended'}
                </p>
              </div>
            </div>
          )}

          {/* Error message for real data */}
          {viewMode === 'real' && realDataError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span>{realDataError}</span>
                <button 
                  onClick={fetchRealRoleData}
                  className="ml-auto text-sm underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area - Full width graph */}
          <div>
            {/* Radial Visualization - Full width with pan/zoom */}
            <div>
              <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                  <button
                    onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={resetView}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Reset View"
                  >
                    <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                {/* Pan hint */}
                <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/50 text-white text-xs rounded-lg">
                  <Move className="w-3 h-3" />
                  Drag to pan • Scroll to zoom
                </div>
                
                {/* Pannable/Zoomable Container */}
                <div 
                  ref={containerRef}
                  className="relative cursor-grab active:cursor-grabbing select-none"
                  style={{ height: '650px', overflow: 'hidden' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  {/* Transformed content wrapper */}
                  <div
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      width: '1000px',
                      height: '1000px',
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      marginLeft: '-500px',
                      marginTop: '-500px',
                    }}
                  >
                    {/* Layer Rings - 3 concentric circles */}
                    {[140, 250, 380].map((radius, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 left-1/2 border border-dashed border-gray-300 dark:border-gray-600 rounded-full pointer-events-none opacity-30"
                        style={{
                          width: `${radius * 2}px`,
                          height: `${radius * 2}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}

                    {/* Center Hub - Admin with Fallback Metrics */}
                    {(() => {
                      const adminRealInfo = getRealRoleInfo('Admin');
                      const superAdminRealInfo = getRealRoleInfo('Super Admin');
                      
                      return (
                        <div 
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-[#102A4A] text-white rounded-full flex flex-col items-center justify-center shadow-2xl z-50 border-4 border-amber-400 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setSelectedNode('L10-Admin')}
                          onMouseEnter={() => setHoveredNode('L10-Admin')}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          <Shield className="w-6 h-6 text-amber-400 mb-0.5" />
                          <span className="font-bold text-sm">ADMIN</span>
                          <span className="text-amber-400 text-[9px] font-bold">CENTRAL HUB</span>
                          
                          {/* Real mode: Show actual admin user count */}
                          {viewMode === 'real' && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                              <Users className="w-2.5 h-2.5" />
                              {adminRealInfo.userCount + superAdminRealInfo.userCount} admin(s)
                            </div>
                          )}
                          
                          {/* Simulation mode: Fallback indicator */}
                          {viewMode === 'simulation' && businessMetrics.missingCount > 0 && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-orange-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                              <Flame className="w-2.5 h-2.5" />
                              {businessMetrics.totalFallbackApprovals} fallbacks
                            </div>
                          )}
                          
                          {/* Stress ring - only in simulation mode */}
                          {viewMode === 'simulation' && businessMetrics.missingCount > 0 && (
                            <div className="absolute inset-0 rounded-full border-4 border-orange-400/50 animate-pulse pointer-events-none" style={{ margin: '-4px' }} />
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Admin hover tooltip */}
                    {hoveredNode === 'L10-Admin' && (
                      <div className="absolute z-[100] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72"
                        style={{ left: '560px', top: '460px' }}>
                        {viewMode === 'real' ? (
                          // Real mode tooltip
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">Admin Overview</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Real database status</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Admin users:</span>
                                <span className="font-bold">{getRealRoleInfo('Admin').userCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Super Admin users:</span>
                                <span className="font-bold">{getRealRoleInfo('Super Admin').userCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Total roles filled:</span>
                                <span className="font-bold text-emerald-600">{realStats.rolesWithUsers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Roles without users:</span>
                                <span className="font-bold text-amber-600">{realStats.rolesWithoutUsers}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Simulation mode tooltip
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                <Flame className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">Admin Workload</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">Simulated pressure from missing roles</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Total tasks handled:</span>
                                <span className="font-bold">{roleIntelligenceData['Admin']?.tasksHandled || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Fallback approvals:</span>
                                <span className="font-bold text-orange-600">{roleIntelligenceData['Admin']?.fallbackApprovals || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Missing roles handled:</span>
                                <span className="font-bold text-red-600">{businessMetrics.missingCount}</span>
                              </div>
                            </div>
                            {virtuallyAddedRoles.size > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  With virtual roles: ~{businessMetrics.potentialReduction}% less workload
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Role Nodes - with business intelligence */}
                    {rolesConfig.filter(l => l.level < 10).map(levelConfig => {
                      const roles = levelConfig.roles;
                      return roles.map((role, idx) => {
                        const pos = getNodePosition(levelConfig.level, idx, roles.length, levelConfig.wing);
                        const nodeKey = `L${levelConfig.level}-${role.name}`;
                        const isActive = selectedNode === nodeKey;
                        const isHovered = hoveredNode === nodeKey;
                        const isInPath = activeScenario?.path.some(p => p.key === nodeKey) || false;
                        const pathIndex = activeScenario?.path.findIndex(p => p.key === nodeKey) ?? -1;
                        const isCurrentStep = simulationStep === pathIndex;
                        
                        // Get business intelligence (simulation mode)
                        const intelligence = getRoleIntelligence(role.name);
                        
                        // Get real data (real mode)
                        const realInfo = getRealRoleInfo(role.name);
                        const hasRealUsers = realInfo.userCount > 0;
                        
                        // Determine display based on mode
                        const isMissing = viewMode === 'real' 
                          ? !hasRealUsers 
                          : intelligence.status === 'missing';
                        const isOverloaded = viewMode === 'real'
                          ? false // Real mode doesn't have stress data yet
                          : (intelligence.stressLevel === 'high' || intelligence.stressLevel === 'critical');
                        const isVirtuallyAdded = viewMode === 'simulation' && virtuallyAddedRoles.has(role.name);

                        return (
                          <React.Fragment key={nodeKey}>
                            <div
                              className={`absolute w-32 p-2 rounded-xl border-2 shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-110 hover:shadow-xl z-40 ${
                                isActive || isCurrentStep
                                  ? 'bg-[#102A4A] text-white border-amber-400 shadow-amber-400/30 scale-110'
                                  : isInPath
                                  ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600'
                                  : isMissing && !isVirtuallyAdded
                                  ? 'bg-gray-100 dark:bg-gray-800 border-dashed border-gray-400 dark:border-gray-500 opacity-70'
                                  : isVirtuallyAdded
                                  ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 border-dashed'
                                  : viewMode === 'real' && hasRealUsers
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600'
                                  : getStressColor(intelligence.stressLevel, intelligence.status)
                              }`}
                              style={{
                                left: `${pos.x - 64}px`,
                                top: `${pos.y - 24}px`,
                              }}
                              onClick={() => setSelectedNode(nodeKey)}
                              onMouseEnter={() => setHoveredNode(nodeKey)}
                              onMouseLeave={() => setHoveredNode(null)}
                            >
                              {/* Status badge */}
                              <div className="absolute -top-2 -right-2 z-50">
                                {viewMode === 'real' ? (
                                  // Real mode badges
                                  hasRealUsers ? (
                                    <div className="min-w-5 h-5 px-1 bg-emerald-500 rounded-full flex items-center justify-center" title={`${realInfo.userCount} user(s) assigned`}>
                                      <span className="text-[10px] font-bold text-white">{realInfo.userCount}</span>
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center" title="No users assigned">
                                      <UserX className="w-3 h-3 text-white" />
                                    </div>
                                  )
                                ) : (
                                  // Simulation mode badges
                                  isMissing && !isVirtuallyAdded ? (
                                    <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center" title="Role not assigned">
                                      <UserX className="w-3 h-3 text-white" />
                                    </div>
                                  ) : isVirtuallyAdded ? (
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center" title="Virtually added">
                                      <Plus className="w-3 h-3 text-white" />
                                    </div>
                                  ) : isOverloaded ? (
                                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center animate-pulse" title="High workload">
                                      <Flame className="w-3 h-3 text-white" />
                                    </div>
                                  ) : (
                                    <div className={`w-5 h-5 ${getStressBadgeColor(intelligence.stressLevel)} rounded-full flex items-center justify-center`} title={`${intelligence.stressLevel} workload`}>
                                      <UserCheck className="w-3 h-3 text-white" />
                                    </div>
                                  )
                                )}
                              </div>
                              
                              {/* Level badge */}
                              <div className={`text-[10px] font-bold px-2 py-0.5 rounded mb-1 inline-block ${
                                isActive || isCurrentStep
                                  ? 'bg-white/10 text-amber-400'
                                  : isMissing && !isVirtuallyAdded
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                L{levelConfig.level}
                              </div>
                              
                              {/* Role name */}
                              <div className={`text-xs font-bold leading-tight ${
                                isActive || isCurrentStep 
                                  ? 'text-white' 
                                  : isMissing && !isVirtuallyAdded
                                  ? 'text-gray-500 dark:text-gray-400'
                                  : getWingTextColor(levelConfig.wing)
                              }`}>
                                {role.name}
                              </div>
                              
                              {/* Real mode: Show user count */}
                              {viewMode === 'real' && hasRealUsers && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-emerald-500" />
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    {realInfo.userCount} user{realInfo.userCount > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              
                              {/* Simulation mode: Stress indicator */}
                              {viewMode === 'simulation' && !isMissing && !isVirtuallyAdded && intelligence.tasksHandled > 0 && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-gray-400" />
                                  <span className="text-[9px] text-gray-500">{intelligence.tasksHandled} tasks</span>
                                </div>
                              )}
                              
                              {/* Missing role indicator */}
                              {isMissing && !isVirtuallyAdded && (
                                <div className="mt-1 text-[9px] text-gray-500 italic">
                                  {viewMode === 'real' ? 'No users' : 'Not assigned'}
                                </div>
                              )}
                              
                              {/* Virtually added indicator */}
                              {isVirtuallyAdded && (
                                <div className="mt-1 text-[9px] text-green-600 dark:text-green-400 font-medium">
                                  ✓ Virtual
                                </div>
                              )}
                            </div>
                            
                            {/* Role hover tooltip with intelligence */}
                            {isHovered && (
                              <div 
                                className="absolute z-[100] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 pointer-events-auto"
                                style={{ 
                                  left: `${pos.x + 70}px`, 
                                  top: `${pos.y - 20}px`,
                                }}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100">{role.name}</p>
                                    <p className="text-xs text-gray-500">{role.description}</p>
                                  </div>
                                  {isMissing && !isVirtuallyAdded && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleVirtualRole(role.name); }}
                                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Try
                                    </button>
                                  )}
                                  {isVirtuallyAdded && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleVirtualRole(role.name); }}
                                      className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded-lg"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                
                                {/* Status section */}
                                <div className={`rounded-lg p-2 mb-3 ${
                                  isMissing && !isVirtuallyAdded
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : isOverloaded
                                    ? 'bg-orange-50 dark:bg-orange-900/30'
                                    : 'bg-green-50 dark:bg-green-900/30'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    {isMissing && !isVirtuallyAdded ? (
                                      <>
                                        <UserX className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Role Not Assigned</span>
                                      </>
                                    ) : isVirtuallyAdded ? (
                                      <>
                                        <Zap className="w-4 h-4 text-green-500" />
                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Virtually Added</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-4 h-4 text-green-500" />
                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          intelligence.stressLevel === 'high' ? 'bg-orange-200 text-orange-700' :
                                          intelligence.stressLevel === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                                          'bg-green-200 text-green-700'
                                        }`}>
                                          {intelligence.stressLevel} load
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{intelligence.riskContext}</p>
                                </div>
                                
                                {/* Why important - education */}
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3" />
                                    Why this role matters
                                  </p>
                                  <p className="text-xs text-gray-700 dark:text-gray-300">{intelligence.whyImportant}</p>
                                </div>
                                
                                {/* What happens without */}
                                {isMissing && !isVirtuallyAdded && (
                                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-2">
                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Current impact</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-300">{intelligence.whatHappensWithout}</p>
                                  </div>
                                )}
                                
                                {/* Stats for active roles */}
                                {!isMissing && !isVirtuallyAdded && intelligence.tasksHandled > 0 && (
                                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                      <p className="text-[10px] text-gray-500">Tasks</p>
                                      <p className="text-sm font-bold">{intelligence.tasksHandled}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-gray-500">Avg. time</p>
                                      <p className="text-sm font-bold">{intelligence.avgApprovalTime}</p>
                                    </div>
                                    {intelligence.fallbackApprovals > 0 && (
                                      <div className="col-span-2">
                                        <p className="text-[10px] text-orange-600">Fallback approvals: {intelligence.fallbackApprovals}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      });
                    })}

                    {/* Simulation Path Lines */}
                    {activeScenario && simulationStep >= 0 && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#FBBF24" />
                          </marker>
                        </defs>
                        {activeScenario.path.slice(0, simulationStep + 1).map((step, i) => {
                          if (i === 0) return null;
                          const prevStep = activeScenario.path[i - 1];
                          
                          const prevRole = allRoles.find(r => `L${r.level}-${r.name}` === prevStep.key);
                          const currRole = allRoles.find(r => `L${r.level}-${r.name}` === step.key);
                          
                          if (!prevRole || !currRole) return null;

                          const prevLevelConfig = rolesConfig.find(l => l.level === prevRole.level);
                          const currLevelConfig = rolesConfig.find(l => l.level === currRole.level);
                          if (!prevLevelConfig || !currLevelConfig) return null;

                          const prevIdx = prevLevelConfig.roles.findIndex(r => r.name === prevRole.name);
                          const currIdx = currLevelConfig.roles.findIndex(r => r.name === currRole.name);

                          const prevPos = prevRole.level === 10 
                            ? { x: 500, y: 500 }
                            : getNodePosition(prevRole.level, prevIdx, prevLevelConfig.roles.length, prevRole.wing);
                          const currPos = currRole.level === 10
                            ? { x: 500, y: 500 }
                            : getNodePosition(currRole.level, currIdx, currLevelConfig.roles.length, currRole.wing);

                          return (
                            <line
                              key={i}
                              x1={prevPos.x}
                              y1={prevPos.y}
                              x2={currPos.x}
                              y2={currPos.y}
                              stroke="#FBBF24"
                              strokeWidth="3"
                              strokeDasharray="8,4"
                              markerEnd="url(#arrowhead)"
                              className="animate-pulse"
                            />
                          );
                        })}
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Scenarios - Bottom Section */}
          <div className="bg-[#102A4A] text-white rounded-2xl p-6">
            <h3 className="font-bold text-amber-400 uppercase text-sm tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Workflow Scenarios - Click to Simulate Approval Path
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {workflowScenarios.map((scenario, i) => (
                <button
                  key={i}
                  onClick={() => runSimulation(scenario)}
                  disabled={isSimulating}
                  className={`text-left p-4 rounded-xl transition-all ${
                    activeScenario?.title === scenario.title
                      ? 'bg-amber-400/20 border-2 border-amber-400 scale-105'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50'
                  } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-semibold text-sm mb-1">{scenario.title}</div>
                  <div className="text-xs text-gray-400">{scenario.description}</div>
                </button>
              ))}
            </div>
            
            {/* Simulation Status with Path Explanations */}
            {activeScenario && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span className="font-semibold text-sm text-amber-400">
                    {isSimulating ? 'Simulating...' : 'Simulation Complete'}
                  </span>
                  {virtuallyAddedRoles.size > 0 && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {virtuallyAddedRoles.size} virtual role(s) active
                    </span>
                  )}
                </div>
                
                {/* Current step message */}
                <p className="text-sm text-gray-300 mb-3">
                  {simulationStep >= 0 && activeScenario.path[simulationStep]?.msg}
                </p>
                
                {/* Path explanation - why this route */}
                {simulationStep >= 0 && (
                  <div className="space-y-2 mb-3">
                    {activeScenario.path.slice(0, simulationStep + 1).map((step, i) => {
                      const explanation = getPathExplanation(step, i);
                      const roleName = step.key.split('-')[1];
                      const isVirtual = virtuallyAddedRoles.has(roleName);
                      
                      return (
                        <div key={i} className={`flex items-center gap-2 text-xs ${
                          explanation.skipped 
                            ? 'text-orange-300' 
                            : isVirtual 
                            ? 'text-green-300' 
                            : 'text-gray-400'
                        }`}>
                          <span className="w-6 text-center font-mono">{step.key.split('-')[0]}</span>
                          <span>→</span>
                          <span className={explanation.skipped ? 'line-through opacity-60' : ''}>
                            {roleName}
                          </span>
                          {explanation.skipped && (
                            <span className="text-orange-400 text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded">
                              {explanation.reason} → {explanation.handledBy}
                            </span>
                          )}
                          {isVirtual && !explanation.skipped && (
                            <span className="text-green-400 text-[10px] bg-green-500/20 px-1.5 py-0.5 rounded">
                              ✓ Virtual role handling
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Path summary */}
                <div className="text-xs font-mono bg-black/30 px-3 py-2 rounded-lg text-amber-300">
                  {activeScenario.path.map(p => p.key.split('-')[0]).join(' → ')}
                </div>
                
                {/* Impact summary if missing roles in path */}
                {activeScenario.path.some(step => {
                  const roleName = step.key.split('-')[1];
                  const intel = getRoleIntelligence(roleName);
                  return intel.status === 'missing' && !virtuallyAddedRoles.has(roleName);
                }) && (
                  <div className="mt-3 p-2 bg-orange-500/20 rounded-lg">
                    <p className="text-xs text-orange-300 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      Some roles in this path are missing. Admin is handling additional approvals.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Role Progression Roadmap
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              As your company grows, here&apos;s who you should hire or assign next — and why.
            </p>

            <div className="space-y-6">
              {roleProgressionRoadmap.map((stage, i) => (
                <div
                  key={i}
                  className="relative pl-8 pb-6 border-l-4 border-[#102A4A] dark:border-amber-400 last:pb-0"
                >
                  {/* Stage Marker */}
                  <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-[#102A4A] dark:bg-amber-400 flex items-center justify-center text-white dark:text-gray-900 font-bold text-sm">
                    {i + 1}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {stage.stage}
                    </h3>
                    
                    <div className="mb-4">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Roles You Need</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {stage.roles.map((role, j) => (
                          <span
                            key={j}
                            className="px-3 py-1 bg-[#102A4A] text-white text-xs font-semibold rounded-full"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Advice</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{stage.advice}</p>
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Next Hire Trigger
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{stage.nextHire}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fallback' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approval Responsibility Mapping */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#102A4A] dark:text-amber-400" />
                Who Approves What?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Clear mapping of approval responsibilities by role
              </p>

              <div className="space-y-4">
                {rolesConfig.slice(0, 8).map(levelConfig => (
                  <div key={levelConfig.level} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-[#102A4A] text-white text-xs font-bold rounded">
                        L{levelConfig.level}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {levelConfig.levelLabel.split(' - ')[1]}
                      </span>
                    </div>
                    <div className="ml-10 space-y-1">
                      {levelConfig.roles.map(role => (
                        <div key={role.name} className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{role.name}:</span>{' '}
                          {role.canApprove.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fallback Chain */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                When a Role is Missing
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                No task ever gets stuck — here&apos;s the fallback chain
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">1</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Try Required Level</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">System searches for user with required business_level</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">2</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Apply Secondary Fallback</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Based on workflow configuration (skip, escalate, auto-approve)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">3</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Auto-Assign to Admin</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tenant Admin (L9) receives the approval request</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">4</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Admin Final Approval</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Admin (Central) handles all critical escalations</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm">5</div>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Auto-Approve (Safety Net)</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Ultimate fallback — no task ever gets permanently stuck</p>
                  </div>
                </div>
              </div>

              {/* Fallback Strategies */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-4">Available Fallback Strategies</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'skip_stage', desc: 'Skip this approval' },
                    { name: 'auto_approve', desc: 'Auto-approve request' },
                    { name: 'auto_assign_admin', desc: 'Assign to Admin' },
                    { name: 'escalate_to_owner', desc: 'Escalate to owner' },
                    { name: 'escalate_to_super_admin', desc: 'Escalate to L10' },
                    { name: 'block_and_notify', desc: 'Block & notify admins' },
                  ].map(strategy => (
                    <div key={strategy.name} className="text-xs p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <span className="font-mono text-[#102A4A] dark:text-amber-400">{strategy.name}</span>
                      <p className="text-gray-500 dark:text-gray-400 mt-0.5">{strategy.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Wing Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <span className="font-semibold text-gray-500 dark:text-gray-400">Wings:</span>
        {['Executive', 'Management', 'Officer', 'Operations', 'Execution'].map(wing => (
          <div key={wing} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              wing === 'Executive' ? 'bg-purple-500' :
              wing === 'Management' ? 'bg-blue-500' :
              wing === 'Officer' ? 'bg-green-500' :
              wing === 'Operations' ? 'bg-orange-500' :
              'bg-gray-400'
            }`} />
            <span className="text-gray-600 dark:text-gray-400">{wing}</span>
          </div>
        ))}
      </div>
    </div>
  );
}