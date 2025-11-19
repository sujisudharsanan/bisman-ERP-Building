const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')

describe('Calls API', () => {
  let app
  const OLD_ENV = process.env
  let token
  beforeAll(() => {
    process.env = { ...OLD_ENV, JITSI_JWT_SECRET: 'secret', JITSI_DOMAIN: 'jitsi.test' }
    app = express()
    app.use(express.json())
    // Mount router (uses real authenticate)
    const callsRouter = require('../routes/calls')
    app.use('/api/calls', callsRouter)
    // Dev token for authenticate(): uses JWT_SECRET or 'dev-secret'
    token = jwt.sign({ sub: 303, email: 'demo_super@bisman.demo' }, process.env.JWT_SECRET || 'dev-secret', { algorithm: 'HS256' })
  })
  afterAll(() => { process.env = OLD_ENV })

  it('starts and joins a call', async () => {
  const s = await request(app).post('/api/calls/start').set('Authorization', `Bearer ${token}`).send({ thread_id: 'thread-1' }).expect(200)
    expect(s.body.ok).toBe(true)
    const id = s.body.call_id
  const j = await request(app).post(`/api/calls/${id}/join`).set('Authorization', `Bearer ${token}`).send({}).expect(200)
    expect(j.body.ok).toBe(true)
    expect(j.body.token).toBeTruthy()
    expect(j.body.room).toBeTruthy()
  })

  it('ends a call', async () => {
  const s = await request(app).post('/api/calls/start').set('Authorization', `Bearer ${token}`).send({ thread_id: 'thread-2' }).expect(200)
    const id = s.body.call_id
  await request(app).post(`/api/calls/${id}/end`).set('Authorization', `Bearer ${token}`).send({}).expect(200)
  })

  it('returns 404 for unknown log', async () => {
  const r = await request(app).get('/api/calls/unknown/log').set('Authorization', `Bearer ${token}`).expect(404)
    expect(r.body.error).toBe('not_found')
  })
})
