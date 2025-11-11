const request = require('supertest')
process.env.NODE_ENV = 'test'
// Disable real DB if not available; tests will skip vocab persistence gracefully if pg pool missing.
const app = require('../app')

// Helper: fake auth token (middleware expects a JWT; we can bypass using dev users by creating a token with id 100 / email super@bisman.local)
const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET || 'dev-secret'
function makeToken(payload){ return jwt.sign(payload, secret, { algorithm: 'HS256' }) }

const userPayload = { sub: 100, email: 'super@bisman.local', userType: 'SUPER_ADMIN' }
const token = makeToken(userPayload)

// Simple utility to auth header
function auth(){ return { Authorization: `Bearer ${token}` } }

describe('Mattermost vocab clarify & confirm flow', () => {
  let pendingId
  const unknownTerm = 'flargometer' // assume not present in vocab DB

  it('returns clarify_term intent for unknown term', async() => {
    const res = await request(app)
      .post('/api/mattermost/query')
      .set(auth())
      .send({ query: `Check ${unknownTerm} usage today` })
      .expect(200)
    expect(res.body).toHaveProperty('intent', 'clarify_term')
    expect(res.body.data).toHaveProperty('term', unknownTerm)
    expect(res.body.data).toHaveProperty('pendingId')
    expect(Array.isArray(res.body.data.suggestions)).toBe(true)
    pendingId = res.body.data.pendingId
  })

  it('confirms mapping using option 1 and saves', async() => {
    if (!pendingId) return fail('pendingId missing from previous test')
    const res = await request(app)
      .post('/api/mattermost/vocab/confirm')
      .set(auth())
      .send({ pendingId, reply: '1' })
      .expect(200)
    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('saved', true)
    expect(res.body).toHaveProperty('term', unknownTerm)
  })

  it('subsequent query skips clarification', async() => {
    const res = await request(app)
      .post('/api/mattermost/query')
      .set(auth())
      .send({ query: `Show latest ${unknownTerm} stats` })
      .expect(200)
    // Should not be clarify_term now (will likely be unknown intent unless keywords match)
    expect(res.body.intent).not.toBe('clarify_term')
  })
})
