#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function main() {
  try {
    // Get DB routes
    const dbRoutes = await pool.query('SELECT route FROM pages_master WHERE is_active = TRUE ORDER BY route');
    const dbRouteList = dbRoutes.rows.map(r => r.route);
    
    // Get file routes
    const fileRoutes = fs.readFileSync('/tmp/file_routes.txt', 'utf-8').trim().split('\n');
    
    console.log('DB routes:', dbRouteList.length);
    console.log('File routes:', fileRoutes.length);
    
    // Normalize for comparison
    const normalize = (r) => r.replace(/\[[^\]]+\]/g, '[id]');
    
    const fileSet = new Set(fileRoutes.map(normalize));
    
    // Phantom routes (in DB but no file)
    const phantom = dbRouteList.filter(r => !fileSet.has(normalize(r)));
    console.log('\nPHANTOM routes (in DB but NO page file):', phantom.length);
    phantom.forEach(r => console.log('  ', r));
    
    // Real pages
    const real = dbRouteList.length - phantom.length;
    console.log('\n=== SUMMARY ===');
    console.log('Total DB routes:', dbRouteList.length);
    console.log('Phantom (no file):', phantom.length);
    console.log('REAL pages:', real);
    
  } finally {
    await pool.end();
  }
}

main();
