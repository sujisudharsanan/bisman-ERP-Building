'use client';

import React, { useState } from 'react';
import { GraduationCap, Plus, Search, Eye, Edit2, Calendar, Users, Clock, BookOpen, Award, CheckCircle, Play } from 'lucide-react';

interface TrainingProgram {
  id: string;
  title: string;
  category: 'Technical' | 'Soft Skills' | 'Compliance' | 'Leadership' | 'Safety';
  trainer: string;
  startDate: string;
  endDate: string;
  duration: string;
  enrolled: number;
  capacity: number;
  completed: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  mode: 'Online' | 'Classroom' | 'Hybrid';
}

export default function TrainingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const programs: TrainingProgram[] = [
    { id: 'TR-001', title: 'Advanced Excel for Business Analytics', category: 'Technical', trainer: 'John Smith', startDate: '2025-01-20', endDate: '2025-01-22', duration: '3 days', enrolled: 25, capacity: 30, completed: 0, status: 'Scheduled', mode: 'Online' },
    { id: 'TR-002', title: 'Leadership Excellence Program', category: 'Leadership', trainer: 'Sarah Johnson', startDate: '2025-01-15', endDate: '2025-01-18', duration: '4 days', enrolled: 15, capacity: 20, completed: 8, status: 'In Progress', mode: 'Classroom' },
    { id: 'TR-003', title: 'Workplace Safety Training', category: 'Safety', trainer: 'Mike Wilson', startDate: '2025-01-10', endDate: '2025-01-10', duration: '1 day', enrolled: 50, capacity: 50, completed: 50, status: 'Completed', mode: 'Hybrid' },
    { id: 'TR-004', title: 'GDPR Compliance Workshop', category: 'Compliance', trainer: 'Lisa Anderson', startDate: '2025-01-25', endDate: '2025-01-25', duration: '1 day', enrolled: 40, capacity: 100, completed: 0, status: 'Scheduled', mode: 'Online' },
    { id: 'TR-005', title: 'Effective Communication Skills', category: 'Soft Skills', trainer: 'David Brown', startDate: '2025-01-12', endDate: '2025-01-14', duration: '3 days', enrolled: 18, capacity: 25, completed: 18, status: 'Completed', mode: 'Classroom' },
    { id: 'TR-006', title: 'ERP System Training', category: 'Technical', trainer: 'Tech Team', startDate: '2025-01-28', endDate: '2025-01-31', duration: '4 days', enrolled: 35, capacity: 40, completed: 0, status: 'Scheduled', mode: 'Hybrid' },
  ];

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.trainer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: programs.length,
    scheduled: programs.filter(p => p.status === 'Scheduled').length,
    inProgress: programs.filter(p => p.status === 'In Progress').length,
    completed: programs.filter(p => p.status === 'Completed').length,
    totalEnrolled: programs.reduce((sum, p) => sum + p.enrolled, 0)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      Technical: 'bg-purple-100 text-purple-700',
      'Soft Skills': 'bg-pink-100 text-pink-700',
      Compliance: 'bg-orange-100 text-orange-700',
      Leadership: 'bg-indigo-100 text-indigo-700',
      Safety: 'bg-red-100 text-red-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[category]}`}>{category}</span>;
  };

  const getModeBadge = (mode: string) => {
    const styles: Record<string, string> = {
      Online: 'bg-cyan-100 text-cyan-700',
      Classroom: 'bg-amber-100 text-amber-700',
      Hybrid: 'bg-emerald-100 text-emerald-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[mode]}`}>{mode}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-indigo-600" />Training Programs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage employee training and development programs</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />Create Program
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Programs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Enrolled</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.totalEnrolled}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search programs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filteredPrograms.map((program) => (
            <div key={program.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(program.category)}
                  {getModeBadge(program.mode)}
                </div>
                {getStatusBadge(program.status)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{program.title}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Trainer: {program.trainer}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{program.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{program.enrolled} / {program.capacity} enrolled</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{Math.round((program.completed / program.enrolled) * 100) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(program.completed / program.enrolled) * 100 || 0}%` }}></div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                {program.status === 'Scheduled' && (
                  <button className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg" title="Start"><Play className="w-4 h-4 text-indigo-600" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
