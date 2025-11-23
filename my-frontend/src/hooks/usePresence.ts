"use client";
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { create } from 'zustand';

interface PresenceState {
  map: Record<string, string>; // userId -> last_seen ISO
  setLastSeen: (userId: string | number, iso: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  map: {},
  setLastSeen: (userId, iso) => set((s) => ({ map: { ...s.map, [String(userId)]: iso } }))
}));

let socket: Socket | null = null;

export function usePresence() {
  const { user } = useAuth();
  const setLastSeen = usePresenceStore((s) => s.setLastSeen);

  useEffect(() => {
    if (!user?.id) return;
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_WS || '/', { auth: { userId: user.id } });
      socket.on('connect', () => {
        if (user?.id != null) {
          setLastSeen(user.id, new Date().toISOString());
        }
      });
      socket.on('presence:update', (payload: { user_id: number; last_seen_at: string }) => {
        setLastSeen(payload.user_id, payload.last_seen_at);
      });
    }
    const hb = setInterval(() => {
      try { socket?.emit('presence:heartbeat'); } catch {}
    }, 25_000);
    return () => {
      clearInterval(hb);
    };
  }, [user?.id, setLastSeen]);
}

export function isOnline(userId: number | string, presenceMap: Record<string,string>): boolean {
  const iso = presenceMap[String(userId)];
  if (!iso) return false;
  const diff = Date.now() - new Date(iso).getTime();
  return diff < 45_000; // 45s threshold
}
