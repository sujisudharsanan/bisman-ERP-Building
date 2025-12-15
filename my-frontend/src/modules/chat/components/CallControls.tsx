'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Video, PhoneOff, Share2, Loader2, Clock, Mic, MicOff, VideoOff, Camera, CheckCircle, Minimize2, Maximize2, X, UserPlus } from 'lucide-react';
import { useSoundNotification } from '../hooks/useSoundNotification';
import { useChatSocket } from '../hooks/useChatSocket';

interface Call {
  id: string;
  room: string;
  status: 'connecting' | 'ringing' | 'active' | 'ended';
  startTime?: number;
  type: 'audio' | 'video';
}

interface JitsiCallControlsProps {
  apiBase?: string;
  threadId?: string;
  token?: string;
  taskTitle?: string; // For displaying "Start Call - Task TSK-00035"
  participantName?: string; // Auto-populated from logged-in user
  targetUserIds?: number[]; // Users to invite to the call
  socket?: any; // Optional socket instance
  joinRoomName?: string | null; // Room to auto-join (for accepting incoming calls)
  joinCallType?: 'audio' | 'video'; // Type of call to join
  onError?: (error: Error) => void;
  onCallStart?: (callType: 'audio' | 'video', roomName: string) => void;
  onCallEnd?: (duration: number, wasAnswered: boolean) => void;
  onCallMissed?: () => void;
  onCallJoined?: () => void; // Called when successfully joined an incoming call
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
  taskTitle,
  participantName = 'User',
  targetUserIds = [],
  socket: externalSocket,
  joinRoomName = null,
  joinCallType = 'video',
  onError,
  onCallStart,
  onCallEnd,
  onCallMissed,
  onCallJoined,
  className = ''
}: JitsiCallControlsProps) {
  const [call, setCall] = useState<Call | null>(null);
  const [joining, setJoining] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [wasAnswered, setWasAnswered] = useState(false);
  const [devicesReady, setDevicesReady] = useState(true); // Device status
  const [showInviteToast, setShowInviteToast] = useState(false);
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

  // Auto-join room when joinRoomName is provided (for accepting incoming calls)
  useEffect(() => {
    if (joinRoomName && !call && !joining) {
      console.log('[CallControls] Auto-joining room for incoming call:', joinRoomName);
      
      // Set up the call state and expand the container
      setIsExpanded(true);
      setIsMinimized(false);
      
      setCall({ 
        id: joinRoomName, 
        room: joinRoomName, 
        status: 'ringing',
        type: joinCallType
      });
      
      setJoining(true);
      
      // Join the call after a brief delay
      setTimeout(() => {
        joinCallRef.current?.(joinRoomName, joinCallType);
        onCallJoined?.();
      }, 300);
    }
  }, [joinRoomName, joinCallType, call, joining, onCallJoined]);

  // Keep a ref to joinCall for use in useEffect
  const joinCallRef = useRef<((roomName?: string, callType?: 'audio' | 'video') => Promise<void>) | null>(null);

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
      setIsMinimized(false);
      
      // Start with "connecting" status
      setCall({ 
        id: roomName, 
        room: roomName, 
        status: 'connecting',
        type
      });
      
      setJoining(true);
      
      // Send call invitation to other users via socket
      if (externalSocket && threadId && targetUserIds.length > 0) {
        console.log('[Call] Socket available:', !!externalSocket);
        console.log('[Call] Socket connected:', externalSocket?.connected);
        console.log('[Call] Sending call invite to users:', targetUserIds, 'in thread:', threadId);
        externalSocket.emit('chat:call:invite', {
          threadId,
          roomName,
          callType: type,
          targetUserIds
        });
        console.log('[Call] Call invite emitted');
      } else {
        console.warn('[Call] Cannot send invite - socket:', !!externalSocket, 'threadId:', threadId, 'targetUserIds:', targetUserIds);
      }
      
      // Notify parent about call start (for sending message in chat)
      onCallStart?.(type, roomName);
      
      // Auto-join after a brief delay to allow container to expand
      setTimeout(() => joinCall(roomName, type), 300);
    } catch (e) { 
      stopCallRingtone();
      setJoining(false);
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
        height: '100%',
        userInfo: {
          displayName: participantName, // Auto-populate from logged-in user
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: callType === 'audio' ? true : false,
          prejoinPageEnabled: false, // Skip "Enter your name" step
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          hideConferenceSubject: true, // Hide meeting ID
          hideConferenceTimer: true,
          subject: ' ', // Empty subject
          defaultLocalDisplayName: participantName,
          defaultRemoteDisplayName: 'Participant',
          disableInviteFunctions: true,
          toolbarButtons: [], // Hide all toolbar buttons - we have our own
          disableProfile: true,
          disablePolls: true,
          disableReactions: true,
          disableReactionsModeration: true,
          disableSelfView: callType === 'audio', // Hide self view for audio calls
          doNotStoreRoom: true,
          enableLobby: false,
          hideLobbyButton: true,
          notifications: [],
          disableJoinLeaveSounds: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: callType === 'audio' 
            ? [] // No toolbar for audio calls
            : ['camera', 'microphone'], // Minimal for video
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          DEFAULT_LOGO_URL: '',
          DEFAULT_WELCOME_PAGE_LOGO_URL: '',
          HIDE_INVITE_MORE_HEADER: true,
          DISPLAY_WELCOME_FOOTER: false,
          DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          MOBILE_APP_PROMO: false,
          SHOW_CHROME_EXTENSION_BANNER: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          VIDEO_LAYOUT_FIT: 'both',
          VERTICAL_FILMSTRIP: false,
          FILM_STRIP_MAX_HEIGHT: 0,
          TILE_VIEW_MAX_COLUMNS: 2,
          DISABLE_VIDEO_BACKGROUND: true,
          DISABLE_FOCUS_INDICATOR: true,
          HIDE_KICK_BUTTON_FOR_GUESTS: true,
          TOOLBAR_ALWAYS_VISIBLE: false,
          INITIAL_TOOLBAR_TIMEOUT: 0,
          TOOLBAR_TIMEOUT: 0,
          filmStripOnly: callType === 'audio', // Minimal for audio
          SETTINGS_SECTIONS: [],
        }
      });

      // When WE join the conference - switch from "connecting" to "ringing"
      api.addEventListener('videoConferenceJoined', () => {
        console.log('[Jitsi] Conference joined - now ringing, waiting for other participant');
        // Play ringtone now that we're in the room waiting
        playCallRingtone();
        setCall(c => c ? { ...c, status: 'ringing' } : null);
        setJoining(false);
      });

      // When ANOTHER participant joins - call is answered, switch to "active"
      api.addEventListener('participantJoined', (participant: any) => {
        console.log('[Jitsi] Participant joined - call answered:', participant);
        stopCallRingtone();
        setWasAnswered(true);
        // Start timer only now when call is actually answered
        setCall(c => c ? { ...c, status: 'active', startTime: Date.now() } : null);
      });

      // Listen for when local tracks are ready (means we're in the call)
      api.addEventListener('cameraError', () => {
        console.log('[Jitsi] Camera error - but still connected');
        // Even with camera error, we're still ringing (waiting for other person)
        setCall(c => c && c.status === 'connecting' ? { ...c, status: 'ringing' } : c);
        setJoining(false);
      });

      // Fallback: Mark as ringing after iframe loads (5 seconds timeout)
      setTimeout(() => {
        setCall(c => {
          if (c && c.status === 'connecting') {
            console.log('[Jitsi] Fallback: marking call as ringing after timeout');
            playCallRingtone();
            setJoining(false);
            return { ...c, status: 'ringing' };
          }
          return c;
        });
      }, 5000);

      // Track mute state changes (these don't indicate call answered)
      api.addEventListener('audioMuteStatusChanged', (data: { muted: boolean }) => {
        console.log('[Jitsi] Audio mute changed:', data.muted);
        setIsMuted(data.muted);
      });

      api.addEventListener('videoMuteStatusChanged', (data: { muted: boolean }) => {
        console.log('[Jitsi] Video mute changed:', data.muted);
        setIsVideoOff(data.muted);
      });

      api.addEventListener('videoConferenceLeft', () => {
        console.log('[Jitsi] Conference left');
        playCallEndSound(); // Play end sound
        setCall(c => c ? { ...c, status: 'ended' } : null);
        setJitsiApi(null);
        setIsExpanded(false);
        setIsMinimized(false);
      });

      api.addEventListener('readyToClose', () => {
        console.log('[Jitsi] Conference closed');
        playCallEndSound(); // Play end sound
        setCall(c => c ? { ...c, status: 'ended' } : null);
        setJitsiApi(null);
        setIsExpanded(false);
        setIsMinimized(false);
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

  // Update ref so useEffect can call joinCall
  joinCallRef.current = joinCall;

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
    setIsMinimized(false);
    setCallDuration(0);
    setWasAnswered(false); // Reset for next call
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const shareCallLink = () => {
    if (!call) return;
    const link = `${window.location.origin}/call/${call.room}`;
    navigator.clipboard.writeText(link);
    setShowInviteToast(true);
    setTimeout(() => setShowInviteToast(false), 2000);
  };

  const toggleMute = () => {
    jitsiApi?.executeCommand('toggleAudio');
  };

  const toggleVideo = () => {
    jitsiApi?.executeCommand('toggleVideo');
  };

  const invitePeople = () => {
    // Opens Jitsi's invite dialog or copies link
    if (jitsiApi) {
      try {
        jitsiApi.executeCommand('toggleShareScreen'); // Open share/invite
      } catch {
        // Fallback to copy link
        shareCallLink();
      }
    } else {
      shareCallLink();
    }
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

      {/* Invite Toast */}
      {showInviteToast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          ✓ Invite link copied!
        </div>
      )}

      {/* Minimized Call Banner - Top Right Corner */}
      {call && call.status !== 'ended' && isMinimized && (
        <div 
          onClick={() => setIsMinimized(false)}
          className="fixed top-4 right-4 z-50 cursor-pointer"
        >
          <div className="flex items-center gap-3 bg-[#1a1a2e] border border-gray-700/50 rounded-full px-4 py-2 shadow-2xl hover:bg-[#2b2d42] transition-all">
            {/* Pulsing indicator */}
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${call.status === 'active' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <div className={`absolute inset-0 w-3 h-3 rounded-full ${call.status === 'active' ? 'bg-green-500' : call.status === 'ringing' ? 'bg-yellow-500' : 'bg-blue-500'} animate-ping opacity-50`}></div>
            </div>
            
            {/* Call info */}
            <div className="flex items-center gap-2">
              {call.type === 'video' ? (
                <Video className="w-4 h-4 text-blue-400" />
              ) : (
                <Phone className="w-4 h-4 text-green-400" />
              )}
              <span className="text-white text-sm font-medium">
                {call.status === 'active' 
                  ? formatDuration(callDuration) 
                  : call.status === 'ringing' 
                    ? 'Ringing...' 
                    : 'Connecting...'}
              </span>
            </div>
            
            {/* End call button */}
            <button
              onClick={(e) => { e.stopPropagation(); endCall(); }}
              className="p-1.5 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Call Modal Overlay - Compact call window */}
      {call && call.status !== 'ended' && !isMinimized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={`bg-[#1a1a2e] rounded-2xl shadow-2xl overflow-hidden border border-gray-700/30 transition-all duration-300 ${
            call.type === 'video' && isExpanded 
              ? 'w-full max-w-2xl mx-4' 
              : call.type === 'video'
                ? 'w-80'
                : 'w-72'
          }`}>
            {/* Compact Call Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#2b2d42] to-[#1e1e2e]">
              <div className="flex items-center gap-3">
                {/* Call Type Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  call.status === 'active' ? 'bg-green-500/20' : call.status === 'ringing' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                }`}>
                  {call.type === 'video' ? (
                    <Video className={`w-5 h-5 ${call.status === 'active' ? 'text-green-400' : call.status === 'ringing' ? 'text-yellow-400' : 'text-blue-400'}`} />
                  ) : (
                    <Phone className={`w-5 h-5 ${call.status === 'active' ? 'text-green-400' : call.status === 'ringing' ? 'text-yellow-400' : 'text-blue-400'}`} />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">
                    {taskTitle || participantName || 'Call'}
                  </span>
                  <span className="text-xs flex items-center gap-1.5">
                    {call.status === 'connecting' ? (
                      <span className="text-blue-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting...
                      </span>
                    ) : call.status === 'ringing' ? (
                      <span className="text-yellow-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block"></span>
                        Ringing...
                      </span>
                    ) : (
                      <span className="text-green-400 font-mono flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                        {formatDuration(callDuration)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-1">
                {/* Minimize button */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                
                {/* Expand for video calls */}
                {call.type === 'video' && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                    title={isExpanded ? 'Shrink' : 'Expand'}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Video Container (only for video calls) */}
            {call.type === 'video' && (
              <div 
                ref={containerRef} 
                className="jitsi-container bg-[#0d0d14]"
                style={{ 
                  width: '100%', 
                  height: isExpanded ? 360 : 200
                }}
              />
            )}
            
            {/* Audio Call UI - Compact avatar display */}
            {call.type === 'audio' && (
              <div className="flex flex-col items-center py-8 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d14]">
                {/* Hidden Jitsi container for audio */}
                <div ref={containerRef} className="hidden" style={{ width: 0, height: 0 }} />
                
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-green-500/20">
                    {(participantName || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  {call.status !== 'active' && (
                    <div className="absolute -inset-2 rounded-full border-2 border-green-500 animate-ping opacity-30"></div>
                  )}
                  {call.status === 'active' && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                      <Phone className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Call Info */}
                <p className="text-white font-medium mb-1">{participantName || 'Calling...'}</p>
                <div className="text-gray-500 text-sm">
                  {call.status === 'active' ? (
                    <span className="text-green-400 font-mono">{formatDuration(callDuration)}</span>
                  ) : call.status === 'ringing' ? (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block"></span>
                      Ringing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Connecting...
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Call Controls */}
            <div className="flex items-center justify-center gap-3 py-4 bg-[#1a1a2e] border-t border-gray-700/30">
              {/* Mute Toggle */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition-all ${
                  isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700/50 hover:bg-gray-600/50'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>
              
              {/* Video Toggle (only for video calls) */}
              {call.type === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-all ${
                    isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700/50 hover:bg-gray-600/50'
                  }`}
                  title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Camera className="w-5 h-5 text-white" />}
                </button>
              )}
              
              {/* End Call */}
              <button
                onClick={endCall}
                className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all shadow-lg shadow-red-500/30 hover:scale-105"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              
              {/* Add People */}
              <button
                onClick={invitePeople}
                className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full text-white transition-all"
                title="Add People"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              
              {/* Share Link */}
              <button
                onClick={shareCallLink}
                className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full text-white transition-all"
                title="Copy Invite Link"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
