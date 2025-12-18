'use client';

import React, { useState } from 'react';
import { 
  useInternalTeam, 
  useCreateTeamMember, 
  useUpdateTeamMember,
  InternalTeamMember,
  InternalRole 
} from '@/hooks/useInternalOperations';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Users, 
  Plus, 
  Shield, 
  DollarSign, 
  Headphones, 
  Code, 
  Heart,
  RefreshCw,
  X,
  Check,
  Edit,
  UserCog,
  Building2
} from 'lucide-react';

const roleConfig: Record<InternalRole, { label: string; icon: React.ReactNode; color: string }> = {
  ENTERPRISE_ADMIN: { label: 'Enterprise Admin', icon: <Shield className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' },
  BISMAN_FINANCE: { label: 'Finance', icon: <DollarSign className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
  BISMAN_BILLING: { label: 'Billing', icon: <DollarSign className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' },
  BISMAN_SUPPORT: { label: 'Support', icon: <Headphones className="w-4 h-4" />, color: 'bg-orange-100 text-orange-800' },
  BISMAN_ENGINEERING: { label: 'Engineering', icon: <Code className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' },
  BISMAN_CUSTOMER_CARE: { label: 'Customer Care', icon: <Heart className="w-4 h-4" />, color: 'bg-pink-100 text-pink-800' },
};

export default function InternalTeamsManagement() {
  const { data, isLoading, error, refetch } = useInternalTeam();
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<InternalTeamMember | null>(null);
  const [newMember, setNewMember] = useState({ email: '', name: '', role: 'BISMAN_SUPPORT' as InternalRole, password: '' });

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(newMember);
      setShowAddModal(false);
      setNewMember({ email: '', name: '', role: 'BISMAN_SUPPORT', password: '' });
    } catch (err) {
      console.error('Failed to create member:', err);
    }
  };

  const handleUpdate = async (member: InternalTeamMember, updates: { role?: InternalRole; isActive?: boolean }) => {
    try {
      await updateMutation.mutateAsync({ userId: member.userId, ...updates });
      setEditingMember(null);
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  };

  const teamByRole: Record<string, InternalTeamMember[]> = data?.team?.reduce((acc, member) => {
    const role = member.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, InternalTeamMember[]>) || {};

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">This page is only accessible to BISMAN internal staff.</p>
          <Button onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Building2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Internal Teams</h1>
            <p className="text-gray-600">Manage BISMAN internal staff and roles</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(roleConfig).map(([role, config]) => (
          <Card key={role} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                {config.icon}
              </div>
              <div>
                <p className="text-sm text-gray-600">{config.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {teamByRole[role]?.length || 0}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Team Members Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Team Members ({data?.team?.length || 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 bg-gray-200 rounded w-48" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-16" /></td>
                  </tr>
                ))
              ) : data?.team?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No team members found</p>
                  </td>
                </tr>
              ) : (
                data?.team?.map((member) => {
                  const config = roleConfig[member.role];
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {member.profilePicUrl ? (
                              <img src={member.profilePicUrl} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                              <span className="text-lg font-medium text-gray-600">
                                {member.name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                          {config?.icon}
                          {config?.label || member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={member.userType === 'ENTERPRISE_ADMIN' ? 'default' : 'secondary'}>
                          {member.userType === 'ENTERPRISE_ADMIN' ? 'Admin' : 'Staff'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={member.isActive ? 'success' : 'destructive'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {member.userType !== 'ENTERPRISE_ADMIN' && (
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingMember(member)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdate(member, { isActive: !member.isActive })}
                            >
                              {member.isActive ? <X className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-green-500" />}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Add Team Member
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="work@bisman.in"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as InternalRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="BISMAN_FINANCE">Finance</option>
                  <option value="BISMAN_BILLING">Billing</option>
                  <option value="BISMAN_SUPPORT">Support</option>
                  <option value="BISMAN_ENGINEERING">Engineering</option>
                  <option value="BISMAN_CUSTOMER_CARE">Customer Care</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Temporary password"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!newMember.email || !newMember.name || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Member'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit Team Member
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingMember(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                <p className="text-gray-900">{editingMember.name} ({editingMember.email})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  defaultValue={editingMember.role}
                  id="editRole"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="BISMAN_FINANCE">Finance</option>
                  <option value="BISMAN_BILLING">Billing</option>
                  <option value="BISMAN_SUPPORT">Support</option>
                  <option value="BISMAN_ENGINEERING">Engineering</option>
                  <option value="BISMAN_CUSTOMER_CARE">Customer Care</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const select = document.getElementById('editRole') as HTMLSelectElement;
                  handleUpdate(editingMember, { role: select.value as InternalRole });
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Permissions Reference */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Role Permissions Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.permissions && Object.entries(data.permissions).map(([role, perms]) => {
            const config = roleConfig[role as InternalRole];
            return (
              <div key={role} className="border rounded-lg p-4">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mb-3 ${config?.color || 'bg-gray-100'}`}>
                  {config?.icon}
                  {config?.label || role}
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {(perms as string[]).map((perm) => (
                    <li key={perm} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      {perm === '*' ? 'Full Access' : perm.replace(':', ' → ').replace('_', ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
