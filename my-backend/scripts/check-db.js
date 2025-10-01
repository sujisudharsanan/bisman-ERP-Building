#!/usr/bin/env node
// Simple DB connectivity checker for local development
// Usage: node scripts/check-db.js

require('dotenv').config()
const { Pool } = require('pg')

if (!databaseUrl) {
  process.exit(2)
}

const pool = new Pool({ connectionString: databaseUrl })

;(async () => {
  try {
    const client = await pool.connect()
    try {
      const res = await client.query('SELECT NOW() as now')
      console.log('DB OK — now =', res.rows[0].now)
      process.exit(0)
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('DB ERROR:', err.message)
    process.exit(1)
  } finally {
    // ensure pool is closed on exit
    try { await pool.end() } catch (_) {}
  }
})()
