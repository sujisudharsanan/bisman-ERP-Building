'use client';

import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { useSoundNotification } from '../hooks/useSoundNotification';

interface IncomingCallData {
  callId: string;
  roomName: string;
  threadId: string;
  callType: 'audio' | 'video';
  callerId: number;
  callerName: string;
  timestamp: Date;
}

interface IncomingCallProps {
  call: IncomingCallData;
  onAccept: (call: IncomingCallData) => void;
  onReject: (call: IncomingCallData) => void;
  onTimeout?: (call: IncomingCallData) => void;
  timeoutDuration?: number; // in seconds, default 30
}

export default function IncomingCall({
  call,
  onAccept,
  onReject,
  onTimeout,
  timeoutDuration = 30
}: IncomingCallProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeoutDuration);
  const { playCallRingtone, stopCallRingtone } = useSoundNotification();

  // Play ringtone on mount
  useEffect(() => {
    playCallRingtone();
    return () => {
      stopCallRingtone();
    };
  }, [playCallRingtone, stopCallRingtone]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout?.(call);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [call, onTimeout]);

  const handleAccept = () => {
    stopCallRingtone();
    onAccept(call);
  };

  const handleReject = () => {
    stopCallRingtone();
    onReject(call);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {call.callType === 'video' ? (
              <Video className="w-5 h-5 text-blue-400" />
            ) : (
              <Phone className="w-5 h-5 text-green-400" />
            )}
            <span className="text-sm text-gray-400">
              Incoming {call.callType} call
            </span>
          </div>
          <button
            onClick={handleReject}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Caller Info */}
        <div className="flex flex-col items-center py-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-3xl font-bold text-white">
              {call.callerName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          
          {/* Caller Name */}
          <h3 className="text-xl font-semibold text-white mb-1">
            {call.callerName || 'Unknown'}
          </h3>
          
          {/* Ringing indicator */}
          <div className="flex items-center gap-2 text-green-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm">Ringing... ({timeRemaining}s)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg hover:shadow-red-500/25"
            title="Decline"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-lg hover:shadow-green-500/25"
            title="Accept"
          >
            {call.callType === 'video' ? (
              <Video className="w-7 h-7 text-white" />
            ) : (
              <Phone className="w-7 h-7 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export the interface for use elsewhere
export type { IncomingCallData };
