import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Home,
  User,
  CheckCircle,
  ShoppingCart,
  DollarSign,
  BarChart3,
  MessageCircle,
  Settings,
  ClipboardList,
  PlusCircle,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE } from '@/config/api';

type Approval = {
  id: string | number;
  requester?: string;
  type?: string;
  amount?: number;
  deadline?: string;
  status?: string;
};

type Purchase = {
  id: string | number;
  vendor?: string;
  amount?: number;
  date?: string;
  status?: string;
};

type Expense = {
  id: string | number;
  amount?: number;
  category?: string;
  remarks?: string;
  status?: string;
  date?: string;
};

type Performance = {
  claims: { approved: number; pending: number; rejected?: number };
  trends: Array<{ month: string; value: number | string }>;
  sla: { avgResponseTime?: string; onTimePercentage?: number };
};

type MessageItem = {
  id: string | number;
  text?: string;
  date?: string;
  read?: boolean;
};

type Task = {
  id: string | number;
  title?: string;
  details?: string;
  deadline?: string;
  assignee?: string;
  status?: string;
};

type Profile = {
  name?: string;
  role?: string;
  location?: string;
  client?: string;
  contact?: string;
  recognition?: string[];
};

export type HubInchargeData = {
  profile?: Profile;
  approvals: Approval[];
  purchases: Purchase[];
  expenses: Expense[];
  performance: Performance;
  messages: MessageItem[];
  tasks: Task[];
} | null;

// --- API Hook for Hub Incharge Data ---
function useHubInchargeData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HubInchargeData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel using the correct backend URL
      const baseURL = API_BASE;
      const [
        profileRes,
        approvalsRes,
        purchasesRes,
        expensesRes,
        performanceRes,
        messagesRes,
        tasksRes,
      ] = await Promise.all([
        fetch(`${baseURL}/api/hub-incharge/profile`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/hub-incharge/approvals`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/hub-incharge/purchases`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/hub-incharge/expenses`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/hub-incharge/performance`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/hub-incharge/messages`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/hub-incharge/tasks`, { credentials: 'include' }),
      ]);

      // Check for errors
      if (!profileRes.ok) {
        if (profileRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch profile');
      }
      if (!approvalsRes.ok) {
        if (approvalsRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch approvals');
      }
      if (!purchasesRes.ok) {
        if (purchasesRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch purchases');
      }
      if (!expensesRes.ok) {
        if (expensesRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch expenses');
      }
      if (!performanceRes.ok) {
        if (performanceRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch performance');
      }
      if (!messagesRes.ok) {
        if (messagesRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch messages');
      }
      if (!tasksRes.ok) {
        if (tasksRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch tasks');
      }

      // Parse responses
      const [
        profile,
        approvals,
        purchases,
        expenses,
        performance,
        messages,
        tasks,
      ] = await Promise.all([
        profileRes.json(),
        approvalsRes.json(),
        purchasesRes.json(),
        expensesRes.json(),
        performanceRes.json(),
        messagesRes.json(),
        tasksRes.json(),
      ]);

      setData({
        profile,
        approvals,
        purchases,
        expenses,
        performance,
        messages,
        tasks,
      });
    } catch (err) {
      // Data fetch error - handle gracefully

      // Check if this is an authentication error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes('Failed to fetch profile') ||
        errorMessage.includes('401')
      ) {
        setError('Authentication required. Please login again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  React.useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// --- Page Components ---
const DashboardPage = ({ data }: { data: HubInchargeData | null }) => {
  if (!data) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Profile Summary</h3>
          <p className="text-sm text-gray-600">
            {data?.profile?.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            {data?.profile?.role || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            {data?.profile?.location || 'N/A'}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">
            Pending Approvals
          </h3>
          <p className="text-2xl font-bold text-orange-600">
            {data?.approvals?.filter((a: Approval) => a.status === 'pending')
              .length || 0}
          </p>
          <p className="text-sm text-gray-600">Items awaiting approval</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Expense Claims %</h3>
          <div className="flex gap-2 text-sm">
            <span className="text-green-600">
              Approved: {data?.performance?.claims?.approved || 0}%
            </span>
            <span className="text-orange-600">
              Pending: {data?.performance?.claims?.pending || 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
const AboutMePage = ({
  data,
  refetch,
}: {
  data: HubInchargeData | null;
  refetch?: () => void;
}) => {
  // Enhanced employee data structure for the new layout (use optional chaining to avoid depending on data presence)
  const employees = React.useMemo(
    () => [
      {
        id: 1,
        name: data?.profile?.name || 'Staff Member',
        role: data?.profile?.role || 'Hub Incharge',
        photo:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=200&q=80',
        about: `Experienced ${data?.profile?.role || 'Hub Incharge'} at ${data?.profile?.client || 'BISMAN ERP'} in ${data?.profile?.location || 'Mumbai Hub'}. Dedicated professional with excellent performance in operations management and team coordination.`,
        details: [
          { label: 'Employee ID', value: 'EMP-00123' },
          {
            label: 'Designation',
            value: data?.profile?.role || 'Hub Incharge',
          },
          { label: 'Joining Date', value: '2020-03-15' },
          { label: 'Date of Birth (DOB)', value: '1990-07-20' },
          {
            label: 'Official Email',
            value: data?.profile?.contact || 'staff@business.com',
          },
          { label: 'Official Phone', value: '+91 9876543210' },
          { label: 'Blood Group', value: 'O+' },
          { label: 'Home Phone Number', value: '+91 9876543211' },
          {
            label: 'Current Address',
            value: '123 Corporate Lane, Business District',
          },
          { label: 'State / Pincode', value: 'Maharashtra 400001' },
          {
            label: 'House Location (Geocode)',
            value: 'Lat: 19.0760, Lon: 72.8777',
          },
        ],
        education: {
          title: 'Education Qualification',
          items: [
            'Master of Business Administration - Mumbai University (2018)',
            'Bachelor of Commerce - Mumbai University (2016)',
          ],
        },
        awards: {
          title: 'Achievements and Awards',
          items:
            Array.isArray(data?.profile?.recognition) &&
            data.profile.recognition.length > 0
              ? data.profile.recognition.map(
                  (award: string) => `Achievement: ${award}`
                )
              : [
                  'Employee of the Month - July 2023',
                  'Safety Champion Award - 2022',
                  'Excellence in Operations - 2021',
                ],
        },
        experience: {
          title: 'Experience History: Designations & Expertise',
          items: [
            `<strong>${data?.profile?.role || 'Hub Incharge'}</strong> - ${data?.profile?.client || 'BISMAN ERP'} (March 2020 - Present): Leading operations at ${data?.profile?.location || 'Mumbai Hub'} with focus on efficiency and safety standards.`,
            '<strong>Assistant Manager</strong> - Previous Company (June 2018 - February 2020): Managed daily operations and coordinated with multiple teams.',
            '<strong>Executive</strong> - Entry Level Company (August 2016 - May 2018): Started career in operations management with focus on process improvement.',
          ],
        },
      },
      // Sample team members
      {
        id: 2,
        name: 'Rajesh Kumar',
        role: 'Assistant Manager',
        photo:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80',
        about:
          'Dedicated Assistant Manager with 5 years of experience in fuel operations and team management.',
        details: [
          { label: 'Employee ID', value: 'EMP-00124' },
          { label: 'Designation', value: 'Assistant Manager' },
          { label: 'Joining Date', value: '2021-06-10' },
          { label: 'Official Email', value: 'rajesh.kumar@business.com' },
          { label: 'Official Phone', value: '+91 9876543211' },
        ],
      },
      {
        id: 3,
        name: 'Priya Sharma',
        role: 'Supervisor',
        photo:
          'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80',
        about:
          'Experienced supervisor ensuring quality operations and customer satisfaction.',
        details: [
          { label: 'Employee ID', value: 'EMP-00125' },
          { label: 'Designation', value: 'Supervisor' },
          { label: 'Joining Date', value: '2022-01-15' },
          { label: 'Official Email', value: 'priya.sharma@business.com' },
          { label: 'Official Phone', value: '+91 9876543212' },
        ],
      },
      {
        id: 4,
        name: 'Amit Patel',
        role: 'Cashier',
        photo:
          'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80',
        about:
          'Detail-oriented cashier with excellent customer service skills and accuracy in transactions.',
        details: [
          { label: 'Employee ID', value: 'EMP-00126' },
          { label: 'Designation', value: 'Cashier' },
          { label: 'Joining Date', value: '2022-08-20' },
          { label: 'Official Email', value: 'amit.patel@business.com' },
          { label: 'Official Phone', value: '+91 9876543213' },
        ],
      },
      {
        id: 5,
        name: 'Sunita Reddy',
        role: 'Safety Officer',
        photo:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80',
        about:
          'Certified safety officer ensuring compliance with all safety regulations and protocols.',
        details: [
          { label: 'Employee ID', value: 'EMP-00127' },
          { label: 'Designation', value: 'Safety Officer' },
          { label: 'Joining Date', value: '2021-11-05' },
          { label: 'Official Email', value: 'sunita.reddy@business.com' },
          { label: 'Official Phone', value: '+91 9876543214' },
        ],
      },
    ],
    [data]
  );

  const [activeEmployee, setActiveEmployee] = React.useState(
    () => employees[0]
  );
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredEmployees, setFilteredEmployees] = React.useState(employees);
  const [uploading, setUploading] = React.useState(false);

  // Filter employees based on search term
  React.useEffect(() => {
    const filtered = employees.filter(
      employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  // Load user's existing profile picture
  React.useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const baseURL = API_BASE;
        const response = await fetch(`${baseURL}/api/upload/profile-pic`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.profile_pic_url) {
            // ✅ SECURITY FIX: Convert /uploads/ URL to /api/secure-files/
            const secureUrl = result.profile_pic_url.replace('/uploads/', '/api/secure-files/');
            setSelectedPhoto(`${baseURL}${secureUrl}`);
          }
        }
      } catch {
        // Could not load profile picture - continue without it
      }
    };

    loadProfilePicture();
  }, []);

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profile_pic', file);

      const baseURL = API_BASE;
      const response = await fetch(`${baseURL}/api/upload/profile-pic`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ✅ SECURITY FIX: Convert /uploads/ URL to /api/secure-files/
        const secureUrl = result.url.replace('/uploads/', '/api/secure-files/');
        const fullImageUrl = `${baseURL}${secureUrl}`;
        setSelectedPhoto(fullImageUrl);

        alert('Profile picture updated successfully!');

        // Optionally refresh the profile data
        if (typeof refetch === 'function') {
          refetch();
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // Upload error - show user friendly message
      alert(`Upload failed: ${errMsg}`);
    } finally {
      setUploading(false);
      // Clear the file input
      const input = document.getElementById(
        'photo-upload-input'
      ) as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  if (!data?.profile) return <div className="p-6">Loading profile...</div>;

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        margin: 0,
        backgroundColor: '#f4f7f6',
        color: '#6B7280',
        lineHeight: 1.6,
        minHeight: '100vh',
      }}
    >
      <style jsx>{`
        .profile-container {
          max-width: 1400px;
          margin: 30px auto;
          padding: 0 20px;
          display: flex;
          gap: 30px;
        }

        .team-sidebar {
          flex: 0 0 280px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 20px;
          height: fit-content;
          position: sticky;
          top: 20px;
        }

        .team-sidebar h3 {
          color: #3b82f6;
          font-size: 18px;
          margin-bottom: 15px;
          text-align: center;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .search-box {
          width: 100%;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-box:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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

        .team-member-card.active {
          background-color: #ebf4ff;
          border-color: #3b82f6;
        }

        .team-member-photo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 12px;
          border: 2px solid #e5e7eb;
        }

        .team-member-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 2px 0;
        }

        .team-member-info p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        .profile-section {
          flex: 1;
          display: flex;
          gap: 20px;
          margin-bottom: 40px;
        }

        .profile-left-column {
          flex: 0 0 320px;
        }

        .profile-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 30px;
          margin-bottom: 20px;
        }

        .photo-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .photo-block img {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 15px auto;
          border: 4px solid #3b82f6;
          display: block;
        }

        .photo-block h2 {
          font-size: 22px;
          margin-bottom: 5px;
          color: #374151;
          text-align: center;
        }

        .photo-block p {
          color: #3b82f6;
          font-weight: 500;
          margin-bottom: 20px;
          text-align: center;
        }

        .upload-option {
          padding: 10px;
          border: 1px solid #e5e7eb;
          background-color: #f9fafb;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
          text-align: center;
          width: 100%;
          margin: 0 auto;
        }

        .upload-option:hover {
          background-color: #eeeeee;
          outline: 2px solid #f59e0b;
        }

        .about-me-text {
          text-align: left;
        }

        .about-me-text h3 {
          color: #f59e0b;
          font-size: 20px;
          margin-top: 0;
          text-align: left;
        }

        .profile-right-column {
          flex: 1;
        }

        .details-wrapper {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 30px;
        }

        .details-wrapper h1 {
          font-size: 28px;
          color: #3b82f6;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }

        .profile-detail-group {
          display: flex;
          flex-wrap: wrap;
          gap: 20px 40px;
        }

        .detail-item {
          flex: 1 1 40%;
          min-width: 250px;
          padding: 5px 0;
          border-bottom: 1px dotted #e5e7eb;
        }

        .detail-item strong {
          display: block;
          margin-bottom: 2px;
          color: #374151;
          font-size: 14px;
          font-weight: 700;
        }

        .detail-item span {
          color: #6b7280;
          font-size: 16px;
        }

        .experience-container {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .experience-container h3 {
          color: #f59e0b;
          margin-top: 0;
          font-size: 20px;
        }

        .experience-item {
          background-color: #fffbeb;
          border-left: 5px solid #f59e0b;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 4px;
        }

        .experience-item strong {
          color: #374151;
          font-size: 16px;
          display: block;
          margin-bottom: 5px;
        }

        .experience-item ul {
          list-style-type: disc;
          padding-left: 20px;
          margin: 5px 0 0 0;
          color: #6b7280;
        }

        @media (max-width: 1024px) {
          .profile-container {
            flex-direction: column;
            gap: 20px;
          }

          .team-sidebar {
            flex: 1 1 100%;
            position: static;
          }

          .team-members-scroll {
            max-height: 200px;
          }
        }

        @media (max-width: 768px) {
          .profile-container {
            padding: 0 15px;
          }

          .profile-section {
            flex-direction: column;
          }

          .profile-left-column,
          .profile-right-column {
            flex: 1 1 100%;
          }

          .profile-card,
          .details-wrapper {
            padding: 20px;
          }

          .profile-detail-group {
            gap: 20px;
          }

          .detail-item {
            flex: 1 1 100%;
            min-width: auto;
          }
        }
      `}</style>

      <div className="profile-container">
        {/* Team Members Sidebar */}
        <aside className="team-sidebar">
          <h3>Team Members</h3>
          <input
            type="text"
            placeholder="Search employees..."
            className="search-box"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="team-members-scroll">
            {filteredEmployees.map(employee => (
              <div
                key={employee.id}
                className={`team-member-card ${activeEmployee.id === employee.id ? 'active' : ''}`}
                onClick={() => setActiveEmployee(employee)}
              >
                <Image
                  src={employee.photo}
                  alt={employee.name}
                  width={40}
                  height={40}
                  className="team-member-photo"
                  unoptimized
                />
                <div className="team-member-info">
                  <h4>{employee.name}</h4>
                  <p>{employee.role}</p>
                </div>
              </div>
            ))}
          </div>
          {filteredEmployees.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                color: '#6B7280',
                fontSize: '14px',
                marginTop: '20px',
              }}
            >
              No employees found
            </p>
          )}
        </aside>

        <main>
          <section className="profile-section">
            <div className="profile-left-column">
              <div className="profile-card photo-block">
                <Image
                  src={selectedPhoto || activeEmployee.photo}
                  alt={`Portrait of ${activeEmployee.name}`}
                  id="employee-photo"
                  width={180}
                  height={180}
                  unoptimized
                  style={{
                    margin: '0 auto 15px auto',
                    display: 'block',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #3B82F6',
                  }}
                />
                <div
                  className="upload-option"
                  onClick={() => {
                    if (uploading) return;
                    (
                      document.getElementById(
                        'photo-upload-input'
                      ) as HTMLInputElement | null
                    )?.click();
                  }}
                  style={{
                    textAlign: 'center',
                    width: '100%',
                    opacity: uploading ? 0.6 : 1,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>
                    {uploading
                      ? 'Uploading...'
                      : 'Click to Upload/Change Photo'}
                  </span>
                  <input
                    type="file"
                    id="photo-upload-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </div>
                <h2 style={{ textAlign: 'center' }}>{activeEmployee.name}</h2>
                <p style={{ textAlign: 'center' }}>{activeEmployee.role}</p>
              </div>

              <div className="profile-card about-me-text">
                <h3>ABOUT ME</h3>
                <p>{activeEmployee.about}</p>
              </div>
            </div>

            <div className="profile-right-column">
              <div className="details-wrapper">
                <h1>Official Profile & Details</h1>

                <div className="profile-detail-group">
                  {activeEmployee.details.map((detail, index) => (
                    <div key={index} className="detail-item">
                      <strong>{detail.label}:</strong>
                      <span>{detail.value}</span>
                    </div>
                  ))}
                </div>

                <div className="experience-container">
                  <h3>EDUCATION & PROFESSIONAL HISTORY</h3>

                  <div className="experience-item">
                    <strong>
                      {activeEmployee.education?.title ??
                        'Education Qualification'}
                    </strong>
                    <ul>
                      {(activeEmployee.education?.items || []).map(
                        (item, index) => (
                          <li key={index}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="experience-item">
                    <strong>
                      {activeEmployee.awards?.title ??
                        'Achievements and Awards'}
                    </strong>
                    <ul>
                      {(activeEmployee.awards?.items || []).map(
                        (item, index) => (
                          <li key={index}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="experience-item">
                    <strong>
                      {activeEmployee.experience?.title ?? 'Experience'}
                    </strong>
                    <ul>
                      {(activeEmployee.experience?.items || []).map(
                        (item, index) => (
                          <li key={index}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const ApprovalsPage = ({
  data,
  refetch,
}: {
  data: HubInchargeData | null;
  refetch: () => Promise<void>;
}) => {
  const [processing, setProcessing] = useState<string | number | null>(null);

  const handleApproval = async (id: string | number, status: string) => {
    setProcessing(id);
    try {
      const baseURL = API_BASE;
      const response = await fetch(
        `${baseURL}/api/hub-incharge/approvals/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        await refetch(); // Refresh data
      } else {
        throw new Error('Failed to update approval');
      }
    } catch {
      alert('Failed to update approval');
    } finally {
      setProcessing(null);
    }
  };

  if (!data?.approvals) return <div className="p-6">Loading approvals...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Approvals</h2>
      <div className="space-y-3">
        {data.approvals.map(approval => (
          <div key={approval.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <p className="font-semibold">{approval.requester}</p>
                <p className="text-sm text-gray-600">
                  {approval.type} - ₹{(approval.amount ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Deadline: {approval.deadline}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproval(approval.id, 'approved')}
                  disabled={processing === approval.id}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {processing === approval.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleApproval(approval.id, 'rejected')}
                  disabled={processing === approval.id}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {processing === approval.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PurchasePage = ({ data }: { data: HubInchargeData | null }) => {
  if (!data?.purchases) return <div className="p-6">Loading purchases...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Purchase</h2>
      <div className="space-y-3">
        {data.purchases.map(purchase => (
          <div key={purchase.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <p className="font-semibold">
                  {purchase.vendor ?? 'Unknown vendor'}
                </p>
                <p className="text-sm text-gray-600">
                  ₹{(purchase.amount ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{purchase.date ?? '-'}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  (purchase.status ?? 'pending') === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {purchase.status ?? 'pending'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExpensesPage = ({
  data,
  refetch,
}: {
  data: HubInchargeData | null;
  refetch: () => Promise<void>;
}) => {
  const [newExpense, setNewExpense] = useState<{
    amount: string;
    category: string;
    remarks: string;
  }>({ amount: '', category: '', remarks: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category) return;

    setSubmitting(true);
    try {
      const baseURL = API_BASE;
      const response = await fetch(`${baseURL}/api/hub-incharge/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          remarks: newExpense.remarks,
        }),
      });

      if (response.ok) {
        setNewExpense({ amount: '', category: '', remarks: '' });
        await refetch(); // Refresh data
        alert('Expense submitted successfully!');
      } else {
        throw new Error('Failed to submit expense');
      }
    } catch {
      alert('Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (!data?.expenses) return <div className="p-6">Loading expenses...</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-xl font-bold mb-4">Expense Claims</h2>

      {/* Expense Form */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h3 className="font-semibold mb-4">Submit New Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            placeholder="Amount"
            className="w-full border rounded p-2"
            value={newExpense.amount}
            onChange={e =>
              setNewExpense({ ...newExpense, amount: e.target.value })
            }
            required
          />
          <select
            className="w-full border rounded p-2"
            value={newExpense.category}
            onChange={e =>
              setNewExpense({ ...newExpense, category: e.target.value })
            }
            required
          >
            <option value="">Select Category</option>
            <option value="Travel">Travel</option>
            <option value="Meals">Meals</option>
            <option value="Accommodation">Accommodation</option>
            <option value="Office Supplies">Office Supplies</option>
          </select>
          <textarea
            placeholder="Remarks"
            className="w-full border rounded p-2"
            rows={3}
            value={newExpense.remarks}
            onChange={e =>
              setNewExpense({ ...newExpense, remarks: e.target.value })
            }
          ></textarea>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        </form>
      </div>

      {/* Expense History */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h3 className="font-semibold mb-4">Expense History</h3>
        <div className="space-y-2">
          {data.expenses.map(expense => (
            <div
              key={expense.id}
              className="flex justify-between items-center border-b pb-2"
            >
              <div>
                <p className="font-medium">
                  ₹{(expense.amount ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">{expense.category}</p>
              </div>
              <div className="text-right">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    expense.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {expense.status}
                </span>
                <p className="text-xs text-gray-500">{expense.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PerformancePage = ({ data }: { data: HubInchargeData | null }) => {
  if (!data?.performance)
    return <div className="p-6">Loading performance...</div>;

  const perf = data.performance;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Performance Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl p-4 h-40 flex flex-col justify-center">
          <h3 className="font-semibold mb-2">Expense Claims</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Approved:</span>
              <span className="text-green-600">{perf.claims.approved}%</span>
            </div>
            <div className="flex justify-between">
              <span>Pending:</span>
              <span className="text-orange-600">{perf.claims.pending}%</span>
            </div>
            <div className="flex justify-between">
              <span>Rejected:</span>
              <span className="text-red-600">{perf.claims.rejected}%</span>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-2xl p-4 h-40 flex flex-col justify-center">
          <h3 className="font-semibold mb-2">Monthly Trends</h3>
          <div className="space-y-1 text-sm">
            {perf.trends.map(trend => (
              <div key={trend.month} className="flex justify-between">
                <span>{trend.month}:</span>
                <span>{trend.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white shadow rounded-2xl p-4 h-40 flex flex-col justify-center">
          <h3 className="font-semibold mb-2">SLA Performance</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Avg Response:</span>
              <span>{perf.sla.avgResponseTime}</span>
            </div>
            <div className="flex justify-between">
              <span>On-time %:</span>
              <span className="text-green-600">
                {perf.sla.onTimePercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessagesPage = ({
  data,
  refetch,
}: {
  data: HubInchargeData | null;
  refetch: () => Promise<void>;
}) => {
  const [processing, setProcessing] = useState<string | number | null>(null);

  const handleAcknowledge = async (id: string | number) => {
    setProcessing(id);
    try {
      const baseURL = API_BASE;
      const response = await fetch(
        `${baseURL}/api/hub-incharge/messages/${id}/ack`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (response.ok) {
        await refetch(); // Refresh data
      } else {
        throw new Error('Failed to acknowledge message');
      }
    } catch {
      alert('Failed to acknowledge message');
    } finally {
      setProcessing(null);
    }
  };

  if (!data?.messages) return <div className="p-6">Loading messages...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Messages</h2>
      <div className="space-y-3">
        {data.messages.map(message => (
          <div key={message.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex-1">
                <p className={`${!message.read ? 'font-semibold' : ''}`}>
                  {message.text}
                </p>
                <p className="text-xs text-gray-500">{message.date}</p>
              </div>
              {!message.read && (
                <button
                  onClick={() => handleAcknowledge(message.id)}
                  disabled={processing === message.id}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {processing === message.id ? 'Processing...' : 'Acknowledge'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const CreateTaskPage = ({ refetch }: { refetch: () => Promise<void> }) => {
  const [task, setTask] = useState<{
    title: string;
    details: string;
    deadline: string;
    assignedTo: string;
  }>({ title: '', details: '', deadline: '', assignedTo: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!task.title || !task.details) return;

    setSubmitting(true);
    try {
      const baseURL = API_BASE;
      const response = await fetch(`${baseURL}/api/hub-incharge/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: task.title,
          details: task.details,
          deadline: task.deadline,
          assignedTo: task.assignedTo,
        }),
      });

      if (response.ok) {
        setTask({ title: '', details: '', deadline: '', assignedTo: '' });
        await refetch(); // Refresh data
        alert('Task created successfully!');
      } else {
        throw new Error('Failed to create task');
      }
    } catch {
      // console.error('Task creation error:', err);
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Create New Task / Request</h2>
      <div className="bg-white shadow rounded-2xl p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Task Title"
            className="w-full border rounded p-2"
            value={task.title}
            onChange={e => setTask({ ...task, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Task Details"
            className="w-full border rounded p-2"
            rows={4}
            value={task.details}
            onChange={e => setTask({ ...task, details: e.target.value })}
            required
          ></textarea>
          <input
            type="date"
            className="w-full border rounded p-2"
            value={task.deadline}
            onChange={e => setTask({ ...task, deadline: e.target.value })}
          />
          <select
            className="w-full border rounded p-2"
            value={task.assignedTo}
            onChange={e => setTask({ ...task, assignedTo: e.target.value })}
          >
            <option value="">Assign to...</option>
            <option value="self">Assign to Me</option>
            <option value="alice">Assign to Alice Smith</option>
            <option value="bob">Assign to Bob Johnson</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
};
const TasksPage = ({
  data,
  refetch,
}: {
  data: HubInchargeData | null;
  refetch: () => Promise<void>;
}) => {
  const [processing, setProcessing] = useState<string | number | null>(null);

  const handleStatusUpdate = async (id: string | number, status: string) => {
    setProcessing(id);
    try {
      const baseURL = API_BASE;
      const response = await fetch(`${baseURL}/api/hub-incharge/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await refetch(); // Refresh data
      } else {
        throw new Error('Failed to update task');
      }
    } catch {
      // console.error('Task update error:', err);
      alert('Failed to update task');
    } finally {
      setProcessing(null);
    }
  };

  if (!data?.tasks) return <div className="p-6">Loading tasks...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">All Tasks & Requests</h2>
      <div className="space-y-3">
        {data.tasks.map(task => (
          <div key={task.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex-1">
                <p className="font-semibold">{task.title}</p>
                <p className="text-sm text-gray-600">
                  Assigned to: {task.assignee}
                </p>
                <p className="text-xs text-gray-500">
                  Deadline: {task.deadline}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    task.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {task.status}
                </span>
                {task.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate(task.id, 'completed')}
                    disabled={processing === task.id}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                  >
                    {processing === task.id ? 'Updating...' : 'Mark Complete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl font-bold mb-4">Settings</h2>
    <div className="bg-white shadow rounded-2xl p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Language</label>
        <select className="w-full border rounded p-2">
          <option>English</option>
          <option>Hindi</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Theme</label>
        <select className="w-full border rounded p-2">
          <option>Light</option>
          <option>Dark</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Notifications</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            Email notifications
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            SMS notifications
          </label>
        </div>
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded">
        Save Settings
      </button>
    </div>
  </div>
);

// --- Main Hub Incharge App ---
export default function HubInchargeApp() {
  type TabName =
    | 'Dashboard'
    | 'About Me'
    | 'Approvals'
    | 'Purchase'
    | 'Expenses'
    | 'Performance'
    | 'Messages'
    | 'Create Task'
    | 'Tasks & Requests'
    | 'Settings';

  // All hooks must be called before any conditional returns
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to 'Dashboard'
  const initialTab = (searchParams?.get('tab') as TabName) || 'Dashboard';
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  // Listen for external tab-change events so embedded instances can be controlled
  React.useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        if (detail && typeof detail === 'string') {
          setActiveTab(detail as TabName);
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('hub-tab-change', handler as EventListener);
    return () => window.removeEventListener('hub-tab-change', handler as EventListener);
  }, []);
  const { user, logout, loading: authLoading } = useAuth();
  const { data, loading, error, refetch } = useHubInchargeData();

  // Update URL when tab changes
  const handleTabChange = useCallback((tabName: TabName) => {
    setActiveTab(tabName);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabName);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Security check - allow STAFF, ADMIN, and MANAGER
  // Only check after authentication has completed
  if (
    !user?.roleName ||
    !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)
  ) {
    router.push('/');
    return <div>Access denied. Redirecting...</div>;
  }


  const pages: Record<TabName, JSX.Element> = {
    Dashboard: <DashboardPage data={data} />,
    'About Me': <AboutMePage data={data} refetch={refetch} />,
    Approvals: <ApprovalsPage data={data} refetch={refetch} />,
    Purchase: <PurchasePage data={data} />,
    Expenses: <ExpensesPage data={data} refetch={refetch} />,
    Performance: <PerformancePage data={data} />,
    Messages: <MessagesPage data={data} refetch={refetch} />,
    'Create Task': <CreateTaskPage refetch={refetch} />,
    'Tasks & Requests': <TasksPage data={data} refetch={refetch} />,
    Settings: <SettingsPage />,
  };

  const navItems: { name: TabName; icon: JSX.Element }[] = [
    { name: 'Dashboard', icon: <Home size={16} /> },
    { name: 'About Me', icon: <User size={16} /> },
    { name: 'Approvals', icon: <CheckCircle size={16} /> },
    { name: 'Purchase', icon: <ShoppingCart size={16} /> },
    { name: 'Expenses', icon: <DollarSign size={16} /> },
    { name: 'Performance', icon: <BarChart3 size={16} /> },
    { name: 'Messages', icon: <MessageCircle size={16} /> },
    { name: 'Create Task', icon: <PlusCircle size={16} /> },
    { name: 'Tasks & Requests', icon: <ClipboardList size={16} /> },
    { name: 'Settings', icon: <Settings size={16} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading Hub Incharge Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication required');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error loading dashboard: {error}</p>
          <div className="mt-4 space-x-2">
            {isAuthError ? (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Go to Login
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if data is still null
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading Hub Incharge Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center bg-white shadow px-4 sm:px-6 py-3">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          Hub Incharge Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <button className="relative p-2 hover:bg-gray-100 rounded">
            <Bell size={20} />
            {data?.messages?.filter(m => !m.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {data?.messages?.filter(m => !m.read).length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              onClick={async () => {
                try { await logout(); } catch {}
              }}
              className="ml-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-sm inline-flex items-center gap-1"
              title="Logout"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Active Page */}
      <main className="flex-1 overflow-y-auto">{pages[activeTab]}</main>

      {/* Bottom Navigation (hidden on small screens to avoid overlap with FloatingBottomNav) */}
      <nav className="bg-white dark:bg-gray-900 shadow-inner border-t border-gray-100 dark:border-gray-800 hidden md:block">
        <div className="flex justify-around py-2 overflow-x-auto">
          {navItems.map(tab => (
            <button
              key={tab.name}
              onClick={() => handleTabChange(tab.name)}
              className={`flex flex-col items-center text-xs px-2 py-1 min-w-max ${
                activeTab === tab.name
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              <span className="mt-1 text-[10px] sm:text-xs">{tab.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
