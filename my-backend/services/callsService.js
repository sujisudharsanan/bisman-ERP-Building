const fs = require('fs')
const path = require('path')

// Simple in-memory store with optional JSON persistence for dev/test
const STORE_PATH = process.env.CALLS_STORE_PATH || path.join(__dirname, '..', 'data', 'calls-store.json')
const ensureDir = (p) => { try { fs.mkdirSync(path.dirname(p), { recursive: true }) } catch (_) {} }

class CallsService {
  constructor() {
    this.calls = new Map()
    this.seq = 1
    this._load()
  }

  _load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const j = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
        this.seq = j.seq || 1
        for (const c of j.calls || []) this.calls.set(c.id, c)
      }
    } catch (e) { /* ignore */ }
  }

  _save() {
    if (process.env.NODE_ENV === 'test') return
    try {
      ensureDir(STORE_PATH)
      const j = { seq: this.seq, calls: Array.from(this.calls.values()) }
      fs.writeFileSync(STORE_PATH, JSON.stringify(j, null, 2))
    } catch (e) { /* ignore */ }
  }

  createCall({ threadId, initiatorId, callType = 'audio' }) {
    if (!threadId) throw new Error('threadId required')
    if (!initiatorId) throw new Error('initiatorId required')
    const id = String(this.seq++)
    const room = `erp-${threadId}-${id}`
    const now = new Date().toISOString()
    const rec = {
      id,
      thread_id: String(threadId),
      room_name: room,
      call_type: callType,
      status: 'ringing',
      initiator_id: String(initiatorId),
      started_at: now,
      ended_at: null,
      participants: []
    }
    this.calls.set(id, rec)
    this._save()
    return rec
  }

  getCall(id) { return this.calls.get(String(id)) || null }

  addParticipant(id, participant) {
    const c = this.getCall(id)
    if (!c) throw new Error('call not found')
    const exists = c.participants.find(p => p.user_id === String(participant.user_id))
    if (!exists) {
      c.participants.push({
        user_id: String(participant.user_id),
        role: participant.role || 'participant',
        joined_at: new Date().toISOString(),
        device_info: participant.device_info || null
      })
      this._save()
    }
    return c
  }

  endCall(id, meta = {}) {
    const c = this.getCall(id)
    if (!c) throw new Error('call not found')
    c.status = meta.status || 'completed'
    c.ended_at = new Date().toISOString()
    this._save()
    return c
  }
}

module.exports = new CallsService()
