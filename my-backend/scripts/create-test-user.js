const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

async function main() {
  const confirm = process.env.CONFIRM
  if (confirm !== 'yes') {
    console.error('Refusing to run: set CONFIRM=yes and provide CREATE_USER_EMAIL and CREATE_USER_PASSWORD environment variables')
    process.exit(1)
  }

  const email = process.env.CREATE_USER_EMAIL
  const password = process.env.CREATE_USER_PASSWORD
  const username = process.env.CREATE_USER_USERNAME || email
  const role = process.env.CREATE_USER_ROLE || 'USER'

  if (!email || !password) {
    console.error('Missing CREATE_USER_EMAIL or CREATE_USER_PASSWORD')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const passwordHash = await bcrypt.hash(password, 10)
  const res = await pool.query(`INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id`, [username, email, passwordHash, role])
  console.log('Inserted user id', res.rows[0].id)
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
