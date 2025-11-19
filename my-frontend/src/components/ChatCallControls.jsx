import React, { useEffect, useRef, useState } from 'react'

// Lightweight i18n function (replace with your i18n lib)
const t = (k) => ({
  'call.start_audio': 'Start Audio',
  'call.start_video': 'Start Video',
  'call.join': 'Join',
  'call.end': 'End',
  'call.missed': 'Missed',
  'call.share': 'Share Link',
  'call.status.ringing': 'Ringing',
  'call.status.active': 'Active',
  'call.status.ended': 'Ended',
}[k] || k)

export default function ChatCallControls({ apiBase = '/api', threadId, token, onError }) {
  const [call, setCall] = useState(null)
  const [joining, setJoining] = useState(false)
  const [jitsiApi, setJitsiApi] = useState(null)
  const containerRef = useRef(null)

  const JITSI_DOMAIN = 'jitsi.internal.example'

  const loadExternalApi = () => new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI)
    const s = document.createElement('script')
    s.src = `https://${JITSI_DOMAIN}/external_api.js`
    s.async = true
    s.onload = () => resolve(window.JitsiMeetExternalAPI)
    s.onerror = reject
    document.body.appendChild(s)
  })

  const startCall = async (type = 'audio') => {
    try {
      const res = await fetch(`${apiBase}/calls/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ thread_id: threadId, call_type: type })
      })
      if (!res.ok) throw new Error('start_failed')
      const data = await res.json()
      setCall({ id: data.id, room: data.room, status: 'ringing' })
    } catch (e) { onError?.(e) }
  }

  const joinCall = async () => {
    if (!call) return
    setJoining(true)
    try {
      const res = await fetch(`${apiBase}/calls/${call.id}/join`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('join_failed')
      const { token: jitsiToken, room, domain, iceServers } = await res.json()
      const JitsiAPI = await loadExternalApi()
      const api = new JitsiAPI(domain, {
        roomName: room,
        parentNode: containerRef.current,
        jwt: jitsiToken,
        interfaceConfigOverwrite: { DEFAULT_REMOTE_DISPLAY_NAME: 'Guest' },
        configOverwrite: { 
          disableDeepLinking: true,
          prejoinConfig: { enabled: true },
          p2p: { enabled: false },
          testing: { enableFirefoxSimulcast: false },
          webrtcIceServers: iceServers || []
        }
      })
      api.on('videoConferenceJoined', () => setCall(c => ({ ...c, status: 'active' })))
      api.on('readyToClose', () => { setCall(c => ({ ...c, status: 'ended' })); setJitsiApi(null) })
      setJitsiApi(api)
    } catch (e) { onError?.(e) } finally { setJoining(false) }
  }

  const endCall = async () => {
    if (!call) return
    await fetch(`${apiBase}/calls/${call.id}/end`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    setCall(c => c ? { ...c, status: 'ended' } : c)
    jitsiApi?.dispose()
    setJitsiApi(null)
  }

  useEffect(() => () => { jitsiApi?.dispose() }, [jitsiApi])

  return (
    <div className="chat-call-controls">
      <div className="header-icons" role="toolbar" aria-label="Call controls">
        <button aria-label={t('call.start_audio')} onClick={() => startCall('audio')}>📞</button>
        <button aria-label={t('call.start_video')} onClick={() => startCall('video')}>🎥</button>
      </div>

      {call && (
        <div className="call-banner" role="region" aria-live="polite">
          <span className={`status status-${call.status}`}>{t(`call.status.${call.status}`)}</span>
          <div className="actions">
            {call.status !== 'ended' && <button onClick={joinCall} disabled={joining}>{t('call.join')}</button>}
            {call.status !== 'ended' && <button onClick={endCall}>{t('call.end')}</button>}
            <button onClick={() => navigator.clipboard.writeText(window.location.origin+`/calls/${call.id}`)}>{t('call.share')}</button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="jitsi-container" style={{ width: '100%', height: call && call.status !== 'ended' ? 480 : 0 }} />
    </div>
  )
}
