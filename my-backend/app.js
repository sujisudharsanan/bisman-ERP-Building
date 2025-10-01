const express = require('express')
const { Pool } = require('pg')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()

// CORS middleware for cross-origin requests
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ]
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
})

app.use(express.json())

const prisma = new PrismaClient()

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/', (req, res) => {
  res.send('My Backend (Express)')
})

// read DATABASE_URL from environment (was using undefined `databaseUrl`)
const databaseUrl = process.env.DATABASE_URL || null
const { createSecurePool, queryMonitor } = require('./middleware/database')

let pool
if (databaseUrl) {
  pool = createSecurePool(databaseUrl)

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

  // Database monitoring endpoint
  app.get('/api/db-monitoring', (req, res) => {
    try {
      if (!queryMonitor) {
        return res.json({
          status: 'ok',
          monitoring: {
            total: 0,
            last5Minutes: 0,
            slowQueries: 0,
            errors: 0,
            averageDuration: 0,
            slowQueryThreshold: 1000,
            recentSlowQueries: []
          },
          health: {
            score: 100,
            status: 'healthy'
          }
        })
      }
      
      const stats = queryMonitor.getStats()
      res.json({
        status: 'ok',
        monitoring: stats,
        health: {
          score: stats.slowQueries === 0 && stats.errors === 0 ? 100 : 
                 stats.slowQueries < 5 && stats.errors < 3 ? 80 : 
                 stats.slowQueries < 10 && stats.errors < 5 ? 60 : 40,
          status: stats.slowQueries === 0 && stats.errors === 0 ? 'healthy' : 
                  stats.slowQueries < 5 && stats.errors < 3 ? 'warning' : 'critical'
        }
      })
    } catch (err) {
      console.error('DB monitoring error', err)
      res.status(500).json({ ok: false, error: err.message })
    }
  })
} else {
  // No database URL provided in env; keep pool null so DB routes are disabled
  pool = null
}

const cookieParser = require('cookie-parser')
const { authenticate, requireRole } = require('./middleware/auth')

app.use(cookieParser())

// Simple login endpoint using Prisma
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  try {
  // `role` is a string column in the users table per prisma schema
  const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'invalid credentials' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'invalid credentials' })

  const roleName = user.role || null
  const token = jwt.sign({ sub: user.id, email: user.email, role: roleName }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' })
  // Set HttpOnly cookie; compute secure flag so local dev uses secure=false
  const isProduction = process.env.NODE_ENV === 'production'
  const hostHeader = (req && (req.hostname || (req.headers && req.headers.host))) || ''
  const isLocalHost = String(hostHeader).includes('localhost') || String(hostHeader).includes('127.0.0.1')
  const cookieSecure = Boolean(isProduction && !isLocalHost)
  
  // Set cookie with proper domain for local development
  const cookieOptions = { 
    httpOnly: true, 
    secure: cookieSecure, 
    sameSite: 'lax', 
    path: '/', 
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
  
  // For local development, set domain to allow cross-port access
  if (!isProduction && isLocalHost) {
    // Don't set domain for localhost to allow cross-port cookie sharing
    delete cookieOptions.domain
  }
  
  res.cookie('token', token, cookieOptions)
  res.json({ ok: true, email: user.email, role: roleName })
  } catch (err) {
    console.error('Login error', err)
    res.status(500).json({ error: 'internal error' })
  }
})

// Protected route example
app.get('/api/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

// Simple test endpoint to verify authentication
app.get('/api/auth-test', authenticate, async (req, res) => {
  res.json({ 
    authenticated: true, 
    user: req.user,
    message: 'You are authenticated!' 
  })
})

// Logout: clear cookie
app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { path: '/' })
  res.json({ ok: true })
})

// Admin-only route
app.get('/api/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  res.json({ ok: true, msg: 'admin area', user: req.user })
})

module.exports = app
