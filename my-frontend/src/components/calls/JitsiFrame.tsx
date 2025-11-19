"use client";
import React, { useEffect, useRef } from 'react';

type Props = {
  domain: string; // e.g. jitsi.internal.example
  room: string;   // room name
  jwt?: string;   // join token
  onReady?: () => void;
  onEnded?: () => void;
  width?: string | number;
  height?: string | number;
  userInfo?: { displayName?: string; email?: string };
};

declare global {
  interface Window { JitsiMeetExternalAPI?: any }
}

export default function JitsiFrame({ domain, room, jwt, onReady, onEnded, width = '100%', height = 520, userInfo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (window.JitsiMeetExternalAPI) return;
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `https://${domain}/external_api.js`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('failed to load external_api'));
        document.head.appendChild(s);
      });
    }
    (async () => {
      try {
        await load();
        if (!mounted || !containerRef.current) return;
        const opts: any = {
          roomName: room,
          parentNode: containerRef.current,
          width,
          height,
          jwt,
          userInfo: userInfo || {},
          interfaceConfigOverwrite: { DEFAULT_REMOTE_DISPLAY_NAME: 'Guest' },
          configOverwrite: { disableDeepLinking: true },
        };
        apiRef.current = new window.JitsiMeetExternalAPI!(domain, opts);
        apiRef.current.addEventListener('videoConferenceJoined', () => onReady?.());
        apiRef.current.addEventListener('readyToClose', () => onEnded?.());
      } catch (e) {
        console.error('Jitsi init error', e);
      }
    })();
    return () => {
      mounted = false;
      try { apiRef.current?.dispose?.() } catch { /* noop */ }
    };
  }, [domain, room, jwt, width, height]);

  return (
    <div aria-label="Group call" role="dialog" aria-live="polite" className="w-full" style={{ width }}>
      <div ref={containerRef} />
    </div>
  );
}
