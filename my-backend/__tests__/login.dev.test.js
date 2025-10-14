const request = require('supertest')

// Ensure we use dev fallback (no DB dependency) regardless of local env
process.env.DATABASE_URL = ''
process.env.NODE_ENV = 'test'

const app = require('../app')

describe('Auth flow (dev users)', () => {
  it('logs in with dev credentials and returns cookies + JSON', async () => {
    const res = await request(app)
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'super@bisman.local', password: 'changeme' })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('email', 'super@bisman.local')
    expect(res.body).toHaveProperty('role', 'SUPER_ADMIN')

    const setCookie = res.headers['set-cookie']
    expect(Array.isArray(setCookie)).toBe(true)
    const hasAccess = setCookie.some(c => c.startsWith('access_token='))
    const hasRefresh = setCookie.some(c => c.startsWith('refresh_token='))
    expect(hasAccess).toBe(true)
    expect(hasRefresh).toBe(true)

    // Use cookies to call /api/me
    const me = await request(app)
      .get('/api/me')
      .set('Cookie', setCookie)
      .expect('Content-Type', /json/)
      .expect(200)

    expect(me.body).toHaveProperty('user')
    expect(me.body.user).toHaveProperty('email', 'super@bisman.local')
    expect(me.body.user).toHaveProperty('roleName', 'SUPER_ADMIN')
  })

  it('rejects invalid credentials with JSON error (no file download)', async () => {
    const res = await request(app)
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'super@bisman.local', password: 'wrong' })
      .expect('Content-Type', /json/)
      .expect(401)

    expect(res.body).toHaveProperty('error')
  })
})
