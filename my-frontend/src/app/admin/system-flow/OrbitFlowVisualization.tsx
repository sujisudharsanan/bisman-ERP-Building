'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Maximize2, AlertTriangle } from 'lucide-react';

interface UserNode {
  id: string;
  username: string;
  email: string;
  role: string;
  roleName?: string;
  is_active?: boolean;
  isActive?: boolean;
}

interface RoleState {
  hasUsers: boolean;
  userCount: number;
  isActive: boolean;
  isRequired: boolean;
  isDisabled: boolean;      // No users assigned
  tasksBlocked?: number;    // Impact metrics
  approvalsDelayed?: number;
}

interface DepartmentState {
  isDisabled: boolean;      // All roles have no users
  totalRoles: number;
  vacantRoles: number;
  userCount: number;
  tasksBlocked?: number;
}

// Legend filter types
type LegendFilter = 'all' | 'enabled' | 'disabled' | 'vacant';

// Hovered element tracking
interface HoveredElement {
  type: 'department' | 'role' | 'governance' | 'organization' | null;
  id: string | null;
  department?: string;  // Parent department for roles
}

// Distinct color palette for each department
const COLORS = {
  organization: '#6B7280', // Neutral gray - Organization center (solid, understated)
  governance: '#9CA3AF',   // Light gray - Governance ring (stroke only)
  board: '#A78BFA',        // Lighter purple - Board of Directors
  ceo: '#7C3AED',          // Violet - CEO
  cfo: '#6366F1',          // Indigo - CFO
  sysAdmin: '#0891B2',     // Cyan - System Admin (governance) - distinct from Admin Ops
  admin: '#8B5CF6',        // Purple - Admin Ops (department)
  legal: '#F97316',        // Orange - Legal
  it: '#22C55E',           // Green - IT
  procurement: '#14B8A6',  // Teal - Procurement
  hr: '#EC4899',           // Pink - HR
  finance: '#6366F1',      // Indigo - Finance
  operations: '#0EA5E9',   // Sky Blue - Operations
};

// Lighter versions for role circles (25% lighter)
const ROLE_COLORS = {
  legal: '#FB923C',        // Lighter orange
  it: '#4ADE80',           // Lighter green
  procurement: '#2DD4BF',  // Lighter teal
  hr: '#F472B6',           // Lighter pink
  finance: '#818CF8',      // Lighter indigo
  operations: '#38BDF8',   // Lighter sky
  admin: '#A78BFA',        // Lighter purple
  ceo: '#A78BFA',          // Lighter violet
  cfo: '#818CF8',          // Lighter indigo
};

// Standard dimensions for 100% zoom target
const SIZES = {
  // Center layers - Organization ring outside with 3 leadership circles inside
  orgRing: 105,      // Organization (outermost protective ring) - Yellow
  leaderCircle: 38,  // CEO, CFO, ADMIN circles inside
  department: 55,    // Department circles
  role: 38,          // Role circles
  itSmall: 48,       // IT (no sub-roles, balanced)
};

// Standard line length
const LINE_LENGTH = {
  main: 160,       // Org → Department
  sub: 85,         // Department → Role (increased for clarity)
};

const REQUIRED_ROLES = ['CEO', 'ADMIN', 'CFO', 'ACCOUNTANT', 'AUDITOR', 'HR_MANAGER'];

// Department to roles mapping for state calculation
const DEPARTMENT_ROLES: Record<string, string[]> = {
  OPERATIONS: ['OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE'],
  PROCUREMENT: ['PROCUREMENT_OFFICER', 'MANAGER'],
  LEGAL: ['LEGAL', 'AUDITOR', 'COMPLIANCE'],
  IT: ['IT'],
  HR: ['HR_MANAGER', 'STAFF'],
  ADMIN_OPS: ['ADMIN', 'MANAGER', 'STAFF'],
  FINANCE: ['CFO', 'ACCOUNTANT', 'ACCOUNTS_PAYABLE', 'BANKER'],
};

interface OrbitNodeProps {
  cx: number;
  cy: number;
  label: string;
  label2?: string;
  color: string;
  size?: number;
  fontSize?: number;
  state?: RoleState;
  departmentState?: DepartmentState;
  isRole?: boolean;  // true = role (lighter), false = department
  isDepartment?: boolean;
  isGovernance?: boolean;  // Governance nodes never disable
  tooltip?: string;
  dimmed?: boolean;  // For hover highlight - dims unrelated nodes
  onHover?: (isHovering: boolean) => void;
  onClick?: () => void;
}

function OrbitNode({ 
  cx, cy, label, label2, color, size = 50, fontSize = 14, 
  state, departmentState, isRole = false, isDepartment = false, isGovernance = false,
  tooltip, dimmed = false, onHover, onClick 
}: OrbitNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isMissing = state?.isRequired && !state?.hasUsers;
  const isDisabled = !isGovernance && (state?.isDisabled || departmentState?.isDisabled);
  const labelText = label.replace(/_/g, ' ');
  const calcFontSize = isRole ? Math.min(fontSize, 10) : Math.min(fontSize, (size * 1.4) / Math.max(labelText.length, 4));
  
  // Visual treatment for disabled state - keep text visible
  const opacity = dimmed ? 0.2 : (isDisabled ? 0.55 : 1);
  const filter = isDisabled ? 'grayscale(70%)' : 'none';
  const cursor = isDisabled ? 'not-allowed' : 'pointer';
  // FIXED: Keep text readable even when disabled - use darker color
  const textColor = isDisabled ? '#374151' : 'white';  // Dark gray text on disabled for readability

  const handleMouseEnter = () => {
    setShowTooltip(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    onHover?.(false);
  };

  // Build rich tooltip content
  const getTooltipContent = () => {
    if (isDisabled && state) {
      return [
        `Role: ${labelText}`,
        'Status: Unassigned',
        state.tasksBlocked ? `Tasks blocked: ${state.tasksBlocked}` : '',
        state.approvalsDelayed ? `Approvals delayed: ${state.approvalsDelayed}` : '',
        'Action Required'
      ].filter(Boolean);
    }
    if (isDisabled && departmentState) {
      return [
        `Department: ${labelText}`,
        'Status: Inactive (No Active Roles)',
        'All workflows blocked',
        'Assign at least one role'
      ];
    }
    if (isGovernance && !state?.hasUsers) {
      return [
        `${labelText}: Unassigned`,
        'Critical Risk',
        'Escalations cannot complete'
      ];
    }
    return tooltip ? [tooltip] : [labelText];
  };

  const tooltipLines = getTooltipContent();
  const tooltipHeight = tooltipLines.length * 16 + 12;

  return (
    <g 
      className={`transition-all duration-300 ${!isDisabled ? 'hover:scale-105' : ''}`}
      style={{ 
        transformOrigin: `${cx}px ${cy}px`, 
        opacity,
        filter,
        cursor 
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Shadow - reduced for disabled */}
      {!isDisabled && <circle cx={cx + 2} cy={cy + 2} r={size} fill="#E5E7EB" />}
      {/* Main circle */}
      <circle 
        cx={cx} cy={cy} r={size} 
        fill={isDisabled ? '#9CA3AF' : color}
        stroke={isMissing ? '#EF4444' : (isDisabled ? '#6B7280' : 'white')}
        strokeWidth={isMissing ? 3 : isRole ? 1.5 : 2.5}
        strokeDasharray={isMissing ? '6,3' : (isDisabled ? '4,2' : 'none')}
      />
      {/* Warning icon for disabled roles */}
      {isDisabled && isRole && (
        <g>
          <circle cx={cx + size * 0.6} cy={cy - size * 0.6} r={10} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
          <text x={cx + size * 0.6} y={cy - size * 0.6 + 4} textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="bold">!</text>
        </g>
      )}
      {/* Vacant roles badge for departments */}
      {isDepartment && departmentState && departmentState.vacantRoles > 0 && !departmentState.isDisabled && (
        <g>
          <rect x={cx - 28} y={cy + size + 5} width={56} height={18} rx="9" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
          <text x={cx} y={cy + size + 17} textAnchor="middle" fill="#D97706" fontSize="9" fontWeight="600">⚠ {departmentState.vacantRoles} vacant</text>
        </g>
      )}
      {/* Text */}
      {label2 ? (
        <>
          <text x={cx} y={cy - calcFontSize/2} textAnchor="middle" fill={textColor} fontSize={calcFontSize} fontWeight="700" style={{ textTransform: 'uppercase' }}>{labelText}</text>
          <text x={cx} y={cy + calcFontSize/2 + 4} textAnchor="middle" fill={textColor} fontSize={calcFontSize} fontWeight="700" style={{ textTransform: 'uppercase' }}>{label2}</text>
        </>
      ) : (
        <text x={cx} y={cy + calcFontSize/3} textAnchor="middle" fill={textColor} fontSize={calcFontSize} fontWeight="700" style={{ textTransform: 'uppercase' }}>{labelText}</text>
      )}
      {/* User count badge */}
      {state?.userCount && state.userCount > 0 && (
        <g>
          <circle cx={cx + size * 0.7} cy={cy - size * 0.7} r={12} fill="white" stroke={color} strokeWidth="2" />
          <text x={cx + size * 0.7} y={cy - size * 0.7 + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">{state.userCount}</text>
        </g>
      )}
      {/* Enhanced Tooltip */}
      {showTooltip && (
        <g>
          <rect x={cx - 80} y={cy - size - tooltipHeight - 8} width="160" height={tooltipHeight} rx="4" fill="#1F2937" />
          {tooltipLines.map((line, i) => (
            <text key={i} x={cx} y={cy - size - tooltipHeight + 8 + (i * 16)} textAnchor="middle" fill={i === 0 ? 'white' : '#D1D5DB'} fontSize="10" fontWeight={i === 0 ? '600' : '400'}>{line}</text>
          ))}
        </g>
      )}
    </g>
  );
}

// Connection line between nodes - supports disabled state
interface ConnectionLineProps {
  x1: number; 
  y1: number; 
  x2: number; 
  y2: number; 
  color: string; 
  width?: number;
  isDisabled?: boolean;
  dimmed?: boolean;
  glowing?: boolean;
}

function ConnectionLine({ x1, y1, x2, y2, color, width = 4, isDisabled = false, dimmed = false, glowing = false }: ConnectionLineProps) {
  const opacity = dimmed ? 0.15 : (isDisabled ? 0.3 : 1);
  const strokeDash = isDisabled ? '8,4' : 'none';
  const strokeColor = isDisabled ? '#9CA3AF' : color;
  const filter = glowing ? 'drop-shadow(0 0 4px currentColor)' : 'none';
  
  return (
    <line 
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={strokeColor} 
      strokeWidth={width} 
      strokeLinecap="round"
      strokeDasharray={strokeDash}
      style={{ opacity, filter, transition: 'all 0.3s ease' }}
    />
  );
}

export default function OrbitFlowVisualization() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [clientName, setClientName] = useState<string>('ORGANIZATION');
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  
  // Interaction state
  const [hoveredElement, setHoveredElement] = useState<HoveredElement>({ type: null, id: null });
  const [legendFilter, setLegendFilter] = useState<LegendFilter>('all');

  useEffect(() => {
    fetchUsers();
    fetchClientInfo();
  }, []);

  const fetchClientInfo = async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Get tenant/client name from response (check both root and user object)
        const name = data.tenant_name || data.clientName || data.client_name || data.organization || 
                     data.user?.tenant_name || data.user?.clientName || data.user?.client_name || 'ORGANIZATION';
        setClientName(name.toUpperCase());
        // Get client logo from response (check both root and user object)
        const logo = data.clientLogo || data.client_logo || data.logo || 
                     data.user?.clientLogo || data.user?.client_logo || data.user?.logo || null;
        if (logo) {
          console.log('[SystemFlow] Client logo found:', logo.substring(0, 50) + '...');
        }
        setClientLogo(logo);
      }
    } catch {
      // Silent fail
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users?limit=500', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      console.log('[SystemFlow] API /api/users response:', data);
      let userList: UserNode[] = [];
      if (Array.isArray(data)) userList = data;
      else if (data.users) userList = data.users;
      else if (data.data) userList = data.data;
      const filteredUsers = userList.filter((u: UserNode) => {
        const role = (u.role || u.roleName || '').toUpperCase();
        return !['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(role);
      });
      console.log('[SystemFlow] Filtered users:', filteredUsers.length, filteredUsers.map(u => ({ email: u.email, role: u.role || u.roleName })));
      setUsers(filteredUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const roleStates = useMemo(() => {
    const states: Record<string, RoleState> = {};
    users.forEach(u => {
      const role = (u.role || u.roleName || '').toUpperCase();
      if (!states[role]) {
        states[role] = { hasUsers: false, userCount: 0, isActive: false, isRequired: REQUIRED_ROLES.includes(role), isDisabled: true };
      }
      states[role].hasUsers = true;
      states[role].userCount++;
      states[role].isDisabled = false;
      if (u.is_active !== false && u.isActive !== false) states[role].isActive = true;
    });
    return states;
  }, [users]);

  // Calculate department states based on role states
  const departmentStates = useMemo(() => {
    const states: Record<string, DepartmentState> = {};
    
    Object.entries(DEPARTMENT_ROLES).forEach(([dept, roles]) => {
      let totalUsers = 0;
      let vacantCount = 0;
      
      roles.forEach(role => {
        const roleState = roleStates[role];
        if (!roleState || !roleState.hasUsers) {
          vacantCount++;
        } else {
          totalUsers += roleState.userCount;
        }
      });
      
      states[dept] = {
        isDisabled: vacantCount === roles.length, // All roles vacant
        totalRoles: roles.length,
        vacantRoles: vacantCount,
        userCount: totalUsers,
      };
    });
    
    return states;
  }, [roleStates]);

  const getState = (role: string): RoleState => {
    const defaultState: RoleState = { 
      hasUsers: false, 
      userCount: 0, 
      isActive: false, 
      isRequired: REQUIRED_ROLES.includes(role),
      isDisabled: true 
    };
    return roleStates[role] || defaultState;
  };

  const getDeptState = (dept: string): DepartmentState => {
    return departmentStates[dept] || { isDisabled: true, totalRoles: 0, vacantRoles: 0, userCount: 0 };
  };

  // Check if an element should be dimmed based on hover state
  const isDimmed = useCallback((elementType: string, elementId: string, parentDept?: string): boolean => {
    if (hoveredElement.type === null) return false;
    if (legendFilter !== 'all') return false; // Don't dim when legend filter is active
    
    // If hovering on a department, only that dept and its roles should be visible
    if (hoveredElement.type === 'department') {
      if (elementType === 'department') return elementId !== hoveredElement.id;
      if (elementType === 'role') return parentDept !== hoveredElement.id;
      return true; // Dim governance when hovering dept
    }
    
    // If hovering on a role, only that role and its parent dept should be visible
    if (hoveredElement.type === 'role') {
      if (elementType === 'role') return elementId !== hoveredElement.id;
      if (elementType === 'department') return elementId !== hoveredElement.department;
      return true;
    }
    
    return false;
  }, [hoveredElement, legendFilter]);

  // Check if element should be hidden based on legend filter
  const isFilteredOut = useCallback((state?: RoleState, deptState?: DepartmentState): boolean => {
    if (legendFilter === 'all') return false;
    if (legendFilter === 'enabled') {
      return state?.isDisabled || deptState?.isDisabled || false;
    }
    if (legendFilter === 'disabled') {
      return !(state?.isDisabled || deptState?.isDisabled);
    }
    if (legendFilter === 'vacant') {
      return !(state?.isRequired && !state?.hasUsers);
    }
    return false;
  }, [legendFilter]);

  // Center point - optimized for 1280x960 canvas at 100%
  const centerX = 640;
  const centerY = 480;
  const orbitRadius = 220;
  const ceoRadius = 100;

  // Helper to get position at angle from center
  const getOrbitPosition = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad)
    };
  };

  // Helper to get sub-node position with standard length
  const getSubPosition = (parentX: number, parentY: number, angle: number, length: number = LINE_LENGTH.sub) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: parentX + length * Math.cos(rad),
      y: parentY + length * Math.sin(rad)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading organization structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={fetchUsers} className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition shadow-lg">
            <RefreshCw className="h-4 w-4 inline mr-2" />Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition shadow-sm">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm font-medium">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition shadow-sm">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(1)} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition shadow-sm" title="Reset to 100%">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button onClick={fetchUsers} className="p-2.5 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition shadow-sm">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* SVG Orbit Visualization - Optimized for 1280x960 at 100% */}
      <div 
        className="w-full h-screen flex items-center justify-center relative"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        <svg viewBox="0 0 1280 960" className="w-full h-full" style={{ maxWidth: '1280px', maxHeight: '960px' }}>
          
          {/* === CONNECTION LINES (rendered first, behind everything) === */}
          {/* Single thick line per department - drawn first so org circle covers the ends */}
          {/* Equal spacing: 7 departments at 51.43° apart, starting from -90° (top) */}
          {/* Angles: -90°, -38.57°, 12.86°, 64.29°, 115.71°, 167.14°, -141.43° (218.57°) */}
          
          {(() => {
            const departments = [
              { angle: -90, color: COLORS.operations, id: 'OPERATIONS' },
              { angle: -38.57, color: COLORS.procurement, id: 'PROCUREMENT' },
              { angle: 12.86, color: COLORS.legal, id: 'LEGAL' },
              { angle: 64.29, color: COLORS.it, id: 'IT' },
              { angle: 115.71, color: COLORS.hr, id: 'HR' },
              { angle: 167.14, color: COLORS.admin, id: 'ADMIN_OPS' },
              { angle: -141.43, color: COLORS.finance, id: 'FINANCE' },
            ];
            
            return departments.map((dept, i) => {
              const deptPos = getOrbitPosition(dept.angle, orbitRadius);
              const rad = dept.angle * Math.PI / 180;
              const ringX = centerX + Math.cos(rad) * SIZES.orgRing;
              const ringY = centerY + Math.sin(rad) * SIZES.orgRing;
              const deptState = getDeptState(dept.id);
              const dimmed = isDimmed('department', dept.id);
              const glowing = hoveredElement.type === 'department' && hoveredElement.id === dept.id;
              
              return (
                <ConnectionLine 
                  key={i} 
                  x1={ringX} 
                  y1={ringY} 
                  x2={deptPos.x} 
                  y2={deptPos.y} 
                  color={dept.color} 
                  width={6}
                  isDisabled={deptState.isDisabled}
                  dimmed={dimmed}
                  glowing={glowing}
                />
              );
            });
          })()}
          
          {/* === CENTER - Governance Ring (stroke only, neutral) === */}
          
          {/* Governance Ring (stroke only, 8% fill for subtle definition) === */}
          <g className="cursor-pointer transition-all duration-300 hover:scale-105" style={{ transformOrigin: `${centerX}px ${centerY}px` }}>
            {/* Subtle shadow */}
            <circle cx={centerX + 2} cy={centerY + 2} r={SIZES.orgRing} fill="none" stroke="#D1D5DB" strokeWidth="4" />
            {/* Very subtle fill - 8% opacity */}
            <circle cx={centerX} cy={centerY} r={SIZES.orgRing} fill={COLORS.governance} fillOpacity="0.08" stroke={COLORS.organization} strokeWidth="4" />
            {/* Inner white background for clean look */}
            <circle cx={centerX} cy={centerY} r={SIZES.orgRing - 4} fill="white" />
          </g>
          
          {/* Clip path definitions */}
          <defs>
            <clipPath id="logoClipBottom">
              <circle cx={centerX} cy={centerY + 55} r={28} />
            </clipPath>
            <clipPath id="logoClipTop">
              <circle cx={centerX} cy={centerY - 50} r={28} />
            </clipPath>
          </defs>
          
          {/* Client Logo/Name Circle - Top (Triangle Peak) - Shows OR or company initials */}
          <g className="cursor-pointer transition-all duration-300 hover:scale-105" style={{ transformOrigin: `${centerX}px ${centerY - 50}px` }}>
            <circle cx={centerX + 1} cy={centerY - 50 + 1} r={32} fill="#E5E7EB" />
            <circle cx={centerX} cy={centerY - 50} r={32} fill="white" stroke={COLORS.governance} strokeWidth="3" />
            {/* Show actual logo if available, otherwise show OR or initials */}
            {clientLogo ? (
              <image 
                href={clientLogo} 
                x={centerX - 26} 
                y={centerY - 50 - 26} 
                width={52} 
                height={52} 
                clipPath="url(#logoClipTop)"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text x={centerX} y={centerY - 50 + 6} textAnchor="middle" fill={COLORS.organization} fontSize="14" fontWeight="800">
                {clientName && clientName !== 'ORGANIZATION' ? clientName.slice(0, 2).toUpperCase() : 'OR'}
              </text>
            )}
          </g>
          
          {/* CEO Circle - Middle Left */}
          {(() => {
            const ceoState = getState('CEO');
            const isDisabled = !ceoState.hasUsers;
            const fillColor = isDisabled ? '#D1D5DB' : COLORS.ceo;
            const textColor = isDisabled ? '#374151' : 'white';
            const opacity = isDisabled ? 0.7 : 1;
            return (
              <g className="cursor-pointer transition-all duration-300 hover:scale-105" style={{ transformOrigin: `${centerX - 45}px ${centerY + 10}px`, opacity, filter: isDisabled ? 'grayscale(60%)' : 'none' }}>
                {!isDisabled && <circle cx={centerX - 45 + 1} cy={centerY + 10 + 1} r={32} fill="#E5E7EB" />}
                <circle cx={centerX - 45} cy={centerY + 10} r={32} fill={fillColor} stroke={isDisabled ? '#9CA3AF' : 'white'} strokeWidth="3" strokeDasharray={isDisabled ? '4,2' : 'none'} />
                <text x={centerX - 45} y={centerY + 10 + 5} textAnchor="middle" fill={textColor} fontSize="13" fontWeight="700">CEO</text>
                {isDisabled && (
                  <g>
                    <circle cx={centerX - 45 + 24} cy={centerY + 10 - 24} r={10} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
                    <text x={centerX - 45 + 24} y={centerY + 10 - 20} textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="bold">!</text>
                  </g>
                )}
                {ceoState.userCount > 0 && (
                  <g>
                    <circle cx={centerX - 45 + 24} cy={centerY + 10 - 24} r={12} fill="white" stroke={COLORS.ceo} strokeWidth="2" />
                    <text x={centerX - 45 + 24} y={centerY + 10 - 20} textAnchor="middle" fill={COLORS.ceo} fontSize="11" fontWeight="bold">{ceoState.userCount}</text>
                  </g>
                )}
              </g>
            );
          })()}
          
          {/* CFO Circle - Middle Right */}
          {(() => {
            const cfoState = getState('CFO');
            const isDisabled = !cfoState.hasUsers;
            const fillColor = isDisabled ? '#D1D5DB' : COLORS.cfo;
            const textColor = isDisabled ? '#374151' : 'white';
            const opacity = isDisabled ? 0.7 : 1;
            return (
              <g className="cursor-pointer transition-all duration-300 hover:scale-105" style={{ transformOrigin: `${centerX + 45}px ${centerY + 10}px`, opacity, filter: isDisabled ? 'grayscale(60%)' : 'none' }}>
                {!isDisabled && <circle cx={centerX + 45 + 1} cy={centerY + 10 + 1} r={32} fill="#E5E7EB" />}
                <circle cx={centerX + 45} cy={centerY + 10} r={32} fill={fillColor} stroke={isDisabled ? '#9CA3AF' : 'white'} strokeWidth="3" strokeDasharray={isDisabled ? '4,2' : 'none'} />
                <text x={centerX + 45} y={centerY + 10 + 5} textAnchor="middle" fill={textColor} fontSize="13" fontWeight="700">CFO</text>
                {isDisabled && (
                  <g>
                    <circle cx={centerX + 45 + 24} cy={centerY + 10 - 24} r={10} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
                    <text x={centerX + 45 + 24} y={centerY + 10 - 20} textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="bold">!</text>
                  </g>
                )}
                {cfoState.userCount > 0 && (
                  <g>
                    <circle cx={centerX + 45 + 24} cy={centerY + 10 - 24} r={12} fill="white" stroke={COLORS.cfo} strokeWidth="2" />
                    <text x={centerX + 45 + 24} y={centerY + 10 - 20} textAnchor="middle" fill={COLORS.cfo} fontSize="11" fontWeight="bold">{cfoState.userCount}</text>
                  </g>
                )}
              </g>
            );
          })()}
          
          {/* SYS ADMIN Circle - Bottom (Triangle Base) - Governance authority */}
          {(() => {
            const adminState = getState('ADMIN');
            const isDisabled = !adminState.hasUsers;
            const fillColor = isDisabled ? '#D1D5DB' : COLORS.sysAdmin;
            const textColor = isDisabled ? '#374151' : 'white';
            const opacity = isDisabled ? 0.7 : 1;
            return (
              <g className="cursor-pointer transition-all duration-300 hover:scale-105" style={{ transformOrigin: `${centerX}px ${centerY + 60}px`, opacity, filter: isDisabled ? 'grayscale(60%)' : 'none' }}>
                {!isDisabled && <circle cx={centerX + 1} cy={centerY + 60 + 1} r={32} fill="#E5E7EB" />}
                <circle cx={centerX} cy={centerY + 60} r={32} fill={fillColor} stroke={isDisabled ? '#9CA3AF' : 'white'} strokeWidth="3" strokeDasharray={isDisabled ? '4,2' : 'none'} />
                <text x={centerX} y={centerY + 60 - 2} textAnchor="middle" fill={textColor} fontSize="9" fontWeight="700">SYS</text>
                <text x={centerX} y={centerY + 60 + 10} textAnchor="middle" fill={textColor} fontSize="9" fontWeight="700">ADMIN</text>
                {isDisabled && (
                  <g>
                    <circle cx={centerX + 24} cy={centerY + 60 - 24} r={10} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
                    <text x={centerX + 24} y={centerY + 60 - 20} textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="bold">!</text>
                  </g>
                )}
                {adminState.userCount > 0 && (
                  <g>
                    <circle cx={centerX + 24} cy={centerY + 60 - 24} r={12} fill="white" stroke={COLORS.sysAdmin} strokeWidth="2" />
                    <text x={centerX + 24} y={centerY + 60 - 20} textAnchor="middle" fill={COLORS.sysAdmin} fontSize="11" fontWeight="bold">{adminState.userCount}</text>
                  </g>
                )}
              </g>
            );
          })()}
          
          {/* Clip path for top logo */}
          <defs>
            <clipPath id="logoClipTop">
              <circle cx={centerX} cy={centerY - 50} r={28} />
            </clipPath>
          </defs>
          
          {/* User count badge */}
          {users.length > 0 && (
            <g>
              <circle cx={centerX + SIZES.orgRing * 0.7} cy={centerY - SIZES.orgRing * 0.7} r={14} fill="white" stroke={COLORS.organization} strokeWidth="2" />
              <text x={centerX + SIZES.orgRing * 0.7} y={centerY - SIZES.orgRing * 0.7 + 4} textAnchor="middle" fill={COLORS.organization} fontSize="11" fontWeight="bold">{users.length}</text>
            </g>
          )}

          {/* === OUTER RING - Department Nodes === */}
          {/* Equal spacing: 7 departments at 51.43° apart */}
          {/* Angles: -90°, -38.57°, 12.86°, 64.29°, 115.71°, 167.14°, -141.43° */}
          
          {/* OPERATIONS - angle: -90° (Top Center) */}
          {(() => {
            const deptId = 'OPERATIONS';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(-90, orbitRadius);
            const sub1 = getSubPosition(pos.x, pos.y, -45, LINE_LENGTH.sub);
            const sub2 = getSubPosition(pos.x, pos.y, -90, LINE_LENGTH.sub);
            const sub3 = getSubPosition(pos.x, pos.y, -135, LINE_LENGTH.sub);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="OPERATIONS" color={COLORS.operations} 
                  size={SIZES.department} fontSize={9} 
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Operations Department" 
                />
                <OrbitNode cx={sub1.x} cy={sub1.y} label="HUB INCHARGE" color={ROLE_COLORS.operations} size={SIZES.role} fontSize={7} state={getState('HUB_INCHARGE')} isRole dimmed={isDimmed('role', 'HUB_INCHARGE', deptId)} tooltip="Hub In-Charge" />
                <OrbitNode cx={sub2.x} cy={sub2.y} label="OPS MANAGER" color={ROLE_COLORS.operations} size={SIZES.role} fontSize={7} state={getState('OPERATIONS_MANAGER')} isRole dimmed={isDimmed('role', 'OPERATIONS_MANAGER', deptId)} tooltip="Operations Manager" />
                <OrbitNode cx={sub3.x} cy={sub3.y} label="STORE INCHARGE" color={ROLE_COLORS.operations} size={SIZES.role} fontSize={6} state={getState('STORE_INCHARGE')} isRole dimmed={isDimmed('role', 'STORE_INCHARGE', deptId)} tooltip="Store In-Charge" />
              </>
            );
          })()}

          {/* PROCUREMENT - angle: -38.57° */}
          {(() => {
            const deptId = 'PROCUREMENT';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(-38.57, orbitRadius);
            const sub1 = getSubPosition(pos.x, pos.y, -20, LINE_LENGTH.sub);
            const sub2 = getSubPosition(pos.x, pos.y, -80, LINE_LENGTH.sub);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="PROCUREMENT" color={COLORS.procurement} 
                  size={SIZES.department} fontSize={9}
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Procurement Department" 
                />
                <OrbitNode cx={sub1.x} cy={sub1.y} label="PROC OFFICER" color={ROLE_COLORS.procurement} size={SIZES.role} fontSize={8} state={getState('PROCUREMENT_OFFICER')} isRole dimmed={isDimmed('role', 'PROCUREMENT_OFFICER', deptId)} tooltip="Procurement Officer" />
                <OrbitNode cx={sub2.x} cy={sub2.y} label="RFQ MANAGER" color={ROLE_COLORS.procurement} size={SIZES.role} fontSize={8} state={getState('MANAGER')} isRole dimmed={isDimmed('role', 'MANAGER', deptId)} tooltip="RFQ Manager" />
              </>
            );
          })()}

          {/* LEGAL - angle: 12.86° */}
          {(() => {
            const deptId = 'LEGAL';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(12.86, orbitRadius);
            const sub1 = getSubPosition(pos.x, pos.y, -30, LINE_LENGTH.sub);
            const sub2 = getSubPosition(pos.x, pos.y, 50, LINE_LENGTH.sub);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="LEGAL" color={COLORS.legal} 
                  size={SIZES.department} fontSize={14}
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Legal & Compliance" 
                />
                <OrbitNode cx={sub1.x} cy={sub1.y} label="AUDITOR" color={ROLE_COLORS.legal} size={SIZES.role} fontSize={10} state={getState('AUDITOR')} isRole dimmed={isDimmed('role', 'AUDITOR', deptId)} tooltip="Internal Auditor" />
                <OrbitNode cx={sub2.x} cy={sub2.y} label="COMPLIANCE" color={ROLE_COLORS.legal} size={SIZES.role} fontSize={8} state={getState('COMPLIANCE')} isRole dimmed={isDimmed('role', 'COMPLIANCE', deptId)} tooltip="Compliance Officer" />
              </>
            );
          })()}

          {/* IT - angle: 64.29° */}
          {(() => {
            const deptId = 'IT';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(64.29, orbitRadius);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="IT" color={COLORS.it} 
                  size={SIZES.itSmall} fontSize={20}
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Information Technology" 
                />
              </>
            );
          })()}

          {/* HR - angle: 115.71° */}
          {(() => {
            const deptId = 'HR';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(115.71, orbitRadius);
            const sub1 = getSubPosition(pos.x, pos.y, 70, LINE_LENGTH.sub);
            const sub2 = getSubPosition(pos.x, pos.y, 150, LINE_LENGTH.sub);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="HR" color={COLORS.hr} 
                  size={SIZES.department} fontSize={20}
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Human Resources" 
                />
                <OrbitNode cx={sub1.x} cy={sub1.y} label="HR MANAGER" color={ROLE_COLORS.hr} size={SIZES.role} fontSize={8} state={getState('HR_MANAGER')} isRole dimmed={isDimmed('role', 'HR_MANAGER', deptId)} tooltip="HR Manager" />
                <OrbitNode cx={sub2.x} cy={sub2.y} label="HR STAFF" color={ROLE_COLORS.hr} size={SIZES.role} fontSize={10} state={getState('STAFF')} isRole dimmed={isDimmed('role', 'STAFF', deptId)} tooltip="HR Staff" />
              </>
            );
          })()}

          {/* ADMIN OPS - angle: 167.14° (Operations admin, distinct from Governance) */}
          {(() => {
            const deptId = 'ADMIN_OPS';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(167.14, orbitRadius);
            const sub1 = getSubPosition(pos.x, pos.y, 130, LINE_LENGTH.sub);
            const sub2 = getSubPosition(pos.x, pos.y, 210, LINE_LENGTH.sub);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="ADMIN OPS" color={COLORS.admin} 
                  size={SIZES.department} fontSize={10}
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Administrative Operations" 
                />
                <OrbitNode cx={sub1.x} cy={sub1.y} label="OFFICE MGR" color={ROLE_COLORS.admin} size={SIZES.role} fontSize={8} state={getState('MANAGER')} isRole dimmed={isDimmed('role', 'MANAGER', deptId)} tooltip="Office Manager" />
                <OrbitNode cx={sub2.x} cy={sub2.y} label="OFFICE ADMIN" color={ROLE_COLORS.admin} size={SIZES.role} fontSize={7} state={getState('STAFF')} isRole dimmed={isDimmed('role', 'STAFF', deptId)} tooltip="Office Administrator" />
              </>
            );
          })()}

          {/* FINANCE - angle: -141.43° (218.57°) */}
          {(() => {
            const deptId = 'FINANCE';
            const deptState = getDeptState(deptId);
            const pos = getOrbitPosition(-141.43, orbitRadius);
            const sub1 = getSubPosition(pos.x, pos.y, -100, LINE_LENGTH.sub);
            const sub2 = getSubPosition(pos.x, pos.y, -160, LINE_LENGTH.sub);
            const sub3 = getSubPosition(pos.x, pos.y, -220, LINE_LENGTH.sub);
            const dimmed = isDimmed('department', deptId);
            return (
              <>
                <OrbitNode 
                  cx={pos.x} cy={pos.y} label="FINANCE" color={COLORS.finance} 
                  size={SIZES.department} fontSize={12}
                  departmentState={deptState} isDepartment
                  dimmed={dimmed}
                  onHover={(h) => h ? setHoveredElement({ type: 'department', id: deptId }) : setHoveredElement({ type: null, id: null })}
                  tooltip="Finance Department" 
                />
                <OrbitNode cx={sub1.x} cy={sub1.y} label="ACCOUNTANT" color={ROLE_COLORS.finance} size={SIZES.role} fontSize={8} state={getState('ACCOUNTANT')} isRole dimmed={isDimmed('role', 'ACCOUNTANT', deptId)} tooltip="Accountant" />
                <OrbitNode cx={sub2.x} cy={sub2.y} label="ACCOUNTS PAY" color={ROLE_COLORS.finance} size={SIZES.role} fontSize={6} state={getState('ACCOUNTS_PAYABLE')} isRole dimmed={isDimmed('role', 'ACCOUNTS_PAYABLE', deptId)} tooltip="Accounts Payable" />
                <OrbitNode cx={sub3.x} cy={sub3.y} label="BANKER" color={ROLE_COLORS.finance} size={SIZES.role} fontSize={10} state={getState('BANKER')} isRole dimmed={isDimmed('role', 'BANKER', deptId)} tooltip="Banking Officer" />
              </>
            );
          })()}

        </svg>
      </div>

      {/* Enhanced Interactive Legend - Right side */}
      <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg max-w-xs">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Legend <span className="text-xs text-gray-400 font-normal">(click to filter)</span></h4>
        
        {/* Interactive Filter States */}
        <div className="flex flex-col gap-2 mb-4">
          <button 
            onClick={() => setLegendFilter(legendFilter === 'enabled' ? 'all' : 'enabled')}
            className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${legendFilter === 'enabled' ? 'bg-purple-100 ring-2 ring-purple-400' : 'hover:bg-gray-50'}`}
          >
            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{backgroundColor: COLORS.ceo}}/>
            <span className="text-gray-600 text-sm">Enabled (has users)</span>
          </button>
          <button 
            onClick={() => setLegendFilter(legendFilter === 'disabled' ? 'all' : 'disabled')}
            className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${legendFilter === 'disabled' ? 'bg-gray-200 ring-2 ring-gray-400' : 'hover:bg-gray-50'}`}
          >
            <div className="w-4 h-4 rounded-full border-2 border-dashed" style={{backgroundColor: '#9CA3AF', borderColor: '#6B7280', opacity: 0.5}}/>
            <span className="text-gray-600 text-sm">Disabled (no users)</span>
          </button>
          <button 
            onClick={() => setLegendFilter(legendFilter === 'vacant' ? 'all' : 'vacant')}
            className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${legendFilter === 'vacant' ? 'bg-red-100 ring-2 ring-red-400' : 'hover:bg-gray-50'}`}
          >
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-red-500" style={{backgroundColor: '#FEE2E2'}}/>
            <span className="text-gray-600 text-sm">Required (vacant)</span>
          </button>
          {legendFilter !== 'all' && (
            <button 
              onClick={() => setLegendFilter('all')}
              className="text-xs text-purple-600 hover:text-purple-800 mt-1"
            >
              ← Clear filter
            </button>
          )}
        </div>
        
        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Governance</h4>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.ceo}}/><span className="text-gray-600 text-xs">CEO</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.cfo}}/><span className="text-gray-600 text-xs">CFO</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.sysAdmin}}/><span className="text-gray-600 text-xs">Sys Admin</span></div>
        </div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Departments</h4>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.legal}}/><span className="text-gray-600 text-xs">Legal</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.it}}/><span className="text-gray-600 text-xs">IT</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.procurement}}/><span className="text-gray-600 text-xs">Procurement</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.operations}}/><span className="text-gray-600 text-xs">Operations</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.hr}}/><span className="text-gray-600 text-xs">HR</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.finance}}/><span className="text-gray-600 text-xs">Finance</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.admin}}/><span className="text-gray-600 text-xs">Admin Ops</span></div>
        </div>
      </div>

      {/* System Health Stats */}
      <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total Users:</span>
            <span className="text-sm font-bold text-purple-600">{users.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Vacant Roles:</span>
            <span className="text-xs font-semibold text-amber-600">
              {Object.values(roleStates).filter(s => !s.hasUsers && s.isRequired).length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Inactive Depts:</span>
            <span className="text-xs font-semibold text-red-600">
              {Object.values(departmentStates).filter(d => d.isDisabled).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}