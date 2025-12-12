'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Video, PhoneOff, Share2, Loader2, Clock } from 'lucide-react';
import { useSoundNotification } from '../hooks/useSoundNotification';

interface Call {
  id: string;
  room: string;
  status: 'ringing' | 'active' | 'ended';
  startTime?: number;
  type: 'audio' | 'video';
}

interface JitsiCallControlsProps {
  apiBase?: string;
  threadId?: string;
  token?: string;
  onError?: (error: Error) => void;
  onCallStart?: (callType: 'audio' | 'video', roomName: string) => void;
  onCallEnd?: (duration: number, wasAnswered: boolean) => void;
  onCallMissed?: () => void;
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
  onCallStart,
  onCallEnd,
  onCallMissed,
  className = ''
}: JitsiCallControlsProps) {
  const [call, setCall] = useState<Call | null>(null);
  const [joining, setJoining] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [wasAnswered, setWasAnswered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound notifications
  const { playCallRingtone, stopCallRingtone, playCallEndSound } = useSoundNotification();

  // Format duration as MM:SS or HH:MM:SS
  const formatDuration = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Start/stop call timer
  useEffect(() => {
    if (call?.status === 'active' && call.startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - call.startTime!) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (call?.status !== 'active') {
        setCallDuration(0);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [call?.status, call?.startTime]);

  const JITSI_DOMAIN = 'meet.jit.si'; // Using public Jitsi instance

  const loadExternalApi = (): Promise<any> => new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI);
    const script = document.createElement('script');
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => {
      // Wait a bit for the API to be available
      setTimeout(() => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI);
        } else {
          reject(new Error('JitsiMeetExternalAPI not available after script load'));
        }
      }, 100);
    };
    script.onerror = (e) => reject(new Error('Failed to load Jitsi script'));
    document.body.appendChild(script);
  });

  const startCall = async (type: 'audio' | 'video') => {
    try {
      // Generate a unique room name for this call
      const roomName = `bisman-${threadId || 'general'}-${Date.now()}`;
      
      // Expand container first so it has dimensions
      setIsExpanded(true);
      
      // Play ringtone while connecting
      playCallRingtone();
      
      setCall({ 
        id: roomName, 
        room: roomName, 
        status: 'ringing',
        type
      });
      
      // Notify parent about call start (for sending message in chat)
      onCallStart?.(type, roomName);
      
      // Auto-join after a brief delay to allow container to expand
      setTimeout(() => joinCall(roomName, type), 500);
    } catch (e) { 
      stopCallRingtone();
      onError?.(e as Error);
    }
  };

  const joinCall = async (roomName?: string, callType: 'audio' | 'video' = 'video') => {
    const roomToJoin = roomName || call?.room;
    if (!roomToJoin) return;
    
    // Ensure container is available
    if (!containerRef.current) {
      console.error('[Jitsi] Container ref not available');
      onError?.(new Error('Call container not available'));
      return;
    }
    
    setJoining(true);
    try {
      console.log('[Jitsi] Loading external API...');
      const JitsiAPI = await loadExternalApi();
      console.log('[Jitsi] API loaded, creating room:', roomToJoin);
      
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
        console.log('[Jitsi] Conference joined');
        stopCallRingtone(); // Stop ringtone when connected
        setWasAnswered(true); // Mark call as answered
        setCall(c => c ? { ...c, status: 'active', startTime: Date.now() } : null);
        setJoining(false);
      });

      api.addEventListener('videoConferenceLeft', () => {
        console.log('[Jitsi] Conference left');
        playCallEndSound(); // Play end sound
        setCall(c => c ? { ...c, status: 'ended' } : null);
        setJitsiApi(null);
        setIsExpanded(false);
      });

      api.addEventListener('readyToClose', () => {
        console.log('[Jitsi] Conference closed');
        playCallEndSound(); // Play end sound
        setCall(c => c ? { ...c, status: 'ended' } : null);
        setJitsiApi(null);
        setIsExpanded(false);
      });

      api.addEventListener('errorOccurred', (e: any) => {
        console.error('[Jitsi] Error occurred:', e);
        stopCallRingtone(); // Stop ringtone on error
        onError?.(new Error(e?.error?.message || 'Jitsi error'));
      });

      // Log when iframe is ready
      api.addEventListener('browserSupport', (support: any) => {
        console.log('[Jitsi] Browser support:', support);
      });

      setJitsiApi(api);
      console.log('[Jitsi] API instance created');
    } catch (e) { 
      console.error('[Jitsi] Error:', e);
      onError?.(e as Error);
      setJoining(false);
    }
  };

  const endCall = async () => {
    if (!call) return;
    
    // Stop ringtone if still playing
    stopCallRingtone();
    
    // Play call end sound
    playCallEndSound();
    
    // Check if call was answered or missed
    if (wasAnswered && call.startTime) {
      // Call was answered - report duration
      const duration = Math.floor((Date.now() - call.startTime) / 1000);
      onCallEnd?.(duration, true);
    } else {
      // Call was not answered - report as missed
      onCallEnd?.(0, false);
      onCallMissed?.();
    }
    
    setCall(c => c ? { ...c, status: 'ended' } : null);
    jitsiApi?.dispose();
    setJitsiApi(null);
    setIsExpanded(false);
    setCallDuration(0);
    setWasAnswered(false); // Reset for next call
  };

  const shareCallLink = () => {
    if (!call) return;
    const link = `${window.location.origin}/call/${call.room}`;
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallRingtone();
      jitsiApi?.dispose();
    };
  }, [jitsiApi, stopCallRingtone]);

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

      {/* Call Modal Overlay - Fixed position so it's always visible */}
      {call && call.status !== 'ended' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1e1e2e] rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
            {/* Call Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                {call.status === 'ringing' && (
                  <>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-400 font-medium">
                      {joining ? 'Connecting...' : 'Call starting...'}
                    </span>
                    {joining && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                  </>
                )}
                {call.status === 'active' && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-medium">
                      {call.type === 'video' ? 'Video' : 'Audio'} Call
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-800 rounded-full">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-white font-mono text-sm">{formatDuration(callDuration)}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={shareCallLink}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Link
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
                >
                  {isExpanded ? 'Minimize' : 'Expand'}
                </button>
                <button
                  onClick={endCall}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </button>
              </div>
            </div>
            
            {/* Jitsi Container */}
            <div 
              ref={containerRef} 
              className="jitsi-container bg-gray-900"
              style={{ 
                width: '100%', 
                height: isExpanded ? 600 : 480
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
