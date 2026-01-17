'use client';

import React, { useState } from 'react';
import { Clock, Calendar, User, CheckCircle, AlertCircle, MapPin, Download, Filter, Users, TrendingUp } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workHours: number;
  status: 'Present' | 'Absent' | 'Half Day' | 'Late' | 'On Leave';
  overtime: number;
}

export default function AttendanceTrackingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const attendance: AttendanceRecord[] = [
    { id: 'AT-001', employeeId: 'EMP-001', employeeName: 'Rajesh Kumar', department: 'Production', date: '2025-01-15', checkIn: '08:55', checkOut: '18:05', workHours: 9.17, status: 'Present', overtime: 1.17 },
    { id: 'AT-002', employeeId: 'EMP-002', employeeName: 'Priya Sharma', department: 'Finance', date: '2025-01-15', checkIn: '09:10', checkOut: '18:00', workHours: 8.83, status: 'Late', overtime: 0 },
    { id: 'AT-003', employeeId: 'EMP-003', employeeName: 'Amit Patel', department: 'HR', date: '2025-01-15', checkIn: '09:00', checkOut: '17:30', workHours: 8.5, status: 'Present', overtime: 0 },
    { id: 'AT-004', employeeId: 'EMP-004', employeeName: 'Sunita Devi', department: 'Production', date: '2025-01-15', checkIn: '-', checkOut: '-', workHours: 0, status: 'On Leave', overtime: 0 },
    { id: 'AT-005', employeeId: 'EMP-005', employeeName: 'Vikram Singh', department: 'Warehouse', date: '2025-01-15', checkIn: '08:45', checkOut: '13:00', workHours: 4.25, status: 'Half Day', overtime: 0 },
    { id: 'AT-006', employeeId: 'EMP-006', employeeName: 'Meera Joshi', department: 'Sales', date: '2025-01-15', checkIn: '-', checkOut: '-', workHours: 0, status: 'Absent', overtime: 0 },
    { id: 'AT-007', employeeId: 'EMP-007', employeeName: 'Suresh Reddy', department: 'Production', date: '2025-01-15', checkIn: '08:58', checkOut: '19:30', workHours: 10.53, status: 'Present', overtime: 2.53 },
    { id: 'AT-008', employeeId: 'EMP-008', employeeName: 'Kavitha Nair', department: 'Finance', date: '2025-01-15', checkIn: '09:00', checkOut: '18:15', workHours: 9.25, status: 'Present', overtime: 1.25 },
  ];

  const departments = ['Production', 'Finance', 'HR', 'Warehouse', 'Sales'];

  const filteredAttendance = attendance.filter(a => 
    departmentFilter === 'all' || a.department === departmentFilter
  );

  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'Present').length,
    late: attendance.filter(a => a.status === 'Late').length,
    absent: attendance.filter(a => a.status === 'Absent').length,
    onLeave: attendance.filter(a => a.status === 'On Leave').length,
    avgHours: (attendance.filter(a => a.workHours > 0).reduce((sum, a) => sum + a.workHours, 0) / attendance.filter(a => a.workHours > 0).length).toFixed(1)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Half Day': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Late: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'On Leave': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-600" />Attendance Tracking
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track employee attendance and work hours</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          <Download className="w-4 h-4" />Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Late</p>
          <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">On Leave</p>
          <p className="text-2xl font-bold text-blue-600">{stats.onLeave}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Hours</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgHours}h</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Department</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Check In</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Check Out</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Work Hours</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Overtime</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAttendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{record.employeeName}</div>
                        <div className="text-xs text-gray-500">{record.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{record.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{record.checkIn}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{record.checkOut}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-center">{record.workHours > 0 ? `${record.workHours.toFixed(1)}h` : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {record.overtime > 0 ? (
                      <span className="text-sm font-medium text-blue-600">+{record.overtime.toFixed(1)}h</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(record.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
