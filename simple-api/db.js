// db.js - PostgreSQL connection
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER || 'suji@temp.com',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'BISMAN DB',
  password: process.env.PG_PASSWORD || 'password123',
  port: Number(process.env.PG_PORT || 5432),
});

module.exports = pool;
