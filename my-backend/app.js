const express = require('express')
const { Pool } = require('pg')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const prisma = new PrismaClient()

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/', (req, res) => {
  res.send('My Backend (Express)')
})

// Database connection using DATABASE_URL from env
const databaseUrl = process.env.DATABASE_URL
let pool
if (databaseUrl) {
  pool = new Pool({ connectionString: databaseUrl })

  // Simple route to verify DB connectivity
  app.get('/api/db-test', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW() as now')
      res.json({ ok: true, now: result.rows[0].now })
    } catch (err) {
      console.error('DB test error', err)
      res.status(500).json({ ok: false, error: err.message })
    }
  })
} else {
  console.warn('DATABASE_URL not set — /api/db-test will be unavailable')
}

const cookieParser = require('cookie-parser')
const { authenticate, requireRole } = require('./middleware/auth')

app.use(cookieParser())

// Simple login endpoint using Prisma
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  try {
    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } })
    if (!user) return res.status(401).json({ error: 'invalid credentials' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'invalid credentials' })

  const roleName = user.role && user.role.name ? user.role.name : null
  const token = jwt.sign({ sub: user.id, email: user.email, role: roleName }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' })
  // Set HttpOnly cookie
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 })
  res.json({ ok: true })
  } catch (err) {
    console.error('Login error', err)
    res.status(500).json({ error: 'internal error' })
  }
})

// Protected route example
app.get('/api/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

// Logout: clear cookie
app.post('/api/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

// Admin-only route
app.get('/api/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  res.json({ ok: true, msg: 'admin area', user: req.user })
})

module.exports = app
