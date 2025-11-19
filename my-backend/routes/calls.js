const express = require('express')
const router = express.Router()
const { authenticate, requireRole } = require('../middleware/auth')
const calls = require('../services/callsService')
const { issueJitsiJwt } = require('../lib/jitsiJwt')

// POST /api/calls/start
router.post('/start', authenticate, async (req, res) => {
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
  try {
    const { thread_id, call_type } = req.body || {}
    const rec = calls.createCall({ threadId: thread_id, initiatorId: req.user.id, callType: call_type || 'audio' })
    const publicUrl = process.env.JITSI_PUBLIC_URL || process.env.PUBLIC_URL || ''
    return res.json({
    const rec = calls.createCall({ threadId: thread_id, initiatorId: req.user.id, callType: call_type || 'audio' })
    const publicUrl = process.env.JITSI_PUBLIC_URL || process.env.PUBLIC_URL || ''
    if (!thread_id) return res.status(400).json({ error: 'thread_id required' })

    try {
      // RBAC: requester must be a thread member (any role)
      const member = await prisma.threadMember.findUnique({ where: { threadId_userId: { threadId: thread_id, userId: req.user.id } } })
      if (!member) return res.status(403).json({ error: 'not a thread member' })

      const shortId = Math.random().toString(36).slice(2, 8)
      const room = `erp-${thread_id}-${shortId}`

      // Persist to DB call_logs
      const call = await prisma.callLog.create({
        data: {
          room_name: room,
          thread_id,
          initiator_id: req.user.id,
          call_type: call_type || 'audio',
          status: 'ringing',
          participants: [],
        },
      })

      // Mirror to in-memory store for backward compat and tests
      rec.id = call.id
      rec.room_name = call.room_name

      // TODO: emit socket event if io available
      return res.json({ id: call.id, room: call.room_name, join_url: `/calls/${call.id}` })
    } catch (e) {
      console.error('[calls.start] error', e)
      return res.status(500).json({ error: 'failed_to_start_call' })
    }
      call_id: rec.id,
      room_name: rec.room_name,
      call_type: rec.call_type,
      join_url: publicUrl ? `${publicUrl.replace(/\/$/,'')}/${encodeURIComponent(rec.room_name)}` : undefined,
    })
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message })
  }
})

// POST /api/calls/:id/join
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const rec = calls.getCall(req.params.id)
    if (!rec) return res.status(404).json({ ok: false, error: 'not_found' })
    // Simple membership check: allow initiator and existing participants; otherwise auto-add on first join
    const isInitiator = String(rec.initiator_id) === String(req.user.id)
    const isParticipant = (rec.participants || []).some(p => String(p.user_id) === String(req.user.id))
    const token = issueJitsiJwt({ room: rec.room_name, user: { id: req.user.id, name: req.user.name || req.user.email } })
    if (!isInitiator && !isParticipant) {
      calls.addParticipant(rec.id, { user_id: req.user.id, role: 'participant', device_info: { ua: req.headers['user-agent'] } })
    }
    return res.json({ ok: true, token, domain: process.env.JITSI_DOMAIN || 'jitsi.internal', room: rec.room_name })
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message })
  }
})

// POST /api/calls/:id/end
router.post('/:id/end', authenticate, async (req, res) => {
  try {
    const rec = calls.getCall(req.params.id)
    if (!rec) return res.status(404).json({ ok: false, error: 'not_found' })
  const isInitiator = String(rec.initiator_id) === String(req.user.id)
  const isAdmin = ['ADMIN','SUPER_ADMIN','ENTERPRISE_ADMIN'].includes(req.user.roleName)
  if (!isInitiator && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'forbidden' })
    }
    calls.endCall(rec.id)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message })
  }
})

// GET /api/calls/:id/log
router.get('/:id/log', authenticate, async (req, res) => {
  const rec = calls.getCall(req.params.id)
  if (!rec) return res.status(404).json({ ok: false, error: 'not_found' })
  return res.json({ ok: true, call: rec })
})

// Health checks
router.get('/health/jitsi', async (_req, res) => {
  const domain = process.env.JITSI_DOMAIN || 'jitsi.internal'
  const hasSecret = !!(process.env.JITSI_JWT_SECRET || process.env.JWT_APP_SECRET)
  return res.json({ ok: true, domain, jwt: hasSecret ? 'configured' : 'missing' })
})
router.get('/health/coturn', async (_req, res) => {
  const host = process.env.TURN_HOST || 'turn.internal'
  const port = Number(process.env.TURN_PORT || 3478)
  return res.json({ ok: true, turn: { host, port } })
})

module.exports = router
