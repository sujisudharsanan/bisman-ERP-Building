'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Edit3,
  Trash2,
  Shield,
  Eye,
  MoreVertical,
  AlertCircle
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  roleName: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Role-based access control - allow ADMIN, SUPER_ADMIN
      if (!user.roleName || !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading users dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName || !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access user management.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Sample user data
  const sampleUsers: User[] = [
    {
      id: 1,
      username: 'superadmin',
      email: 'superadmin@bisman.com',
      roleName: 'SUPER_ADMIN',
      status: 'active',
      lastLogin: '2025-10-05T10:30:00Z',
      createdAt: '2025-01-15T09:00:00Z'
    },
    {
      id: 2,
      username: 'admin',
      email: 'admin@bisman.com',
      roleName: 'ADMIN',
      status: 'active',
      lastLogin: '2025-10-05T08:15:00Z',
      createdAt: '2025-02-01T14:30:00Z'
    },
    {
      id: 3,
      username: 'manager1',
      email: 'manager@bisman.com',
      roleName: 'MANAGER',
      status: 'active',
      lastLogin: '2025-10-04T16:45:00Z',
      createdAt: '2025-03-10T11:20:00Z'
    },
    {
      id: 4,
      username: 'hubstaff1',
      email: 'staff@bisman.com',
      roleName: 'STAFF',
      status: 'active',
      lastLogin: '2025-10-03T12:00:00Z',
      createdAt: '2025-04-05T13:15:00Z'
    }
  ];

  const userStats = [
    { title: 'Total Users', value: '24', icon: Users, color: 'text-blue-600' },
    { title: 'Active Users', value: '22', icon: Shield, color: 'text-green-600' },
    { title: 'Inactive Users', value: '2', icon: AlertCircle, color: 'text-red-600' },
    { title: 'New This Month', value: '3', icon: UserPlus, color: 'text-purple-600' }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'ADMIN': return 'bg-blue-100 text-blue-800';
      case 'MANAGER': return 'bg-green-100 text-green-800';
      case 'STAFF': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage users, roles, and permissions across the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {userStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-50">
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filter by Role */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
            </div>

            {/* Add User Button */}
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleUsers.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {userData.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userData.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userData.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userData.roleName)}`}>
                        {userData.roleName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(userData.status)}`}>
                        {userData.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userData.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userData.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-800">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Under Development Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                Feature Under Development
              </h3>
              <p className="text-yellow-700 mt-1">
                Advanced user management features including role assignment, 
                bulk operations, and detailed audit logs are currently being developed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}