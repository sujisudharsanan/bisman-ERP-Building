// Interface for call_logs records used in services and routes
export interface CallParticipant {
  user_id: number
  joined_at: string
  left_at?: string
  role?: string
}

export interface CallLog {
  id: string
  room_name: string
  thread_id: string
  initiator_id: number
  call_type: 'audio' | 'video'
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'failed'
  started_at: string
  ended_at?: string
  duration_seconds?: number
  participants?: CallParticipant[]
  recording_url?: string
  transcript_url?: string
  quality_metrics?: Record<string, unknown>
  consent_recorded?: boolean
  created_at?: string
  updated_at?: string
}

export default CallLog