const crypto = require('crypto')
const redis = require('./redisClient')

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex')
}

async function saveRefreshToken(rawToken, meta) {
  const h = hashToken(rawToken)
  const payload = Object.assign({}, meta)
  const ttlSeconds = meta.expiresAt ? Math.ceil((meta.expiresAt - Date.now()) / 1000) : null
  await redis.set(`refresh:${h}`, JSON.stringify(payload), ttlSeconds ? 'EX' : undefined, ttlSeconds || undefined)
}

async function verifyAndConsumeRefreshToken(rawToken) {
  const h = hashToken(rawToken)
  const key = `refresh:${h}`
  const val = await redis.get(key)
  if (!val) return null
  // consume (rotate) - delete current record
  await redis.del(key)
  try { return JSON.parse(val) } catch (e) { return null }
}

async function revokeRefreshTokenByRaw(rawToken) {
  const h = hashToken(rawToken)
  return await redis.del(`refresh:${h}`)
}

async function revokeAllRefreshTokensForUser(userId) {
  // This operation can be O(N) depending on keyspace; prefer storing user -> set of refresh keys in production
  const stream = redis.scanStream({ match: 'refresh:*', count: 100 })
  for await (const keys of stream) {
    if (!keys || keys.length === 0) continue
    const vals = await redis.mget(...keys)
    for (let i = 0; i < keys.length; i++) {
      const v = vals[i]
      if (!v) continue
      try {
        const obj = JSON.parse(v)
        if (obj.userId === userId) await redis.del(keys[i])
      } catch (e) { }
    }
  }
}

async function revokeJti(jti, expiresAt) {
  if (!jti) return
  const key = `revoked:jti:${jti}`
  const ttlSeconds = expiresAt ? Math.ceil((expiresAt - Date.now()) / 1000) : 60 * 60
  await redis.set(key, '1', 'EX', ttlSeconds)
}

async function isJtiRevoked(jti) {
  if (!jti) return false
  const key = `revoked:jti:${jti}`
  const v = await redis.get(key)
  return !!v
}

module.exports = {
  saveRefreshToken,
  verifyAndConsumeRefreshToken,
  revokeRefreshTokenByRaw,
  revokeAllRefreshTokensForUser,
  revokeJti,
  isJtiRevoked,
}
