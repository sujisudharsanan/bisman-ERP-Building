'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
  FileSpreadsheet,
  Wallet,
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
    name: 'System Administrator',
    email: 'super@bisman.local',
    password: 'changeme',
    role: 'SUPER_ADMIN',
    department: 'System Administration',
    icon: <Settings className="w-5 h-5" />,
    description: 'Full system access, database management, security controls',
    redirectPath: '/super-admin'
  },
  {
    id: 'it_admin',
    name: 'IT Administrator',
    email: 'it@bisman.local',
    password: 'changeme',
    role: 'IT_ADMIN',
    department: 'IT & Platform',
    icon: <ServerCog className="w-5 h-5" />,
    description: 'IT operations, platform settings, backups, monitoring',
    redirectPath: '/admin'
  },
  {
    id: 'cfo',
    name: 'Chief Financial Officer',
    email: 'cfo@bisman.local',
    password: 'changeme',
    role: 'CFO',
    department: 'Finance Leadership',
    icon: <Banknote className="w-5 h-5" />,
    description: 'Financial oversight, consolidated reporting, approvals',
    redirectPath: '/dashboard'
  },
  {
    id: 'finance_controller',
    name: 'Finance Controller',
    email: 'controller@bisman.local',
    password: 'changeme',
    role: 'FINANCE_CONTROLLER',
    department: 'Finance',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    description: 'Control, closing, compliance with financial policies',
    redirectPath: '/dashboard'
  },
  {
    id: 'treasury',
    name: 'Treasury',
    email: 'treasury@bisman.local',
    password: 'changeme',
    role: 'TREASURY',
    department: 'Finance - Treasury',
    icon: <Wallet className="w-5 h-5" />,
    description: 'Cash flow, bank positions, funding, payments',
    redirectPath: '/dashboard'
  },
  {
    id: 'accounts',
    name: 'Accounts',
    email: 'accounts@bisman.local',
    password: 'changeme',
    role: 'ACCOUNTS',
    department: 'Finance - Accounts',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    description: 'GL, journals, reconciliations, month-end tasks',
    redirectPath: '/dashboard'
  },
  {
    id: 'ap',
    name: 'Accounts Payable',
    email: 'ap@bisman.local',
    password: 'changeme',
    role: 'ACCOUNTS_PAYABLE',
    department: 'Finance - AP',
    icon: <ReceiptIndianRupee className="w-5 h-5" />,
    description: 'Vendor invoices, 3-way match, payment runs',
    redirectPath: '/dashboard'
  },
  {
    id: 'banker',
    name: 'Banker',
    email: 'banker@bisman.local',
    password: 'changeme',
    role: 'BANKER',
    department: 'Finance - Banking',
    icon: <Landmark className="w-5 h-5" />,
    description: 'Bank liaison, statements, reconciliations',
    redirectPath: '/dashboard'
  },
  {
    id: 'procurement',
    name: 'Procurement Officer',
    email: 'procurement@bisman.local',
    password: 'changeme',
    role: 'PROCUREMENT_OFFICER',
    department: 'Procurement',
    icon: <ShoppingCart className="w-5 h-5" />,
    description: 'PR/PO lifecycle, vendor management',
    redirectPath: '/dashboard'
  },
  {
    id: 'store_incharge',
    name: 'Store Incharge',
    email: 'store@bisman.local',
    password: 'changeme',
    role: 'STORE_INCHARGE',
    department: 'Stores & Warehouse',
    icon: <Boxes className="w-5 h-5" />,
    description: 'GRN, inventory custody, stock movements',
    redirectPath: '/dashboard'
  },
  {
    id: 'compliance',
    name: 'Compliance',
    email: 'compliance@bisman.local',
    password: 'changeme',
    role: 'COMPLIANCE',
    department: 'Governance',
    icon: <ClipboardCheck className="w-5 h-5" />,
    description: 'Policy, audit trails, corrective actions',
    redirectPath: '/dashboard'
  },
  {
    id: 'legal',
    name: 'Legal',
    email: 'legal@bisman.local',
    password: 'changeme',
    role: 'LEGAL',
    department: 'Legal',
    icon: <Scale className="w-5 h-5" />,
    description: 'Contracts, disputes, SLA enforcement',
    redirectPath: '/dashboard'
  },
  {
    id: 'admin',
    name: 'Admin User',
    email: 'admin@bisman.local',
    password: 'changeme',
    role: 'ADMIN',
    department: 'Administration',
    icon: <Shield className="w-5 h-5" />,
    description: 'User management, roles, permissions, system configuration',
    redirectPath: '/admin'
  },
  {
    id: 'manager',
    name: 'Operations Manager',
    email: 'manager@business.com',
    password: 'manager123',
    role: 'MANAGER',
    department: 'Operations',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Management dashboard, reports, staff oversight, hub operations',
    redirectPath: '/dashboard'
  },
  {
    id: 'hub_incharge',
    name: 'Hub Incharge',
    email: 'staff@business.com',
    password: 'staff123',
    role: 'STAFF',
    department: 'Hub Operations',
    icon: <Building className="w-5 h-5" />,
    description: 'Hub management, inventory, sales, approvals, task management',
    redirectPath: '/hub-incharge'
  },
  {
    id: 'demo_user',
    name: 'Demo User',
    email: 'demo@bisman.local',
    password: 'Demo@123',
    role: 'USER',
    department: 'General',
    icon: <User className="w-5 h-5" />,
    description: 'Basic dashboard access, profile management, standard features',
    redirectPath: '/dashboard'
  }
];

export default function StandardLoginPage() {
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

        // Role-based redirection (use full-page navigation to ensure fresh app state)
        switch (user.roleName?.toUpperCase()) {
          case 'SUPER_ADMIN':
            window.location.href = '/super-admin';
            break;
          case 'ADMIN':
            window.location.href = '/admin';
            break;
          case 'STAFF':
            window.location.href = '/hub-incharge';
            break;
          case 'MANAGER':
          case 'USER':
          default:
            window.location.href = '/dashboard';
            break;
        }
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
  window.location.href = user.redirectPath;
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* Left branding panel */}
        <div className="w-1/2 bg-white p-12 flex flex-col items-start justify-center space-y-6">
          <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
            <div className="w-8 h-8 bg-amber-500 rounded-full" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Sign in</h1>
            <p className="text-slate-500 mt-1">Use your account</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-200" />

        {/* Right form panel */}
        <div className="w-1/2 bg-white p-10">
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-2">
                Email or phone
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 border ${error ? 'border-red-400' : 'border-slate-200'} rounded-md text-slate-700 placeholder-slate-400 focus:outline-none`}
                placeholder="Email or phone"
                required
                autoComplete="email"
              />
              {error && <p className="text-red-500 text-sm mt-2">Enter an email or phone number</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none pr-12"
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  <div key={user.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-md p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center text-amber-600">{user.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.department}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => fillDemoCredentials(user)} className="text-xs px-3 py-1 bg-white text-slate-700 border rounded">Fill</button>
                      <button onClick={() => handleQuickLogin(user)} disabled={loading} className="text-xs px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded">Login</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-slate-400">Not your computer? Use Private Browsing windows to sign in. Learn more about using Guest mode</div>
        </div>
      </div>
    </div>
  );
}
