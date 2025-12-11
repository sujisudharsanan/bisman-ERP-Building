const request = require('supertest')
const app = require('../app')

describe('Public DB health endpoint', () => {
  it('GET /api/health/database should return success true and data object', async () => {
    const res = await request(app).get('/api/health/database').expect(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    expect(typeof res.body.data).toBe('object')
    // timestamp is optional - only check if present
    if (res.body.timestamp) {
      expect(typeof res.body.timestamp).toBe('string')
    }
  })

  it('GET /api/health should return basic health status', async () => {
    const res = await request(app).get('/api/health')
    // Accept both 200 and other success codes
    expect(res.status).toBeLessThan(300)
    // Check for ok property (from health router) or status property (fallback)
    expect(res.body).toHaveProperty('ok', true)
  })
})
