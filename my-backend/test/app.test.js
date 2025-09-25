const request = require('supertest')
const app = require('../app')

describe('GET /api/health', () => {
  it('responds with status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
