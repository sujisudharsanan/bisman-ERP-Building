// Sound Notification Hook for Chat
'use client';

import { useCallback, useRef, useEffect } from 'react';

// Sound types
type SoundType = 'message' | 'call' | 'callEnd' | 'notification';

// Audio URLs - using Web Audio API to generate tones
const SOUND_CONFIGS = {
  message: { frequency: 800, duration: 0.1, type: 'sine' as OscillatorType },
  notification: { frequency: 600, duration: 0.15, type: 'sine' as OscillatorType },
  call: { frequency: 440, duration: 0.5, type: 'sine' as OscillatorType, repeat: 3, interval: 0.7 },
  callEnd: { frequency: 300, duration: 0.3, type: 'sine' as OscillatorType },
};

export function useSoundNotification() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize AudioContext on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a tone
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      const audioContext = getAudioContext();
      
      // Resume if suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Fade in and out for smoother sound
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('[Sound] Failed to play tone:', error);
    }
  }, [getAudioContext]);

  // Play message sound (short beep)
  const playMessageSound = useCallback(() => {
    const config = SOUND_CONFIGS.message;
    playTone(config.frequency, config.duration, config.type);
    // Play a second slightly higher tone for a pleasant "ding"
    setTimeout(() => {
      playTone(config.frequency * 1.5, config.duration * 0.8, config.type);
    }, 50);
  }, [playTone]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    const config = SOUND_CONFIGS.notification;
    playTone(config.frequency, config.duration, config.type);
    setTimeout(() => {
      playTone(config.frequency * 1.2, config.duration, config.type);
    }, 100);
  }, [playTone]);

  // Play call ringtone (repeating pattern)
  const playCallRingtone = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    const config = SOUND_CONFIGS.call;
    let count = 0;
    const maxRepeats = 20; // Max 20 rings (~14 seconds)

    const playRing = () => {
      if (!isPlayingRef.current || count >= maxRepeats) {
        stopCallRingtone();
        return;
      }

      // Play a two-tone ring
      playTone(config.frequency, config.duration * 0.4, config.type);
      setTimeout(() => {
        playTone(config.frequency * 1.25, config.duration * 0.4, config.type);
      }, 200);

      count++;
    };

    playRing();
    callIntervalRef.current = setInterval(playRing, config.interval * 1000);
  }, [playTone]);

  // Stop call ringtone
  const stopCallRingtone = useCallback(() => {
    isPlayingRef.current = false;
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
      callIntervalRef.current = null;
    }
  }, []);

  // Play call end sound
  const playCallEndSound = useCallback(() => {
    stopCallRingtone();
    const config = SOUND_CONFIGS.callEnd;
    playTone(config.frequency, config.duration, config.type);
    setTimeout(() => {
      playTone(config.frequency * 0.8, config.duration * 1.5, config.type);
    }, 150);
  }, [playTone, stopCallRingtone]);

  // Play sound by type
  const playSound = useCallback((type: SoundType) => {
    switch (type) {
      case 'message':
        playMessageSound();
        break;
      case 'notification':
        playNotificationSound();
        break;
      case 'call':
        playCallRingtone();
        break;
      case 'callEnd':
        playCallEndSound();
        break;
    }
  }, [playMessageSound, playNotificationSound, playCallRingtone, playCallEndSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallRingtone();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopCallRingtone]);

  return {
    playSound,
    playMessageSound,
    playNotificationSound,
    playCallRingtone,
    stopCallRingtone,
    playCallEndSound,
  };
}
