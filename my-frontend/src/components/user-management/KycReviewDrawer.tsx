'use client';

import React, { useState } from 'react';
import { 
  X, User, Mail, Phone, MapPin, FileText, Download, 
  Check, AlertTriangle, MessageCircle, Calendar, 
  Shield, Eye, Building, GraduationCap, Users, 
  ChevronDown, ChevronRight, ExternalLink 
} from 'lucide-react';
import type { 
  KycSubmission, 
  User as UserType, 
  FileObject,
  ApprovalLog 
} from '@/types/user-management';

interface KycReviewDrawerProps {
  submission: KycSubmission & {
    user: UserType;
    files: FileObject[];
    approval_logs: ApprovalLog[];
  };
  isOpen: boolean;
  onClose: () => void;
  onApprove: (submissionId: string, notes?: string) => Promise<void>;
  onReject: (submissionId: string, reason: string) => Promise<void>;
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  type: 'approve' | 'reject';
  isSubmitting: boolean;
}

function ApprovalModal({ isOpen, onClose, onConfirm, type, isSubmitting }: ApprovalModalProps) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirm(notes);
    setNotes('');
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#0c111b] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
            {type === 'approve' ? 'Approve KYC' : 'Reject KYC'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {type === 'approve'
            ? 'Are you sure you want to approve this KYC submission? The user will be notified and their account will be activated.'
            : 'Please provide a reason for rejecting this KYC submission. The user will be notified with your feedback.'
          }
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {type === 'approve' ? 'Notes (optional)' : 'Rejection Reason *'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#071018] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={type === 'approve'
              ? 'Add any additional notes for this approval...'
              : 'Please specify what needs to be corrected or resubmitted...'
            }
            required={type === 'reject'}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-[#071018] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (type === 'reject' && !notes.trim())}
            className={`flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              type === 'approve' ? 'Approve' : 'Reject'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function KycReviewDrawer({ 
  submission, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: KycReviewDrawerProps) {
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [showApprovalModal, setShowApprovalModal] = useState<'approve' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['personal', 'address', 'documents'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleApproval = async (notes?: string) => {
    setIsSubmitting(true);
    try {
      await onApprove(submission.id, notes);
      setShowApprovalModal(null);
      onClose();
    } catch (error) {
      console.error('Failed to approve KYC:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejection = async (reason: string) => {
    setIsSubmitting(true);
    try {
      await onReject(submission.id, reason);
      setShowApprovalModal(null);
      onClose();
    } catch (error) {
      console.error('Failed to reject KYC:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadFile = async (file: FileObject) => {
    try {
      const response = await fetch(`/api/files/${file.file_key}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'under_review': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
  <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-panel dark:bg-[#0f1720] shadow-xl z-50 overflow-y-auto border-l border-theme dark:border-gray-700">
        {/* Header */}
  <div className="sticky top-0 bg-panel dark:bg-[#0f1720] border-b border-theme dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-theme dark:text-gray-200">KYC Review</h2>
              <p className="text-sm text-muted dark:text-gray-300">
                Submitted by {submission.user.first_name} {submission.user.last_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-theme transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submission.status)}`}>
                  {submission.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-muted">
                  Submitted {formatDate(submission.created_at)}
                </span>
              </div>

            {submission.status === 'awaiting_approval' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApprovalModal('reject')}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => setShowApprovalModal('approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="bg-panel border border-theme rounded-lg">
            <button
              onClick={() => toggleSection('personal')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900 dark:text-gray-200">Personal Information</h3>
              </div>
              {expandedSections.has('personal') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('personal') && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    <p className="text-gray-900 dark:text-gray-200">{submission.first_name} {submission.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <p className="text-gray-900 dark:text-gray-200">{submission.personal_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <p className="text-gray-900 dark:text-gray-200">{submission.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alternate Phone</label>
                    <p className="text-gray-900 dark:text-gray-200">{submission.alternate_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="text-gray-900">
                      {submission.date_of_birth 
                        ? new Date(submission.date_of_birth).toLocaleDateString()
                        : 'Not provided'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Blood Group</label>
                    <p className="text-gray-900">{submission.blood_group || 'Not provided'}</p>
                  </div>
                </div>
                {submission.about_me && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700">About</label>
                    <p className="text-gray-900 mt-1">{submission.about_me}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Address Information */}
          <div className="bg-white dark:bg-[#0c111b] border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('address')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Address Information</h3>
              </div>
              {expandedSections.has('address') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('address') && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Communication Address</label>
                    <p className="text-gray-900">{submission.communication_address}</p>
                  </div>
                  {submission.permanent_address && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Permanent Address</label>
                      <p className="text-gray-900">{submission.permanent_address}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <p className="text-gray-900">{submission.city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <p className="text-gray-900">{submission.state}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Country</label>
                      <p className="text-gray-900">{submission.country}</p>
                    </div>
                  </div>
                  {submission.postal_code && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Postal Code</label>
                      <p className="text-gray-900">{submission.postal_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Identity Documents */}
          <div className="bg-white dark:bg-[#0c111b] border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('identity')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Identity Documents</h3>
              </div>
              {expandedSections.has('identity') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('identity') && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Aadhaar Number</label>
                    <p className="text-gray-900">
                      {submission.aadhaar_number 
                        ? `****-****-${submission.aadhaar_number.slice(-4)}`
                        : 'Not provided'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">License Number</label>
                    <p className="text-gray-900">{submission.license_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-white dark:bg-[#0c111b] border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('education')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Education & Employment</h3>
              </div>
              {expandedSections.has('education') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('education') && (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-6">
                {/* Qualifications */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Education</h4>
                  <div className="space-y-3">
                    {submission.qualifications.map((qual, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Degree</label>
                            <p className="text-sm text-gray-900">{qual.degree}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Institution</label>
                            <p className="text-sm text-gray-900">{qual.institution}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Year</label>
                            <p className="text-sm text-gray-900">{qual.year}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employment History */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Employment History</h4>
                  <div className="space-y-3">
                    {submission.employment_history.map((emp, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Company</label>
                            <p className="text-sm text-gray-900">{emp.company}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Designation</label>
                            <p className="text-sm text-gray-900">{emp.designation}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">From</label>
                            <p className="text-sm text-gray-900">
                              {emp.from_date ? new Date(emp.from_date).toLocaleDateString() : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">To</label>
                            <p className="text-sm text-gray-900">
                              {emp.to_date ? new Date(emp.to_date).toLocaleDateString() : 'Current'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Family Details */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('family')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Family Details</h3>
              </div>
              {expandedSections.has('family') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('family') && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-3 mt-4">
                  {submission.family_details.map((family, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-700">Name</label>
                          <p className="text-sm text-gray-900">{family.name}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700">Relationship</label>
                          <p className="text-sm text-gray-900">{family.relationship}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700">Contact</label>
                          <p className="text-sm text-gray-900">{family.contact || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('documents')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Uploaded Documents</h3>
              </div>
              {expandedSections.has('documents') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('documents') && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-3 mt-4">
                  {submission.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.original_name}</p>
                          <p className="text-xs text-gray-500">
                            {file.file_type} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/api/files/${file.file_key}/view`, '_blank')}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title="View file"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {submission.files.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No documents uploaded</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Approval History */}
            {submission.approval_logs.length > 0 && (
            <div className="bg-white dark:bg-[#0c111b] border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => toggleSection('history')}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Approval History</h3>
                </div>
                {expandedSections.has('history') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSections.has('history') && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-3 mt-4">
                    {submission.approval_logs.map((log) => (
                      <div key={log.id} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.action)}`}>
                              {log.action.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-600">
                              by {log.reviewer?.first_name} {log.reviewer?.last_name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-gray-700 mt-2">{log.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={!!showApprovalModal}
        onClose={() => setShowApprovalModal(null)}
        onConfirm={showApprovalModal === 'approve' 
          ? handleApproval 
          : (notes?: string) => handleRejection(notes || 'No reason provided')
        }
        type={showApprovalModal || 'approve'}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

export default KycReviewDrawer;
