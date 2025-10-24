'use client';

import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

/**
 * Common Module - Messages Page
 * Accessible to ALL authenticated users
 */
export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Messages</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
