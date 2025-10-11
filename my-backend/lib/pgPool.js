const { Pool } = require('pg')

let pool = null

function getPgPool() {
  if (pool) return pool
  const url = process.env.DATABASE_URL
  if (!url) return null
  const needSSL = !/localhost|127\.0\.0\.1/i.test(url)
  pool = new Pool({
    connectionString: url,
    ssl: needSSL ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    application_name: 'bisman-erp-backend'
  })
  return pool
}

module.exports = { getPgPool }
