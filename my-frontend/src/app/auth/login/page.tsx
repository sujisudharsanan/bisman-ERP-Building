'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield, 
  Users, 
  Settings, 
  Building, 
  User,
  ChevronDown,
  CheckCircle,
  Briefcase,
  ServerCog,
  Banknote,
  Wallet,
  FileSpreadsheet,
  ReceiptIndianRupee,
  Landmark,
  ShoppingCart,
  Boxes,
  ClipboardCheck,
  Scale
} from 'lucide-react';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  icon: React.ReactNode;
  description: string;
  redirectPath: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    email: 'demo_super_admin@bisman.demo',
    password: 'Demo@123',
    role: 'SUPER_ADMIN',
    department: 'System Administration',
    icon: <Settings className="w-5 h-5" />, 
    description: 'Full system access, database management, security controls',
    redirectPath: '/super-admin'
  },
  {
    id: 'it_admin',
    name: 'IT Admin',
    email: 'demo_it_admin@bisman.demo',
    password: 'Demo@123',
    role: 'IT_ADMIN',
    department: 'IT & Platform',
    icon: <ServerCog className="w-5 h-5" />, 
    description: 'IT operations, platform settings, backups, monitoring',
    redirectPath: '/it-admin'
  },
  {
    id: 'cfo',
    name: 'CFO',
    email: 'demo_cfo@bisman.demo',
    password: 'Demo@123',
    role: 'CFO',
    department: 'Finance Leadership',
    icon: <Banknote className="w-5 h-5" />, 
    description: 'Financial oversight, consolidated reporting, approvals',
    redirectPath: '/cfo-dashboard'
  },
  {
    id: 'finance_controller',
    name: 'Finance Controller',
    email: 'demo_finance_controller@bisman.demo',
    password: 'Demo@123',
    role: 'FINANCE_CONTROLLER',
    department: 'Finance',
    icon: <FileSpreadsheet className="w-5 h-5" />, 
    description: 'Control, closing, compliance with financial policies',
    redirectPath: '/finance-controller'
  },
  {
    id: 'treasury',
    name: 'Treasury',
    email: 'demo_treasury@bisman.demo',
    password: 'Demo@123',
    role: 'TREASURY',
    department: 'Finance - Treasury',
    icon: <Wallet className="w-5 h-5" />, 
    description: 'Cash flow, bank positions, funding, payments',
    redirectPath: '/treasury'
  },
  {
    id: 'accounts',
    name: 'Accounts',
    email: 'demo_accounts@bisman.demo',
    password: 'Demo@123',
    role: 'ACCOUNTS',
    department: 'Finance - Accounts',
    icon: <FileSpreadsheet className="w-5 h-5" />, 
    description: 'GL, journals, reconciliations, month-end tasks',
    redirectPath: '/accounts'
  },
  {
    id: 'accounts_payable',
    name: 'Accounts Payable',
    email: 'demo_accounts_payable@bisman.demo',
    password: 'Demo@123',
    role: 'ACCOUNTS_PAYABLE',
    department: 'Finance - AP',
    icon: <ReceiptIndianRupee className="w-5 h-5" />, 
    description: 'Vendor invoices, 3-way match, payment runs',
    redirectPath: '/accounts-payable'
  },
  {
    id: 'banker',
    name: 'Banker',
    email: 'demo_banker@bisman.demo',
    password: 'Demo@123',
    role: 'BANKER',
    department: 'Finance - Banking',
    icon: <Landmark className="w-5 h-5" />, 
    description: 'Bank liaison, statements, reconciliations',
    redirectPath: '/banker'
  },
  {
    id: 'procurement_officer',
    name: 'Procurement Officer',
    email: 'demo_procurement_officer@bisman.demo',
    password: 'Demo@123',
    role: 'PROCUREMENT_OFFICER',
    department: 'Procurement',
    icon: <ShoppingCart className="w-5 h-5" />, 
    description: 'PR/PO lifecycle, vendor management',
    redirectPath: '/procurement-officer'
  },
  {
    id: 'store_incharge',
    name: 'Store Incharge',
    email: 'demo_store_incharge@bisman.demo',
    password: 'Demo@123',
    role: 'STORE_INCHARGE',
    department: 'Stores & Warehouse',
    icon: <Boxes className="w-5 h-5" />, 
    description: 'GRN, inventory custody, stock movements',
    redirectPath: '/store-incharge'
  },
  {
    id: 'compliance',
    name: 'Compliance',
    email: 'demo_compliance@bisman.demo',
    password: 'Demo@123',
    role: 'COMPLIANCE',
    department: 'Governance',
    icon: <ClipboardCheck className="w-5 h-5" />, 
    description: 'Policy, audit trails, corrective actions',
    redirectPath: '/compliance-officer'
  },
  {
    id: 'legal',
    name: 'Legal',
    email: 'demo_legal@bisman.demo',
    password: 'Demo@123',
    role: 'LEGAL',
    department: 'Legal',
    icon: <Scale className="w-5 h-5" />, 
    description: 'Contracts, disputes, SLA enforcement',
    redirectPath: '/legal'
  },
  {
    id: 'admin',
    name: 'Admin',
    email: 'demo_admin@bisman.demo',
    password: 'Demo@123',
    role: 'ADMIN',
    department: 'Administration',
    icon: <Shield className="w-5 h-5" />, 
    description: 'User management, roles, permissions, system configuration',
    redirectPath: '/admin'
  },
  {
    id: 'manager',
    name: 'Operations Manager',
    email: 'demo_operations_manager@bisman.demo',
    password: 'Demo@123',
    role: 'MANAGER',
    department: 'Operations',
    icon: <Briefcase className="w-5 h-5" />, 
    description: 'Management dashboard, reports, staff oversight, hub operations',
    redirectPath: '/operations-manager'
  },
  {
    id: 'hub_incharge',
    name: 'Hub Incharge',
    email: 'demo_hub_incharge@bisman.demo',
    password: 'Demo@123',
    role: 'HUB_INCHARGE',
    department: 'Operations',
    icon: <Building className="w-5 h-5" />, 
    description: 'Hub-level operations, inventory, sales, approvals, task management',
    redirectPath: '/hub-incharge'
  }
];

export default function StandardLoginPage() {
  const brandCandidates = ['/brand/bisman-logo.svg', '/brand/logo.svg', '/bisman_lockup.svg', '/bisman_logo.svg', '/bisman_logo.png'] as const;
  const [brandIndex, setBrandIndex] = useState(0);
  const [brandHidden, setBrandHidden] = useState(false);
  const [cacheBuster, setCacheBuster] = useState('');
  
  // Set cache buster only on client to avoid hydration mismatch
  useEffect(() => {
    setCacheBuster(Date.now().toString());
  }, []);
  
  const brandImgSrc = `${brandCandidates[brandIndex] || brandCandidates[0]}${cacheBuster ? `?v=${cacheBuster}` : ''}`;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDemoUsers, setShowDemoUsers] = useState(false);
  const router = useRouter();

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = await login(email.trim(), password);
      if (user) {
        setSuccess('Login successful! Redirecting...');

        // Small delay to ensure cookies are set before redirect
        await new Promise(resolve => setTimeout(resolve, 300));

        // Role-based redirection - route to independent role dashboards
        let targetPath = '/dashboard'; // Default fallback
        switch (user.roleName?.toUpperCase()) {
          // System Administration
          case 'SUPER_ADMIN':
            targetPath = '/super-admin';
            break;
          case 'ADMIN':
          case 'SYSTEM ADMINISTRATOR':
            targetPath = '/admin';
            break;
          case 'IT_ADMIN':
          case 'IT ADMIN':
            targetPath = '/it-admin';
            break;
            
          // Finance Roles → Independent Finance Dashboards
          case 'CFO':
            targetPath = '/cfo-dashboard';
            break;
          case 'FINANCE_CONTROLLER':
          case 'FINANCE CONTROLLER':
            targetPath = '/finance-controller';
            break;
          case 'TREASURY':
            targetPath = '/treasury';
            break;
          case 'ACCOUNTS':
            targetPath = '/accounts';
            break;
          case 'ACCOUNTS_PAYABLE':
          case 'ACCOUNTS PAYABLE':
            targetPath = '/accounts-payable';
            break;
          case 'ACCOUNTS_RECEIVABLE':
          case 'ACCOUNTS RECEIVABLE':
            targetPath = '/accounts';
            break;
          case 'BANKER':
            targetPath = '/banker';
            break;
            
          // Procurement Roles → Procurement Dashboard
          case 'PROCUREMENT_OFFICER':
          case 'PROCUREMENT OFFICER':
          case 'PROCUREMENT_HEAD':
          case 'PROCUREMENT HEAD':
          case 'PROCUREMENT_MANAGER':
          case 'PROCUREMENT MANAGER':
          case 'SUPPLIER_MANAGER':
          case 'SUPPLIER MANAGER':
            targetPath = '/procurement-officer';
            break;
            
          // Operations Roles → Independent Operations Dashboards
          case 'OPERATIONS_MANAGER':
          case 'OPERATIONS MANAGER':
          case 'WAREHOUSE_MANAGER':
          case 'WAREHOUSE MANAGER':
          case 'LOGISTICS_MANAGER':
          case 'LOGISTICS MANAGER':
          case 'INVENTORY_CONTROLLER':
          case 'INVENTORY CONTROLLER':
            targetPath = '/operations-manager';
            break;
          case 'HUB_INCHARGE':
          case 'HUB INCHARGE':
            targetPath = '/hub-incharge';
            break;
          case 'STORE_INCHARGE':
          case 'STORE INCHARGE':
            targetPath = '/store-incharge';
            break;
            
          // Compliance & Legal → Independent Dashboards
          case 'COMPLIANCE':
          case 'COMPLIANCE_OFFICER':
          case 'COMPLIANCE OFFICER':
            targetPath = '/compliance-officer';
            break;
          case 'LEGAL':
          case 'LEGAL_HEAD':
          case 'LEGAL HEAD':
          case 'RISK_MANAGER':
          case 'RISK MANAGER':
            targetPath = '/legal';
            break;
            
          // Staff → Hub Incharge Dashboard
          case 'STAFF':
            targetPath = '/staff';
            break;
            
          // Manager → Operations Manager Dashboard
          case 'MANAGER':
            targetPath = '/operations-manager';
            break;
            
          default:
            // For any other role, default to manager dashboard
            targetPath = '/manager';
            break;
        }
        
        // Use location.replace for a clean navigation with cookies
        window.location.replace(targetPath);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      // Error logged for debugging purposes
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (user: DemoUser) => {
    setEmail(user.email);
    setPassword(user.password);
    setShowDemoUsers(false);
    setError('');
    setSuccess('');
  };

  const handleQuickLogin = async (user: DemoUser) => {
    setLoading(true);
    setError('');
    setSuccess(`Logging in as ${user.name}...`);

    try {
      const logged = await login(user.email, user.password);
      if (logged) {
        setSuccess(`Welcome ${user.name}! Redirecting to your dashboard...`);
        
        // Small delay to ensure cookies are set before redirect
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use location.replace for a clean navigation with cookies
        window.location.replace(user.redirectPath);
      } else {
        setError('Quick login failed.');
      }
    } catch {
      setError('Network error during quick login.');
      // Error logged for debugging purposes
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <div className="min-h-screen w-full overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        {/* Theme toggle fixed at the top-right of the viewport */}
        <div className="fixed top-4 right-4 z-50">
          <DarkModeToggle />
        </div>
        
        <div className="w-full max-w-md md:max-w-4xl mx-auto flex flex-col items-center">
          {/* Success message above box on small screens */}
          {success && (
            <div className="md:hidden w-full mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="break-words">{success}</span>
          </div>
        )}
        
        {/* Login box - single column on small, two columns on large */}
        <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left branding panel - hidden on small, visible on md+ */}
          <div className="hidden md:flex md:w-1/2 bg-white dark:bg-gray-900 p-8 flex-col justify-center relative">
            {/* Logo */}
            <div className="absolute top-6 left-6 flex flex-row items-center space-x-3 z-10">
              <img
                src={brandImgSrc}
                alt="Bisman ERP Solutions"
                className="h-11 w-auto object-contain select-none"
                draggable={false}
                onError={() => setBrandHidden(true)}
              />
              <div className="leading-tight" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{
                  fontFamily: "'Montserrat', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                  fontWeight: 900,
                  fontSize: '29px',
                  lineHeight: 1,
                  marginBottom: 0
                }} className="text-[#0F386E] dark:text-white">Bisman</div>
                <div style={{
                  fontFamily: "'Open Sans', Arial, sans-serif",
                  fontWeight: 400,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginTop: '4px'
                }} className="text-[#0F386E] dark:text-white">ERP SOLUTIONS</div>
              </div>
            </div>
            
            {/* Large welcome text */}
            <div className="flex flex-1 items-center justify-center">
              <h1 className="text-4xl sm:text-5xl font-normal text-left text-[#0F386E] dark:text-white leading-tight">
                <span className="font-normal">Hello,</span><br />
                <span className="font-bold">welcome!</span>
              </h1>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800" />

          {/* Right form panel */}
          <div className="w-full md:w-1/2 bg-white dark:bg-gray-900 p-6 md:p-10">
            {/* Logo for mobile only */}
            <div className="md:hidden flex flex-row items-center space-x-3 mb-6">
              <img
                src={brandImgSrc}
                alt="Bisman ERP Solutions"
                className="h-9 w-auto object-contain select-none"
                draggable={false}
                onError={() => setBrandHidden(true)}
              />
              <div className="leading-tight" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{
                  fontFamily: "'Montserrat', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                  fontWeight: 900,
                  fontSize: '29px',
                  lineHeight: 1,
                  marginBottom: 0
                }} className="text-[#0F386E] dark:text-white">Bisman</div>
                <div style={{
                  fontFamily: "'Open Sans', Arial, sans-serif",
                  fontWeight: 400,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginTop: '4px'
                }} className="text-[#0F386E] dark:text-white">ERP SOLUTIONS</div>
              </div>
            </div>
            
            {/* Welcome message for mobile */}
            <div className="md:hidden mb-4">
              <span className="text-[1.375rem] font-normal text-[#0F386E] dark:text-white">
                Hello, <span className="font-bold">welcome!</span>
              </span>
            </div>

            {/* Success message for desktop */}
            {success && (
              <div className="hidden md:flex mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm items-center">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="break-words">{success}</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm break-words">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-[1.375rem] font-bold text-slate-800 dark:text-slate-100 mb-2">Sign in</h2>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Email or phone
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${error ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'} rounded-md text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none`}
                placeholder="Email or phone"
                required
                autoComplete="email"
              />
              {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">Enter an email or phone number</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none pr-12"
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <button type="button" className="text-sm text-sky-600 hover:underline">Forgot email?</button>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="inline-flex items-center bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-2 rounded-full focus:outline-none"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                  ) : (
                    <span>Next</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Demo Users */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-600">Demo accounts</h3>
              <button onClick={() => setShowDemoUsers(!showDemoUsers)} className="text-sm text-slate-400">{showDemoUsers ? 'Hide' : 'Show'}</button>
            </div>

            {showDemoUsers && (
              <div className="mt-3 space-y-3">
                {DEMO_USERS.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center text-amber-600">{user.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{user.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.department}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => fillDemoCredentials(user)} className="text-xs px-3 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 border rounded">Fill</button>
                      <button onClick={() => handleQuickLogin(user)} disabled={loading} className="text-xs px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded">Login</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-slate-400 dark:text-slate-500 break-words">Not your computer? Use Private Browsing windows to sign in. Learn more about using Guest mode</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
