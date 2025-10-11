const request = require('supertest')
const app = require('../app')

describe('Public DB health endpoint', () => {
  it('GET /api/health/database should return success true and data object', async () => {
    const res = await request(app).get('/api/health/database').expect(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    expect(typeof res.body.data).toBe('object')
    expect(res.body).toHaveProperty('timestamp')
  })

  it('GET /api/health/db (legacy) should proxy to /api/health/database', async () => {
    const res = await request(app).get('/api/health/db').expect(200)
    expect(res.body).toHaveProperty('success', true)
  })
})
