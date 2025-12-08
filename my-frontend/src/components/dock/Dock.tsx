'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useDock } from './DockContext';
import { useNavigationPages, type NavigationPage } from '@/common/hooks/useNavigationPages';
import {
  Home,
  Users,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  Bell,
  Calendar,
  Truck,
  CreditCard,
  Building2,
  ClipboardList,
  Warehouse,
  Wrench,
  Shield,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Boxes,
  Receipt,
  Target,
  UserCheck,
  Briefcase,
  Map,
  Headphones,
  type LucideIcon,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Icon mapping - maps page IDs/names to Lucide icons
   ───────────────────────────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, LucideIcon> = {
  // Dashboard
  dashboard: LayoutDashboard,
  home: Home,
  
  // Users & HR
  users: Users,
  user: Users,
  hr: Users,
  employees: Users,
  employee: Users,
  staff: Users,
  team: Users,
  attendance: UserCheck,
  
  // Inventory & Products
  inventory: Package,
  products: Package,
  product: Package,
  stock: Boxes,
  warehouse: Warehouse,
  
  // Sales & Orders
  sales: ShoppingCart,
  orders: ShoppingCart,
  order: ShoppingCart,
  cart: ShoppingCart,
  pos: CreditCard,
  
  // Purchases
  purchase: Receipt,
  purchases: Receipt,
  procurement: Receipt,
  vendor: Building2,
  vendors: Building2,
  supplier: Building2,
  suppliers: Building2,
  
  // Finance
  finance: CreditCard,
  payments: CreditCard,
  payment: CreditCard,
  accounting: CreditCard,
  accounts: CreditCard,
  billing: Receipt,
  invoice: FileText,
  invoices: FileText,
  
  // Reports & Analytics
  reports: BarChart3,
  report: BarChart3,
  analytics: TrendingUp,
  insights: TrendingUp,
  statistics: BarChart3,
  
  // Settings & Admin
  settings: Settings,
  config: Settings,
  configuration: Settings,
  admin: Shield,
  'super-admin': Shield,
  security: Shield,
  
  // Notifications
  notifications: Bell,
  alerts: Bell,
  
  // Calendar & Scheduling
  calendar: Calendar,
  schedule: Calendar,
  scheduling: Calendar,
  
  // Logistics & Delivery
  logistics: Truck,
  delivery: Truck,
  shipping: Truck,
  dispatch: Truck,
  transport: Truck,
  routes: Map,
  
  // CRM & Customers
  customers: Users,
  customer: Users,
  crm: Target,
  leads: Target,
  
  // Tasks & Projects
  tasks: ClipboardList,
  task: ClipboardList,
  projects: Briefcase,
  project: Briefcase,
  
  // Maintenance & Tools
  maintenance: Wrench,
  tools: Wrench,
  service: Wrench,
  
  // Communication
  chat: MessageSquare,
  messages: MessageSquare,
  message: MessageSquare,
  communication: MessageSquare,
  
  // Support
  support: Headphones,
  help: HelpCircle,
  tickets: Headphones,
  
  // Businesses
  businesses: Building2,
  business: Building2,
  enterprise: Building2,
  hub: Building2,
  hubs: Building2,
};

/* Helper to get icon for a page */
function getIconForPage(page: NavigationPage): LucideIcon {
  // Try exact id match
  const pageIdLower = page.id.toLowerCase();
  if (ICON_MAP[pageIdLower]) return ICON_MAP[pageIdLower];
  
  // Try matching parts of the id
  const parts = pageIdLower.split(/[-_]/);
  for (const part of parts) {
    if (ICON_MAP[part]) return ICON_MAP[part];
  }
  
  // Try matching the name/label
  const labelLower = page.name.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (labelLower.includes(key)) return icon;
  }
  
  // Try matching iconKey if available
  if (page.iconKey) {
    const iconKeyLower = page.iconKey.toLowerCase();
    if (ICON_MAP[iconKeyLower]) return ICON_MAP[iconKeyLower];
  }
  
  // Default icon based on module
  if (page.module) {
    const moduleLower = page.module.toLowerCase();
    if (ICON_MAP[moduleLower]) return ICON_MAP[moduleLower];
  }
  
  // Fallback
  return Package;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Dock Item Component with magnification effect
   ───────────────────────────────────────────────────────────────────────────── */
interface DockItemProps {
  page: NavigationPage;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  isActive: boolean;
  onClick: () => void;
  position: 'left' | 'right' | 'bottom';
}

function DockItem({ page, mouseX, isActive, onClick, position }: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const Icon = getIconForPage(page);
  
  // Calculate distance from mouse for magnification
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0, y: 0, height: 0 };
    const center = position === 'bottom' 
      ? bounds.x + bounds.width / 2
      : bounds.y + bounds.height / 2;
    return val - center;
  });
  
  // Magnification effect
  const widthSync = useTransform(distance, [-150, 0, 150], [48, 72, 48]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  
  return (
    <motion.button
      ref={ref}
      style={{ width, height: width }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative flex items-center justify-center rounded-xl
        transition-colors duration-200 group
        ${isActive 
          ? 'bg-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/20' 
          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white'
        }
      `}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-1/2 h-1/2" strokeWidth={1.5} />
      
      {/* Active indicator dot */}
      {isActive && (
        <motion.div
          layoutId="dock-indicator"
          className={`absolute ${
            position === 'bottom' ? '-bottom-2' : 
            position === 'left' ? '-right-2' : '-left-2'
          } w-1.5 h-1.5 bg-blue-400 rounded-full`}
        />
      )}
      
      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: position === 'bottom' ? 10 : 0, x: position !== 'bottom' ? 10 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`
              absolute whitespace-nowrap px-3 py-1.5 rounded-lg
              bg-gray-900 text-white text-sm font-medium
              border border-gray-700 shadow-xl z-50
              ${position === 'bottom' ? '-top-12' : ''}
              ${position === 'left' ? 'left-full ml-3' : ''}
              ${position === 'right' ? 'right-full mr-3' : ''}
            `}
          >
            {page.name}
            <div 
              className={`absolute w-2 h-2 bg-gray-900 border-gray-700 rotate-45
                ${position === 'bottom' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b' : ''}
                ${position === 'left' ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-l border-b' : ''}
                ${position === 'right' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-r border-t' : ''}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Dock Component
   ───────────────────────────────────────────────────────────────────────────── */
export default function Dock() {
  const router = useRouter();
  const pathname = usePathname();
  const { preferences } = useDock();
  
  const { pages, isLoading } = useNavigationPages();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(Infinity);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  
  const position = preferences.dockPosition;
  const autoHide = preferences.autoHide;
  const maxItems = 8; // Default max items
  
  // Auto-hide logic
  useEffect(() => {
    if (!autoHide) {
      setIsVisible(true);
      return;
    }
    
    if (isHovering) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setIsVisible(true);
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }
    
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [autoHide, isHovering]);
  
  // Group pages by module and limit visible items
  const dockPages = useMemo(() => {
    // Filter to important/frequently used modules
    const priorityModules = ['admin', 'system', 'finance', 'operations', 'procurement', 'common'];
    
    // Sort pages: priority modules first, then alphabetically
    const sorted = [...pages].sort((a, b) => {
      const aIdx = priorityModules.findIndex(m => 
        a.module?.toLowerCase().includes(m.toLowerCase()) || a.id.toLowerCase().includes(m.toLowerCase())
      );
      const bIdx = priorityModules.findIndex(m => 
        b.module?.toLowerCase().includes(m.toLowerCase()) || b.id.toLowerCase().includes(m.toLowerCase())
      );
      
      if (aIdx !== -1 && bIdx === -1) return -1;
      if (aIdx === -1 && bIdx !== -1) return 1;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    });
    
    return sorted;
  }, [pages]);
  
  // Calculate visible items based on scroll
  const visibleItems = useMemo(() => {
    const itemCount = maxItems;
    return dockPages.slice(scrollIndex, scrollIndex + itemCount);
  }, [dockPages, scrollIndex, maxItems]);
  
  const canScrollBack = scrollIndex > 0;
  const canScrollForward = scrollIndex + maxItems < dockPages.length;
  
  // Handle mouse tracking for magnification
  const handleMouseMove = (e: React.MouseEvent) => {
    const val = position === 'bottom' ? e.pageX : e.pageY;
    mouseX.set(val);
  };
  
  const handleMouseLeave = () => {
    mouseX.set(Infinity);
    setIsHovering(false);
  };
  
  // Check if a page is active
  const isPageActive = (page: NavigationPage): boolean => {
    const pagePath = page.path.startsWith('/') ? page.path : `/${page.path}`;
    return pathname === pagePath || Boolean(pathname?.startsWith(`${pagePath}/`));
  };
  
  // Navigate to page
  const handleNavigate = (page: NavigationPage) => {
    const pagePath = page.path.startsWith('/') ? page.path : `/${page.path}`;
    router.push(pagePath);
  };
  
  // Show loading state
  if (isLoading) {
    return null; // Don't show dock while loading permissions
  }
  
  // Don't render if no pages
  if (dockPages.length === 0) {
    return null;
  }
  
  // Position-based styles
  const positionStyles: Record<'left' | 'right' | 'bottom', string> = {
    bottom: 'bottom-4 left-1/2 -translate-x-1/2 flex-row',
    left: 'left-4 top-1/2 -translate-y-1/2 flex-col',
    right: 'right-4 top-1/2 -translate-y-1/2 flex-col',
  };
  
  const slideVariants = {
    hidden: {
      opacity: 0,
      y: position === 'bottom' ? 100 : 0,
      x: position === 'left' ? -100 : position === 'right' ? 100 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
    },
  };
  
  const ScrollButton = ({ direction }: { direction: 'back' | 'forward' }) => {
    const isBack = direction === 'back';
    const Icon = position === 'bottom' 
      ? (isBack ? ChevronLeft : ChevronRight)
      : (isBack ? ChevronUp : ChevronDown);
    
    const canScroll = isBack ? canScrollBack : canScrollForward;
    
    if (!canScroll) return null;
    
    return (
      <button
        onClick={() => setScrollIndex(prev => 
          isBack ? Math.max(0, prev - 1) : Math.min(dockPages.length - maxItems, prev + 1)
        )}
        className="flex items-center justify-center w-8 h-8 rounded-lg
          bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white
          transition-colors"
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };
  
  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        variants={slideVariants}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        exit="hidden"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        className={`
          fixed z-50 flex items-center gap-2 p-2
          bg-gray-900/80 backdrop-blur-xl rounded-2xl
          border border-gray-700/50 shadow-2xl
          ${positionStyles[position]}
        `}
      >
        {/* Scroll back button */}
        <ScrollButton direction="back" />
        
        {/* Dock items */}
        <div className={`flex gap-2 ${position === 'bottom' ? 'flex-row' : 'flex-col'}`}>
          {visibleItems.map((page) => (
            <DockItem
              key={page.id}
              page={page}
              mouseX={mouseX}
              isActive={isPageActive(page)}
              onClick={() => handleNavigate(page)}
              position={position}
            />
          ))}
        </div>
        
        {/* Scroll forward button */}
        <ScrollButton direction="forward" />
        
        {/* Item count indicator */}
        {dockPages.length > maxItems && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 
            px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-400 text-xs
            border border-gray-700/50">
            {scrollIndex + 1}-{Math.min(scrollIndex + maxItems, dockPages.length)} of {dockPages.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
