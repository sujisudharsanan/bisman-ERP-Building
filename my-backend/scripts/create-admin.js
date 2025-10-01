#!/usr/bin/env node
require('dotenv').config()
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Read DATABASE_URL from environment or .env
const databaseUrl = process.env.DATABASE_URL || null
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
    // Inspect existing schema to decide how to upsert
    const tblRes = await client.query("SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users') as exists")
    const usersExists = tblRes.rows[0] && tblRes.rows[0].exists

    const hashed = await bcrypt.hash(rawPassword, 10)

    if (usersExists) {
      // find columns on users
      const colRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'")
      const cols = colRes.rows.map(r => r.column_name.toLowerCase())

      // if users table has role_id, try to use roles table logic
      if (cols.includes('role_id')) {
        // ensure roles table exists
        await client.query(`CREATE TABLE IF NOT EXISTS roles (id serial primary key, name text unique)`)
        let roleRes = await client.query('SELECT id FROM roles WHERE name=$1', [roleName])
        let roleId
        if (roleRes.rows.length === 0) {
          const ins = await client.query('INSERT INTO roles(name) VALUES($1) RETURNING id', [roleName])
          roleId = ins.rows[0].id
        } else {
          roleId = roleRes.rows[0].id
        }
        await client.query(`INSERT INTO users(email, password, role_id) VALUES($1,$2,$3) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role_id = EXCLUDED.role_id`, [email, hashed, roleId])
        console.log(`Admin user ensured (role_id path): ${email} (role=${roleName})`)
      } else if (cols.includes('role')) {
        // upsert into users with textual role column
        const username = (email && email.split('@')[0]) || 'admin'
        // columns may include username, email, password, role, created_at
        // Build an insert that covers common columns
        const hasUsername = cols.includes('username')
        const hasCreatedAt = cols.includes('created_at')

        if (hasUsername && hasCreatedAt) {
          await client.query(
            `INSERT INTO users (username,email,password,role,created_at) VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, role=EXCLUDED.role, username=EXCLUDED.username`,
            [username, email, hashed, roleName]
          )
        } else if (hasUsername) {
          await client.query(
            `INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, role=EXCLUDED.role, username=EXCLUDED.username`,
            [username, email, hashed, roleName]
          )
        } else if (hasCreatedAt) {
          await client.query(
            `INSERT INTO users (email,password,role,created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, role=EXCLUDED.role`,
            [email, hashed, roleName]
          )
        } else {
          // minimal columns
          await client.query(
            `INSERT INTO users (email,password,role) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, role=EXCLUDED.role`,
            [email, hashed, roleName]
          )
        }
        console.log(`Admin user ensured (role text path): ${email} (role=${roleName})`)
      } else {
        throw new Error('Unrecognized users schema: no role or role_id column found')
      }
    } else {
      // users table doesn't exist — attempt to create tables (may fail if permissions insufficient)
      await client.query(`CREATE TABLE IF NOT EXISTS roles (id serial primary key, name text unique)`)
      await client.query(`CREATE TABLE IF NOT EXISTS users (id serial primary key, email text unique not null, password text not null, role_id int references roles(id))`)
      let roleRes = await client.query('SELECT id FROM roles WHERE name=$1', [roleName])
      let roleId
      if (roleRes.rows.length === 0) {
        const ins = await client.query('INSERT INTO roles(name) VALUES($1) RETURNING id', [roleName])
        roleId = ins.rows[0].id
      } else {
        roleId = roleRes.rows[0].id
      }
      await client.query(`INSERT INTO users(email, password, role_id) VALUES($1,$2,$3) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role_id = EXCLUDED.role_id`, [email, hashed, roleId])
      console.log(`Admin user ensured (new tables): ${email} (role=${roleName})`)
    }
    process.exit(0)
  } catch (err) {
    console.error('create-admin error', err && err.message)
    process.exit(1)
  } finally {
    try { await client.release() } catch (_) {}
    try { await pool.end() } catch (_) {}
  }
})()
