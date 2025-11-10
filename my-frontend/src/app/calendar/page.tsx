/**
 * Calendar Page - Google Calendar-style Interface
 * Features:
 * - Month, Week, and Day views
 * - Drag & drop event rescheduling
 * - Color-coded calendars
 * - Event creation modal
 * - Responsive design
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  X,
  Clock,
  MapPin,
  Users,
  Bell
} from 'lucide-react';
import axios from 'axios';

// Event Modal Component
function EventModal({ isOpen, onClose, onSave, event, calendars }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    all_day: false,
    calendar_id: '',
    event_type: 'event',
    priority: 'medium',
    reminder_minutes: 15,
    attendees: []
  });

  useEffect(() => {
    if (event) {
      // Edit mode - populate form with event data
      setFormData({
        title: event.title || '',
        description: event.extendedProps?.description || '',
        location: event.extendedProps?.location || '',
        start_date: event.start?.toISOString().slice(0, 16) || '',
        end_date: event.end?.toISOString().slice(0, 16) || '',
        all_day: event.allDay || false,
        calendar_id: event.extendedProps?.calendarId || '',
        event_type: event.extendedProps?.eventType || 'event',
        priority: event.extendedProps?.priority || 'medium',
        reminder_minutes: event.extendedProps?.reminderMinutes || 15,
        attendees: []
      });
    } else if (calendars.length > 0) {
      // Create mode - set default calendar
      setFormData(prev => ({
        ...prev,
        calendar_id: calendars.find(c => c.is_default)?.id || calendars[0]?.id || ''
      }));
    }
  }, [event, calendars, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData, event?.id);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Event title"
            />
          </div>

          {/* Calendar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Calendar *
            </label>
            <select
              name="calendar_id"
              value={formData.calendar_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {calendars.map(cal => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="all_day"
              checked={formData.all_day}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              All day event
            </label>
          </div>

          {/* Event Type & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="event">Event</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add location"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add description"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Bell className="w-4 h-4 inline mr-1" />
              Reminder
            </label>
            <select
              name="reminder_minutes"
              value={formData.reminder_minutes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="0">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Calendar Component
export default function CalendarPage() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Fetch calendars and events on mount
  useEffect(() => {
    fetchCalendars();
    fetchEvents();
  }, []);

  const fetchCalendars = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/calendar/calendars', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCalendars(response.data.calendars || []);
    } catch (error) {
      console.error('Error fetching calendars:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get date range for current view
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 2);

      const response = await axios.get('/api/calendar/events', {
        params: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (info) => {
    // Click on empty date - create new event
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (info) => {
    // Click on existing event - edit
    setSelectedEvent(info.event);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (info) => {
    // Event dragged to new date
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/calendar/events/${info.event.id}`, {
        start_date: info.event.start.toISOString(),
        end_date: info.event.end.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchEvents(); // Refresh
    } catch (error) {
      console.error('Error updating event:', error);
      info.revert(); // Revert if failed
    }
  };

  const handleEventResize = async (info) => {
    // Event resized (duration changed)
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/calendar/events/${info.event.id}`, {
        end_date: info.event.end.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchEvents(); // Refresh
    } catch (error) {
      console.error('Error resizing event:', error);
      info.revert(); // Revert if failed
    }
  };

  const handleSaveEvent = async (formData, eventId) => {
    try {
      const token = localStorage.getItem('token');

      if (eventId) {
        // Update existing event
        await axios.put(`/api/calendar/events/${eventId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new event
        await axios.post(`/api/calendar/calendars/${formData.calendar_id}/events`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsModalOpen(false);
      setSelectedEvent(null);
      fetchEvents(); // Refresh
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(view);
    }
  };

  const handleNavigate = (direction) => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      if (direction === 'prev') {
        api.prev();
      } else if (direction === 'next') {
        api.next();
      } else {
        api.today();
      }
      setCurrentDate(api.getDate());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Title and Date */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-8 h-8 text-blue-600" />
                Calendar
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Buttons */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleViewChange('dayGridMonth')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    currentView === 'dayGridMonth'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => handleViewChange('timeGridWeek')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    currentView === 'timeGridWeek'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => handleViewChange('timeGridDay')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    currentView === 'timeGridDay'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Day
                </button>
              </div>

              {/* Navigation Arrows */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleNavigate('prev')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => handleNavigate('today')}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => handleNavigate('next')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Create Event Button */}
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Event</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 dark:text-gray-400">Loading calendar...</div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={false} // We're using custom header
              events={events}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={true}
              nowIndicator={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: 'short'
              }}
            />
          )}
        </div>

        {/* Calendars Sidebar - Could be added later */}
        {calendars.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              My Calendars
            </h3>
            <div className="space-y-2">
              {calendars.map(calendar => (
                <div key={calendar.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {calendar.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        event={selectedEvent}
        calendars={calendars}
      />
    </div>
  );
}
