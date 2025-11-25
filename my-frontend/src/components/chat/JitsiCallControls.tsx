'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Phone, Video, PhoneOff, Share2, Loader2 } from 'lucide-react';

interface Call {
  id: string;
  room: string;
  status: 'ringing' | 'active' | 'ended';
}

interface JitsiCallControlsProps {
  apiBase?: string;
  threadId?: string;
  token?: string;
  onError?: (error: Error) => void;
  className?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export default function JitsiCallControls({ 
  apiBase = '/api', 
  threadId, 
  token, 
  onError,
  className = ''
}: JitsiCallControlsProps) {
  const [call, setCall] = useState<Call | null>(null);
  const [joining, setJoining] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const JITSI_DOMAIN = 'meet.jit.si'; // Using public Jitsi instance

  const loadExternalApi = (): Promise<any> => new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI);
    const script = document.createElement('script');
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve(window.JitsiMeetExternalAPI);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  const startCall = async (type: 'audio' | 'video') => {
    try {
      // Generate a unique room name for this call
      const roomName = `bisman-${threadId || 'general'}-${Date.now()}`;
      
      setCall({ 
        id: roomName, 
        room: roomName, 
        status: 'ringing' 
      });
      
      setIsExpanded(true);
      
      // Auto-join after a brief delay
      setTimeout(() => joinCall(roomName, type), 300);
    } catch (e) { 
      onError?.(e as Error);
    }
  };

  const joinCall = async (roomName?: string, callType: 'audio' | 'video' = 'video') => {
    const roomToJoin = roomName || call?.room;
    if (!roomToJoin) return;
    
    setJoining(true);
    try {
      const JitsiAPI = await loadExternalApi();
      
      const api = new JitsiAPI(JITSI_DOMAIN, {
        roomName: roomToJoin,
        parentNode: containerRef.current,
        width: '100%',
        height: 480,
        configOverwrite: {
          startWithAudioMuted: callType === 'video' ? false : false,
          startWithVideoMuted: callType === 'audio' ? true : false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'stats', 'shortcuts',
            'tileview', 'download', 'help', 'mute-everyone',
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        }
      });

      api.addEventListener('videoConferenceJoined', () => {
        setCall(c => c ? { ...c, status: 'active' } : null);
        setJoining(false);
      });

      api.addEventListener('readyToClose', () => {
        setCall(c => c ? { ...c, status: 'ended' } : null);
        setJitsiApi(null);
        setIsExpanded(false);
      });

      setJitsiApi(api);
    } catch (e) { 
      onError?.(e as Error);
      setJoining(false);
    }
  };

  const endCall = async () => {
    if (!call) return;
    
    setCall(c => c ? { ...c, status: 'ended' } : null);
    jitsiApi?.dispose();
    setJitsiApi(null);
    setIsExpanded(false);
  };

  const shareCallLink = () => {
    if (!call) return;
    const link = `${window.location.origin}/call/${call.room}`;
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  useEffect(() => {
    return () => {
      jitsiApi?.dispose();
    };
  }, [jitsiApi]);

  return (
    <div className={`jitsi-call-controls ${className}`}>
      {/* Call Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => startCall('audio')}
          disabled={!!call && call.status !== 'ended'}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Start Audio Call"
          aria-label="Start audio call"
        >
          <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
        </button>
        
        <button
          onClick={() => startCall('video')}
          disabled={!!call && call.status !== 'ended'}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Start Video Call"
          aria-label="Start video call"
        >
          <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>

        {call && call.status !== 'ended' && (
          <>
            <button
              onClick={shareCallLink}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Share Call Link"
              aria-label="Share call link"
            >
              <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <button
              onClick={endCall}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
              title="End Call"
              aria-label="End call"
            >
              <PhoneOff className="w-5 h-5 text-red-600 dark:text-red-400" />
            </button>
          </>
        )}
      </div>

      {/* Call Status Banner */}
      {call && call.status !== 'ended' && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {call.status === 'ringing' && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {joining ? 'Connecting...' : 'Call starting...'}
                  </span>
                  {joining && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                </>
              )}
              {call.status === 'active' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 dark:text-green-300">Call active</span>
                </>
              )}
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
            >
              {isExpanded ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      {/* Jitsi Container */}
      <div 
        ref={containerRef} 
        className={`jitsi-container transition-all duration-300 overflow-hidden rounded-lg ${
          isExpanded && call && call.status !== 'ended' ? 'mt-2' : ''
        }`}
        style={{ 
          width: '100%', 
          height: isExpanded && call && call.status !== 'ended' ? 480 : 0 
        }}
      />
    </div>
  );
}
