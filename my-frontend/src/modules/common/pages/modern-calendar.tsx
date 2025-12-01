'use client';

import React, { useState } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import PermissionGuard from '@/common/components/PermissionGuard';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  Plus,
  Settings,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2
} from 'lucide-react';

// Types
interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  room: string;
  capacity: number;
  enrolled: number;
  startTime: string;
  endTime: string;
  color: string;
  instructor?: string;
  instructorAvatar?: string;
}

interface DaySchedule {
  date: Date;
  dayNumber: number;
  dayName: string;
  events: ScheduleEvent[];
}

// Mock Data
const mockEvents: ScheduleEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    description: 'Daily team sync-up meeting',
    room: 'CONFERENCE ROOM A',
    capacity: 20,
    enrolled: 12,
    startTime: '9:00',
    endTime: '9:30',
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    instructor: 'Sarah Johnson',
    instructorAvatar: 'SJ'
  },
  {
    id: '2',
    title: 'Budget Review',
    description: 'Monthly budget and financial review',
    room: 'CONFERENCE ROOM B',
    capacity: 15,
    enrolled: 10,
    startTime: '10:00',
    endTime: '11:00',
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
    instructor: 'Michael Chen',
    instructorAvatar: 'MC'
  },
  {
    id: '3',
    title: 'Client Presentation',
    description: 'Q4 results presentation for stakeholders',
    room: 'MAIN HALL',
    capacity: 50,
    enrolled: 35,
    startTime: '14:00',
    endTime: '15:30',
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    instructor: 'Emily Rodriguez',
    instructorAvatar: 'ER'
  },
  {
    id: '4',
    title: 'Training Session',
    description: 'New software onboarding and training',
    room: 'TRAINING ROOM',
    capacity: 25,
    enrolled: 18,
    startTime: '11:00',
    endTime: '12:00',
    color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    instructor: 'David Park',
    instructorAvatar: 'DP'
  },
  {
    id: '5',
    title: 'Project Planning',
    description: 'Sprint planning and task allocation',
    room: 'CONFERENCE ROOM A',
    capacity: 20,
    enrolled: 15,
    startTime: '16:00',
    endTime: '17:00',
    color: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    instructor: 'Lisa Anderson',
    instructorAvatar: 'LA'
  },
  {
    id: '6',
    title: 'Team Building',
    description: 'Interactive team activities and workshops',
    room: 'LOUNGE',
    capacity: 30,
    enrolled: 22,
    startTime: '9:30',
    endTime: '10:30',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
    instructor: 'Robert Kim',
    instructorAvatar: 'RK'
  },
];

export default function ModernCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Generate week days
  const getWeekDays = (): DaySchedule[] => {
    const days: DaySchedule[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      days.push({
        date: day,
        dayNumber: day.getDate(),
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        events: i >= 1 && i <= 5 ? mockEvents.slice(0, 3 + (i % 3)) : []
      });
    }
    
    return days;
  };

  const weekDays = getWeekDays();

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPercentageFull = (enrolled: number, capacity: number) => {
    return Math.round((enrolled / capacity) * 100);
  };

  return (
    <PermissionGuard>
    <SuperAdminLayout 
      title="Schedule Calendar" 
      description="Manage appointments and team schedules"
    >
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Studio/Company Name and Navigation */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Studio 813
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Yogaplatsen
                </p>
              </div>
            </div>

            {/* Center: Date Navigation */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex items-center gap-2">
                {weekDays.map((day, index) => (
                  <button
                    key={index}
                    className={`flex flex-col items-center justify-center w-10 h-12 sm:w-12 sm:h-14 rounded-lg transition-all ${
                      isToday(day.date)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-medium">{day.dayNumber}</span>
                    <span className="text-[10px] opacity-70">{day.dayName}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <Plus className="w-4 h-4" />
                New Appointment
              </button>
            </div>
          </div>

          {/* Request Approval Badge (if applicable) */}
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Request Approval
            </span>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {/* Day Cards */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {day.dayName}, {day.dayNumber}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {day.events.length} events
                  </span>
                </div>

                {/* Events */}
                <div className="space-y-3">
                  {day.events.length > 0 ? (
                    day.events.map((event) => {
                      const percentFull = getPercentageFull(event.enrolled, event.capacity);
                      
                      return (
                        <div
                          key={event.id}
                          className={`${event.color} border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                        >
                          {/* Event Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                {event.title}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {event.description}
                              </p>
                            </div>
                            
                            {/* Percentage Badge */}
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              percentFull >= 80 
                                ? 'bg-red-500 text-white' 
                                : percentFull >= 60 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-green-500 text-white'
                            }`}>
                              {percentFull}%
                            </span>
                          </div>

                          {/* Room Info */}
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {event.room}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>

                          {/* Instructor */}
                          {event.instructor && (
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {event.instructorAvatar}
                              </div>
                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                {event.instructor}
                              </span>
                            </div>
                          )}

                          {/* Capacity Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">
                                {event.enrolled} OF {event.capacity}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  percentFull >= 80 
                                    ? 'bg-red-500' 
                                    : percentFull >= 60 
                                    ? 'bg-orange-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${percentFull}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Action Buttons (shown on hover) */}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-2">
                              <button className="flex-1 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                                View Details
                              </button>
                              <button className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                      <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No events scheduled
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructor Info Panel (Sidebar - Desktop) */}
        <div className="hidden xl:block fixed right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Instructor Card */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                AR
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Amelia Rhodes
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Yoga Instructor
              </p>
            </div>

            {/* Today's Classes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Today's classes
              </h4>
              <div className="space-y-2">
                <div className="text-xs">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Receive appointments
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">60%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
    </PermissionGuard>
  );
}
