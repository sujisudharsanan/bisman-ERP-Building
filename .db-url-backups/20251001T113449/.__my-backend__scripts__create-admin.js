#!/usr/bin/env node
require('dotenv').config()
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set in environment or .env')
  process.exit(2)
}

const pool = new Pool({ connectionString: databaseUrl })

;(async () => {
  const client = await pool.connect()
  try {
    const email = process.argv[2] || 'admin@local'
    const rawPassword = process.argv[3] || 'admin123'
    const roleName = process.argv[4] || 'ADMIN'

    // create roles table if missing (id serial, name text)
    await client.query(`CREATE TABLE IF NOT EXISTS roles (id serial primary key, name text unique)`)
    await client.query(`CREATE TABLE IF NOT EXISTS users (id serial primary key, email text unique not null, password text not null, role_id int references roles(id))`)

    // ensure role exists
    let roleRes = await client.query('SELECT id FROM roles WHERE name=$1', [roleName])
    let roleId
    if (roleRes.rows.length === 0) {
      const ins = await client.query('INSERT INTO roles(name) VALUES($1) RETURNING id', [roleName])
      roleId = ins.rows[0].id
    } else {
      roleId = roleRes.rows[0].id
    }

    const hashed = await bcrypt.hash(rawPassword, 10)
    // upsert user
    await client.query(`INSERT INTO users(email, password, role_id) VALUES($1,$2,$3) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role_id = EXCLUDED.role_id`, [email, hashed, roleId])
    console.log(`Admin user ensured: ${email} / ${rawPassword} (role=${roleName})`)
    process.exit(0)
  } catch (err) {
    console.error('create-admin error', err && err.message)
    process.exit(1)
  } finally {
    try { await client.release() } catch (_) {}
    try { await pool.end() } catch (_) {}
  }
})()
