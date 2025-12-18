'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { 
  Eye, 
  EyeOff,
  CheckCircle,
  User,
  Shield,
  Bug
} from 'lucide-react';
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
  const router = useRouter();

  const { login } = useAuth();

  // Demo credentials - removed for security
  const demoAccountsSections: { category: string; accounts: Array<{ id: number; name: string; email: string; password: string; role: string; icon: typeof Shield; description: string }> }[] = [
    // Credentials removed for security - use proper authentication
  ];

  // Flatten for backward compatibility
  const demoAccounts = demoAccountsSections.flatMap(section => section.accounts);

  const fillDemoCredentials = (account: typeof demoAccounts[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const handleQuickLogin = async (account: typeof demoAccounts[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    
    // Trigger form submission
    setLoading(true);
    setSuccess('');

    try {
      const user = await login(account.email, account.password);
      if (user) {
        setSuccess('Login successful! Redirecting...');
        await new Promise(resolve => setTimeout(resolve, 300));
        const roleValue = (user.roleName || user.role || '').toUpperCase().replace(/\s+/g, '_');
        
        let targetPath = '/dashboard';
        if (roleValue === 'ENTERPRISE_ADMIN') {
          targetPath = '/enterprise-admin/dashboard';
        } else if (roleValue === 'SUPER_ADMIN') {
          targetPath = '/super-admin';
        } else if (roleValue === 'ADMIN' || roleValue === 'SYSTEM_ADMINISTRATOR') {
          targetPath = '/admin';
        }
        
        window.location.replace(targetPath);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

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

        // Normalize role name - handle both 'role' and 'roleName' fields
        const roleValue = (user.roleName || user.role || '').toUpperCase().replace(/\s+/g, '_');
        console.log('🔍 Login - User role detected:', roleValue);

        // Simplified role-based redirection
        // Only admin roles have specialized dashboards, everyone else goes to unified /dashboard
        let targetPath = '/dashboard'; // Default for ALL standard roles
        
        switch (roleValue) {
          // Admin roles keep their specialized dashboards
          case 'ENTERPRISE_ADMIN':
            targetPath = '/enterprise-admin/dashboard';
            break;
          case 'SUPER_ADMIN':
            targetPath = '/super-admin';
            break;
          case 'ADMIN':
          case 'SYSTEM_ADMINISTRATOR':
            targetPath = '/admin';
            break;
          default:
            // ALL other roles (CFO, STAFF, HUB_INCHARGE, STORE_INCHARGE, etc.)
            // go to the unified dashboard which handles role-specific rendering
            targetPath = '/dashboard';
            break;
        }
        
        console.log('🎯 Final redirect path:', targetPath);
        
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

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <a 
                href="/signup" 
                className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
              >
                Start your free trial
              </a>
            </p>
          </div>

          <div className="mt-6 text-xs text-slate-400 dark:text-slate-500 break-words">Not your computer? Use Private Browsing windows to sign in. Learn more about using Guest mode</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
