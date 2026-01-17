'use client';

import React, { useState } from 'react';
import { Target, Plus, Search, Eye, Edit2, TrendingUp, Users, Calendar, Award, CheckCircle, Clock, AlertTriangle, Star } from 'lucide-react';

interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  reviewPeriod: string;
  reviewer: string;
  selfRating: number;
  managerRating: number;
  overallRating: number;
  status: 'Pending Self Review' | 'Pending Manager Review' | 'Completed' | 'Acknowledged';
  dueDate: string;
  completedDate?: string;
}

export default function PerformanceReviewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const reviews: PerformanceReview[] = [
    { id: 'PR-001', employeeId: 'EMP-001', employeeName: 'Rajesh Kumar', department: 'Production', reviewPeriod: 'Q4 2024', reviewer: 'Production Manager', selfRating: 4.2, managerRating: 4.0, overallRating: 4.1, status: 'Completed', dueDate: '2025-01-15', completedDate: '2025-01-14' },
    { id: 'PR-002', employeeId: 'EMP-002', employeeName: 'Priya Sharma', department: 'Finance', reviewPeriod: 'Q4 2024', reviewer: 'Finance Manager', selfRating: 4.5, managerRating: 0, overallRating: 0, status: 'Pending Manager Review', dueDate: '2025-01-20' },
    { id: 'PR-003', employeeId: 'EMP-003', employeeName: 'Amit Patel', department: 'HR', reviewPeriod: 'Q4 2024', reviewer: 'HR Director', selfRating: 0, managerRating: 0, overallRating: 0, status: 'Pending Self Review', dueDate: '2025-01-18' },
    { id: 'PR-004', employeeId: 'EMP-004', employeeName: 'Sunita Devi', department: 'Production', reviewPeriod: 'Q4 2024', reviewer: 'Production Manager', selfRating: 3.8, managerRating: 4.2, overallRating: 4.0, status: 'Acknowledged', dueDate: '2025-01-15', completedDate: '2025-01-12' },
    { id: 'PR-005', employeeId: 'EMP-005', employeeName: 'Vikram Singh', department: 'Warehouse', reviewPeriod: 'Q4 2024', reviewer: 'Warehouse Supervisor', selfRating: 4.0, managerRating: 3.5, overallRating: 3.75, status: 'Completed', dueDate: '2025-01-15', completedDate: '2025-01-15' },
    { id: 'PR-006', employeeId: 'EMP-006', employeeName: 'Meera Joshi', department: 'Sales', reviewPeriod: 'Q4 2024', reviewer: 'Sales Manager', selfRating: 4.8, managerRating: 4.5, overallRating: 4.65, status: 'Acknowledged', dueDate: '2025-01-15', completedDate: '2025-01-10' },
  ];

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = review.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status.includes('Pending')).length,
    completed: reviews.filter(r => r.status === 'Completed' || r.status === 'Acknowledged').length,
    avgRating: (reviews.filter(r => r.overallRating > 0).reduce((sum, r) => sum + r.overallRating, 0) / reviews.filter(r => r.overallRating > 0).length).toFixed(1)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending Self Review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Pending Manager Review': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Acknowledged: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getRatingStars = (rating: number) => {
    if (rating === 0) return <span className="text-gray-400 text-sm">-</span>;
    return (
      <div className="flex items-center gap-1">
        <span className="font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={`w-3 h-3 ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
          ))}
        </div>
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating === 0) return 'text-gray-400';
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-amber-600" />Performance Reviews
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage employee performance reviews and ratings</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
          <Plus className="w-4 h-4" />New Review Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-amber-600">{stats.avgRating}</p>
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Pending Self Review">Pending Self Review</option>
            <option value="Pending Manager Review">Pending Manager Review</option>
            <option value="Completed">Completed</option>
            <option value="Acknowledged">Acknowledged</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reviewer</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Self Rating</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Manager Rating</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Overall</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-amber-600">{review.employeeName.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{review.employeeName}</div>
                        <div className="text-xs text-gray-500">{review.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{review.reviewPeriod}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{review.reviewer}</td>
                  <td className="px-4 py-3 text-center">{getRatingStars(review.selfRating)}</td>
                  <td className="px-4 py-3 text-center">{getRatingStars(review.managerRating)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg font-bold ${getRatingColor(review.overallRating)}`}>
                      {review.overallRating > 0 ? review.overallRating.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(review.dueDate).toLocaleDateString()}</div>
                    {review.completedDate && (
                      <div className="text-xs text-green-600">Done: {new Date(review.completedDate).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(review.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {review.status.includes('Pending') && (
                        <button className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded" title="Review"><Edit2 className="w-4 h-4 text-amber-600" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
