const jwt = require('jsonwebtoken')

// issueJitsiJwt(room: string, user: { id,name,email,avatarUrl }, ttlSec?: number)
// Returns HS256-signed token for self-hosted Jitsi with JWT auth enabled
function issueJitsiJwt({ room, user, ttlSec = 120 }) {
  if (!room || typeof room !== 'string') throw new Error('room required')
  const secret = process.env.JITSI_JWT_SECRET || process.env.JWT_APP_SECRET
  const appId = process.env.JITSI_APP_ID || process.env.JWT_APP_ID || 'erp-calls'
  const sub = process.env.JITSI_DOMAIN || process.env.JITSI_SUB || 'jitsi.internal'
  if (!secret) throw new Error('JITSI_JWT_SECRET not configured')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: 'jitsi',
    iss: appId,
    sub,
    room,
    nbf: now - 5,
    exp: now + Math.max(30, Math.min(600, ttlSec)),
    context: {
      user: {
        id: String(user?.id ?? ''),
        name: user?.name || 'Guest',
        email: user?.email || undefined,
        avatar: user?.avatarUrl || undefined,
      }
    }
  }
  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

module.exports = { issueJitsiJwt }
