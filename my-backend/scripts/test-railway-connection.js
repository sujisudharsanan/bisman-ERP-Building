#!/usr/bin/env node
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

console.log('🔌 Connecting to Railway...');
console.log('URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

pool.query('SELECT NOW() as now, current_database() as db')
  .then(r => {
    console.log('✅ Connected to:', r.rows[0].db, 'at', r.rows[0].now);
    return pool.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'");
  })
  .then(r => {
    console.log('📊 Tables in public schema:', r.rows[0].count);
    return pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('modules_master', 'pages_master', 'role_page_access') ORDER BY table_name");
  })
  .then(r => {
    console.log('🔍 SSOT Tables found:', r.rows.map(row => row.table_name).join(', ') || 'NONE');
    pool.end();
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    pool.end();
    process.exit(1);
  });
