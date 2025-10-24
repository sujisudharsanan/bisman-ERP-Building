'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { User, Upload, Search, Landmark, Plus, Edit3, Trash2, Eye, EyeOff, Star, CheckCircle, Clock, X, Check } from 'lucide-react';

interface EmployeeDetail {
  label: string;
  value: string;
}

interface EducationSection {
  title: string;
  items: string[];
}

interface AwardsSection {
  title: string;
  items: string[];
}

interface ExperienceSection {
  title: string;
  items: string[];
}

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  account_type: 'savings' | 'current' | 'salary' | 'business';
  bank_name: string;
  branch_name?: string;
  ifsc_code?: string;
  swift_code?: string;
  iban?: string;
  currency: string;
  is_primary: boolean;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface BankAccountFormData {
  account_holder_name: string;
  account_number: string;
  account_type: 'savings' | 'current' | 'salary' | 'business';
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  swift_code: string;
  iban: string;
  currency: string;
  is_primary: boolean;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  photo: string;
  about: string;
  details?: EmployeeDetail[];
  education?: EducationSection;
  awards?: AwardsSection;
  experience?: ExperienceSection;
}

interface AboutMePageProps {
  customEmployees?: Employee[];
  apiBaseUrl?: string;
  showTeamSidebar?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Reusable About Me Page Component
 * Displays user profile, team members, and allows profile picture upload
 * Can be used across all role-based dashboards
 */
export const AboutMePage: React.FC<AboutMePageProps> = ({
  customEmployees,
  apiBaseUrl = API_BASE,
  showTeamSidebar = true,
}) => {
  const { user } = useAuth();

  // Default employee data based on logged-in user
  const defaultEmployees: Employee[] = useMemo(
    () => [
      {
        id: 1,
        name: user?.name || user?.username || 'User',
        role: user?.roleName || 'Staff Member',
        photo:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80',
        about: `Experienced ${user?.roleName || 'professional'} at BISMAN ERP. Dedicated to excellence in ${user?.roleName?.toLowerCase() || 'operations'} management and team collaboration.`,
        details: [
          { label: 'Employee ID', value: user?.id?.toString() || 'N/A' },
          { label: 'Designation', value: user?.roleName || 'Staff' },
          { label: 'Official Email', value: user?.email || 'N/A' },
          { label: 'Username', value: user?.username || 'N/A' },
          { label: 'Role', value: user?.role || user?.roleName || 'N/A' },
        ],
        education: {
          title: 'Education Qualification',
          items: [
            'Professional qualifications relevant to role',
            'Certifications and training completed',
          ],
        },
        awards: {
          title: 'Achievements and Awards',
          items: [
            'Performance excellence recognized',
            'Contributions to team success',
          ],
        },
        experience: {
          title: 'Experience History: Designations & Expertise',
          items: [
            `<strong>${user?.roleName || 'Current Role'}</strong> - BISMAN ERP: Managing responsibilities with focus on operational excellence.`,
          ],
        },
      },
    ],
    [user]
  );

  const employees = customEmployees || defaultEmployees;

  const [activeEmployee, setActiveEmployee] = useState<Employee>(() => employees[0]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);
  const [uploading, setUploading] = useState(false);

  // Bank Account States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [showAccountNumbers, setShowAccountNumbers] = useState<Set<string>>(new Set());
  const [bankFormData, setBankFormData] = useState<BankAccountFormData>({
    account_holder_name: '',
    account_number: '',
    account_type: 'savings',
    bank_name: '',
    branch_name: '',
    ifsc_code: '',
    swift_code: '',
    iban: '',
    currency: 'USD',
    is_primary: false,
  });

  // Filter employees based on search term
  useEffect(() => {
    const filtered = employees.filter(
      employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  // Load user's existing profile picture
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const baseURL = apiBaseUrl;
        const response = await fetch(`${baseURL}/api/upload/profile-pic`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.profile_pic_url) {
            setSelectedPhoto(`${baseURL}${result.profile_pic_url}`);
          }
        }
      } catch {
        // Could not load profile picture - continue without it
      }
    };

    loadProfilePicture();
  }, [apiBaseUrl]);

  // Load bank accounts
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`${apiBaseUrl}/api/bank-accounts`, {
        //   method: 'GET',
        //   credentials: 'include',
        // });
        // if (response.ok) {
        //   const data = await response.json();
        //   setBankAccounts(data.accounts);
        // }

        // Mock data for now
        const mockAccounts: BankAccount[] = [
          {
            id: '1',
            account_holder_name: user?.name || user?.username || 'User',
            account_number: '1234567890',
            account_type: 'salary',
            bank_name: 'State Bank of India',
            branch_name: 'Main Branch',
            ifsc_code: 'SBIN0001234',
            currency: 'INR',
            is_primary: true,
            is_verified: true,
            is_active: true,
            created_at: '2024-01-01',
          },
        ];
        setBankAccounts(mockAccounts);
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
      }
    };

    if (user) {
      loadBankAccounts();
    }
  }, [user, apiBaseUrl]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('profile_pic', file);

      const baseURL = apiBaseUrl;
      const response = await fetch(`${baseURL}/api/upload/profile-pic`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const fullImageUrl = `${baseURL}${result.url}`;
        setSelectedPhoto(fullImageUrl);
        alert('Profile picture updated successfully!');
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      alert(`Upload failed: ${errMsg}`);
    } finally {
      setUploading(false);
      const input = document.getElementById('photo-upload-input') as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  // Bank Account Functions
  const handleAddBankAccount = () => {
    setBankFormData({
      account_holder_name: user?.name || user?.username || '',
      account_number: '',
      account_type: 'savings',
      bank_name: '',
      branch_name: '',
      ifsc_code: '',
      swift_code: '',
      iban: '',
      currency: 'USD',
      is_primary: bankAccounts.length === 0,
    });
    setEditingAccount(null);
    setShowBankModal(true);
  };

  const handleEditBankAccount = (account: BankAccount) => {
    setBankFormData({
      account_holder_name: account.account_holder_name,
      account_number: account.account_number,
      account_type: account.account_type,
      bank_name: account.bank_name,
      branch_name: account.branch_name || '',
      ifsc_code: account.ifsc_code || '',
      swift_code: account.swift_code || '',
      iban: account.iban || '',
      currency: account.currency,
      is_primary: account.is_primary,
    });
    setEditingAccount(account);
    setShowBankModal(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Replace with actual API call
      console.log('Save bank account:', bankFormData);
      setShowBankModal(false);
      // Reload accounts after save
    } catch (error) {
      console.error('Failed to save bank account:', error);
    }
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    try {
      // TODO: Replace with actual API call
      console.log('Delete account:', accountId);
      setBankAccounts(accounts => accounts.filter(a => a.id !== accountId));
    } catch (error) {
      console.error('Failed to delete bank account:', error);
    }
  };

  const toggleShowAccountNumber = (accountId: string) => {
    setShowAccountNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'savings': return '💰';
      case 'current': return '💼';
      case 'salary': return '💵';
      case 'business': return '🏢';
      default: return '🏦';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <style jsx>{`
        .profile-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: 24px;
          flex-direction: column;
        }

        @media (min-width: 1024px) {
          .profile-container {
            flex-direction: row;
          }
        }

        .team-sidebar {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 20px;
          height: fit-content;
        }

        .dark .team-sidebar {
          background-color: #1f2937;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        @media (min-width: 1024px) {
          .team-sidebar {
            flex: 0 0 280px;
            position: sticky;
            top: 20px;
          }
        }

        .team-sidebar h3 {
          color: #3b82f6;
          font-size: 18px;
          margin-bottom: 15px;
          text-align: center;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .dark .team-sidebar h3 {
          color: #60a5fa;
          border-bottom-color: #374151;
        }

        .team-members-scroll {
          max-height: 500px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .team-members-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .team-members-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .dark .team-members-scroll::-webkit-scrollbar-track {
          background: #374151;
        }

        .team-members-scroll::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 3px;
        }

        .team-member-card {
          display: flex;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .team-member-card:hover {
          background-color: #f8fafc;
          border-color: #3b82f6;
        }

        .dark .team-member-card:hover {
          background-color: #374151;
          border-color: #60a5fa;
        }

        .team-member-card.active {
          background-color: #ebf4ff;
          border-color: #3b82f6;
        }

        .dark .team-member-card.active {
          background-color: #1e3a8a;
          border-color: #60a5fa;
        }

        .team-member-photo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 12px;
          border: 2px solid #e5e7eb;
        }

        .dark .team-member-photo {
          border-color: #4b5563;
        }

        .team-member-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 2px 0;
        }

        .dark .team-member-info h4 {
          color: #f3f4f6;
        }

        .team-member-info p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        .dark .team-member-info p {
          color: #9ca3af;
        }

        .profile-section {
          flex: 1;
          display: flex;
          gap: 20px;
          flex-direction: column;
        }

        @media (min-width: 768px) {
          .profile-section {
            flex-direction: row;
          }
        }

        .profile-left-column {
          flex: 1;
        }

        @media (min-width: 768px) {
          .profile-left-column {
            flex: 0 0 320px;
          }
        }

        .profile-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 24px;
          margin-bottom: 20px;
        }

        .dark .profile-card {
          background-color: #1f2937;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .profile-photo-container {
          text-align: center;
          margin-bottom: 20px;
        }

        .profile-photo {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 15px;
          border: 4px solid #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .upload-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background-color 0.2s;
        }

        .upload-button:hover {
          background-color: #2563eb;
        }

        .upload-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .about-me-text h3 {
          color: #3b82f6;
          font-size: 16px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dark .about-me-text h3 {
          color: #60a5fa;
        }

        .about-me-text p {
          color: #6b7280;
          line-height: 1.8;
        }

        .dark .about-me-text p {
          color: #d1d5db;
        }

        .info-section {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 20px;
          margin-bottom: 20px;
        }

        .dark .info-section {
          background-color: #1f2937;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .info-section h3 {
          color: #3b82f6;
          font-size: 18px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }

        .dark .info-section h3 {
          color: #60a5fa;
          border-bottom-color: #374151;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          padding: 10px;
          border-left: 3px solid #3b82f6;
          background-color: #f8fafc;
          border-radius: 4px;
        }

        .dark .info-item {
          background-color: #374151;
          border-left-color: #60a5fa;
        }

        .info-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dark .info-label {
          color: #9ca3af;
        }

        .info-value {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }

        .dark .info-value {
          color: #f3f4f6;
        }

        .list-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .list-section li {
          padding: 12px;
          margin-bottom: 8px;
          background-color: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
          color: #374151;
          line-height: 1.6;
        }

        .dark .list-section li {
          background-color: #374151;
          border-left-color: #60a5fa;
          color: #f3f4f6;
        }
      `}</style>

      <div className="profile-container">
        {/* Team Sidebar */}
        {showTeamSidebar && employees.length > 1 && (
          <div className="team-sidebar">
            <h3>
              <User size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Team Members
            </h3>
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search team..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="team-members-scroll">
              {filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  className={`team-member-card ${activeEmployee.id === employee.id ? 'active' : ''}`}
                  onClick={() => setActiveEmployee(employee)}
                >
                  <img
                    src={employee.photo}
                    alt={employee.name}
                    className="team-member-photo"
                  />
                  <div className="team-member-info">
                    <h4>{employee.name}</h4>
                    <p>{employee.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Profile Section */}
        <div style={{ flex: 1 }}>
          <div className="profile-section">
            {/* Left Column - Photo & About */}
            <div className="profile-left-column">
              <div className="profile-card">
                <div className="profile-photo-container">
                  <img
                    src={selectedPhoto || activeEmployee.photo}
                    alt={activeEmployee.name}
                    className="profile-photo"
                  />
                  <input
                    type="file"
                    id="photo-upload-input"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => document.getElementById('photo-upload-input')?.click()}
                    disabled={uploading}
                    className="upload-button"
                  >
                    <Upload size={16} />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2
                    style={{
                      color: '#1f2937',
                      fontSize: '24px',
                      margin: '0 0 5px 0',
                    }}
                    className="dark:text-gray-100"
                  >
                    {activeEmployee.name}
                  </h2>
                  <p
                    style={{
                      color: '#3b82f6',
                      fontSize: '16px',
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {activeEmployee.role}
                  </p>
                </div>
              </div>

              <div className="profile-card about-me-text">
                <h3>ABOUT ME</h3>
                <p>{activeEmployee.about}</p>
              </div>
            </div>

            {/* Right Column - Details */}
            <div style={{ flex: 1 }}>
              {activeEmployee.details && activeEmployee.details.length > 0 && (
                <div className="info-section">
                  <h3>Personal Information</h3>
                  <div className="info-grid">
                    {activeEmployee.details.map((detail, index) => (
                      <div key={index} className="info-item">
                        <span className="info-label">{detail.label}</span>
                        <span className="info-value">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Accounts Section */}
              <div className="info-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                    <Landmark size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    Bank Accounts
                  </h3>
                  <button
                    onClick={handleAddBankAccount}
                    className="upload-button"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <Plus size={14} />
                    Add Account
                  </button>
                </div>

                {bankAccounts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', color: '#6b7280' }} className="dark:text-gray-400">
                    <Landmark size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No bank accounts added yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bankAccounts.map(account => {
                      const isNumberVisible = showAccountNumbers.has(account.id);
                      return (
                        <div
                          key={account.id}
                          style={{
                            padding: '15px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                          }}
                          className="dark:bg-gray-700 dark:border-gray-600"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px' }}>{getAccountTypeIcon(account.account_type)}</span>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#374151' }} className="dark:text-gray-100">
                                  {account.bank_name}
                                </h4>
                                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }} className="dark:text-gray-400">
                                  {account.account_type} Account
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {account.is_primary && (
                                <span style={{ 
                                  padding: '4px 8px', 
                                  backgroundColor: '#fef3c7', 
                                  color: '#92400e', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }} className="dark:bg-yellow-900/30 dark:text-yellow-300">
                                  <Star size={12} className="fill-current" />
                                  Primary
                                </span>
                              )}
                              {account.is_verified ? (
                                <span style={{ 
                                  padding: '4px 8px', 
                                  backgroundColor: '#d1fae5', 
                                  color: '#065f46', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }} className="dark:bg-green-900/30 dark:text-green-300">
                                  <CheckCircle size={12} />
                                  Verified
                                </span>
                              ) : (
                                <span style={{ 
                                  padding: '4px 8px', 
                                  backgroundColor: '#fef3c7', 
                                  color: '#92400e', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }} className="dark:bg-yellow-900/30 dark:text-yellow-300">
                                  <Clock size={12} />
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="dark:text-gray-400">
                                Account Holder
                              </span>
                              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#374151', fontWeight: 500 }} className="dark:text-gray-200">
                                {account.account_holder_name}
                              </p>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="dark:text-gray-400">
                                Account Number
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#374151', fontWeight: 500, fontFamily: 'monospace' }} className="dark:text-gray-200">
                                  {isNumberVisible ? account.account_number : maskAccountNumber(account.account_number)}
                                </p>
                                <button
                                  onClick={() => toggleShowAccountNumber(account.id)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: '#6b7280',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  className="dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                                >
                                  {isNumberVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: account.ifsc_code ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '10px' }}>
                            {account.branch_name && (
                              <div>
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="dark:text-gray-400">
                                  Branch
                                </span>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#374151' }} className="dark:text-gray-200">
                                  {account.branch_name}
                                </p>
                              </div>
                            )}
                            {account.ifsc_code && (
                              <div>
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="dark:text-gray-400">
                                  IFSC Code
                                </span>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }} className="dark:text-gray-200">
                                  {account.ifsc_code}
                                </p>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }} className="dark:border-gray-600">
                            <span style={{ fontSize: '11px', color: '#6b7280' }} className="dark:text-gray-400">
                              Currency: {account.currency}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleEditBankAccount(account)}
                                style={{ 
                                  padding: '6px', 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  color: '#3b82f6',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Edit account"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteBankAccount(account.id)}
                                style={{ 
                                  padding: '6px', 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  color: '#ef4444',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete account"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeEmployee.education && (
                <div className="info-section list-section">
                  <h3>{activeEmployee.education.title}</h3>
                  <ul>
                    {activeEmployee.education.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeEmployee.awards && (
                <div className="info-section list-section">
                  <h3>{activeEmployee.awards.title}</h3>
                  <ul>
                    {activeEmployee.awards.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeEmployee.experience && (
                <div className="info-section list-section">
                  <h3>{activeEmployee.experience.title}</h3>
                  <ul>
                    {activeEmployee.experience.items.map((item, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }} className="dark:bg-gray-800">
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              padding: '20px',
              zIndex: 10
            }} className="dark:bg-gray-800 dark:border-gray-700">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }} className="dark:text-gray-100">
                  {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
                </h2>
                <button
                  onClick={() => setShowBankModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                  className="hover:text-gray-900 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBankAccount} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }} className="dark:text-gray-300">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={bankFormData.account_holder_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, account_holder_name: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  placeholder="Name as per bank account"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }} className="dark:text-gray-300">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankFormData.account_number}
                    onChange={(e) => setBankFormData({ ...bankFormData, account_number: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Account number"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }} className="dark:text-gray-300">
                    Account Type *
                  </label>
                  <select
                    required
                    value={bankFormData.account_type}
                    onChange={(e) => setBankFormData({ ...bankFormData, account_type: e.target.value as any })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="savings">💰 Savings</option>
                    <option value="current">💼 Current</option>
                    <option value="salary">💵 Salary</option>
                    <option value="business">🏢 Business</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }} className="dark:text-gray-300">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankFormData.bank_name}
                    onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="e.g., State Bank of India"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }} className="dark:text-gray-300">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={bankFormData.branch_name}
                    onChange={(e) => setBankFormData({ ...bankFormData, branch_name: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Branch name"
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }} className="dark:border-gray-700">
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }} className="dark:text-gray-200">
                  Routing Codes (Provide at least one)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }} className="dark:text-gray-400">
                      IFSC Code (India)
                    </label>
                    <input
                      type="text"
                      value={bankFormData.ifsc_code}
                      onChange={(e) => setBankFormData({ ...bankFormData, ifsc_code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      placeholder="SBIN0001234"
                      maxLength={11}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }} className="dark:text-gray-400">
                      SWIFT Code
                    </label>
                    <input
                      type="text"
                      value={bankFormData.swift_code}
                      onChange={(e) => setBankFormData({ ...bankFormData, swift_code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      placeholder="SBININBB123"
                      maxLength={11}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }} className="dark:text-gray-400">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={bankFormData.iban}
                      onChange={(e) => setBankFormData({ ...bankFormData, iban: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      placeholder="GB29NWBK60161331926819"
                      maxLength={34}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }} className="dark:text-gray-400">
                      Currency *
                    </label>
                    <select
                      required
                      value={bankFormData.currency}
                      onChange={(e) => setBankFormData({ ...bankFormData, currency: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    >
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                      <option value="INR">₹ INR</option>
                      <option value="AUD">A$ AUD</option>
                      <option value="CAD">C$ CAD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={bankFormData.is_primary}
                  onChange={(e) => setBankFormData({ ...bankFormData, is_primary: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="is_primary" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }} className="dark:text-gray-300">
                  Set as primary account for salary
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: '#3b82f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  className="hover:bg-blue-700"
                >
                  <Check size={16} />
                  {editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutMePage;
