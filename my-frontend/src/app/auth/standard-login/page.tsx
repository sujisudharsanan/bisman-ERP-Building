'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Briefcase
} from 'lucide-react';
import { API_BASE } from '@/config/api';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Login successful! Redirecting...');

        // Store user data in localStorage for compatibility
        localStorage.setItem('token', data.token || 'cookie-based');
        localStorage.setItem(
          'user',
          JSON.stringify({
            email: data.email,
            role: data.role,
            name: email.split('@')[0],
          })
        );

        // Role-based redirection
        setTimeout(() => {
          switch (data.role?.toUpperCase()) {
            case 'SUPER_ADMIN':
              router.push('/super-admin');
              break;
            case 'ADMIN':
              router.push('/admin');
              break;
            case 'STAFF':
              router.push('/hub-incharge');
              break;
            case 'MANAGER':
            case 'USER':
            default:
              router.push('/dashboard');
              break;
          }
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed. Please check your credentials.');
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
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Welcome ${user.name}! Redirecting to your dashboard...`);

        localStorage.setItem('token', data.token || 'cookie-based');
        localStorage.setItem(
          'user',
          JSON.stringify({
            email: data.email,
            role: data.role,
            name: user.name,
          })
        );

        setTimeout(() => {
          router.push(user.redirectPath);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Quick login failed.');
      }
    } catch {
      setError('Network error during quick login.');
      // Error logged for debugging purposes
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">BISMAN ERP</h1>
          <p className="text-blue-200 text-lg">Enterprise Resource Planning</p>
          <p className="text-blue-300 text-sm mt-1">Secure Business Management System</p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">Sign In</h2>
            <p className="text-blue-200">Access your workspace</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg text-green-100 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-100 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm pr-12"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-200 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <button className="text-blue-200 hover:text-white text-sm transition-colors">
              Forgot your password?
            </button>
          </div>
        </div>

        {/* Demo Users Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6">
          <button
            onClick={() => setShowDemoUsers(!showDemoUsers)}
            className="w-full flex items-center justify-between text-white hover:text-blue-200 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span className="font-medium">Demo Users</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${showDemoUsers ? 'rotate-180' : ''}`}
            />
          </button>

          {showDemoUsers && (
            <div className="mt-4 space-y-3">
              <p className="text-blue-200 text-sm mb-4">
                Choose a demo user to explore different system roles and capabilities:
              </p>

              {DEMO_USERS.map((user) => (
                <div
                  key={user.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600/30 rounded-lg flex items-center justify-center">
                      {user.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium">{user.name}</h3>
                        <span className="text-xs text-blue-300 bg-blue-600/20 px-2 py-1 rounded">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-blue-200 text-sm mb-2">{user.department}</p>
                      <p className="text-blue-300 text-xs mb-3">{user.description}</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => fillDemoCredentials(user)}
                          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded transition-colors"
                        >
                          Fill Credentials
                        </button>
                        <button
                          onClick={() => handleQuickLogin(user)}
                          disabled={loading}
                          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                        >
                          Quick Login
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-300 text-sm">
          <p>&copy; 2025 BISMAN ERP. All rights reserved.</p>
          <p className="mt-1">Secure • Reliable • Professional</p>
        </div>
      </div>
    </div>
  );
}
