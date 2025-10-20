'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { User, Upload, Search } from 'lucide-react';

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
    </div>
  );
};

export default AboutMePage;
