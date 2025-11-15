#!/usr/bin/env node
/**
 * Upload Mattermost Plugin via API
 * This script uploads the ERP Assistant plugin to Mattermost
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MATTERMOST_URL = 'https://mattermost-production-84fd.up.railway.app';
const ADMIN_TOKEN = '1y54w4qe4fg3djq186tixu34uc';
const PLUGIN_PATH = '/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-0.5.0+30df4dd.tar.gz';

async function uploadPlugin() {
  console.log('🚀 Uploading ERP Assistant Plugin...\n');
  
  // Check if file exists
  if (!fs.existsSync(PLUGIN_PATH)) {
    console.error('❌ Plugin file not found:', PLUGIN_PATH);
    process.exit(1);
  }
  
  const fileStats = fs.statSync(PLUGIN_PATH);
  console.log(`📦 Plugin file: ${path.basename(PLUGIN_PATH)}`);
  console.log(`📏 Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Read the file
  const fileData = fs.readFileSync(PLUGIN_PATH);
  
  // Create boundary for multipart/form-data
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  
  // Build multipart body
  const parts = [];
  
  // Add plugin file
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="plugin"; filename="${path.basename(PLUGIN_PATH)}"\r\n` +
    `Content-Type: application/gzip\r\n\r\n`
  ));
  parts.push(fileData);
  parts.push(Buffer.from('\r\n'));
  
  // Add force flag
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="force"\r\n\r\n` +
    `true\r\n`
  ));
  
  // End boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  
  const body = Buffer.concat(parts);
  
  // Parse URL
  const url = new URL(`${MATTERMOST_URL}/api/v4/plugins`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    },
    timeout: 120000 // 2 minutes timeout
  };
  
  return new Promise((resolve, reject) => {
    console.log('⏳ Uploading to Mattermost...');
    console.log(`   ${url.toString()}\n`);
    
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n📊 Response Status: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('✅ Plugin uploaded successfully!\n');
            console.log('Plugin Details:');
            console.log('  ID:', response.id);
            console.log('  Name:', response.name);
            console.log('  Version:', response.version);
            console.log('  Description:', response.description);
            console.log('\n🎯 Next step: Enable the plugin in System Console');
            resolve(response);
          } else {
            console.error('❌ Upload failed:');
            console.error('  Status:', response.status);
            console.error('  Message:', response.message);
            console.error('  Code:', response.code);
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (e) {
          console.error('❌ Failed to parse response:', data);
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('\n❌ Upload error:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.error('\n❌ Upload timeout (server took too long to respond)');
      req.destroy();
      reject(new Error('Upload timeout'));
    });
    
    // Write the body
    req.write(body);
    req.end();
  });
}

// Enable plugin after upload
async function enablePlugin(pluginId) {
  console.log('\n🔄 Enabling plugin...');
  
  const url = new URL(`${MATTERMOST_URL}/api/v4/plugins/${pluginId}/enable`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Plugin enabled successfully!');
          console.log('\n🎉 Setup complete! Your ERP bot is ready.');
          console.log('\n📝 Test it now:');
          console.log('  1. Open Mattermost');
          console.log('  2. DM @erpbot');
          console.log('  3. Type: help');
          resolve();
        } else {
          try {
            const response = JSON.parse(data);
            console.warn('⚠️  Enable response:', response.message);
            resolve(); // Don't fail if already enabled
          } catch (e) {
            reject(new Error(`Enable failed: ${data}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    const plugin = await uploadPlugin();
    if (plugin && plugin.id) {
      await enablePlugin(plugin.id);
    }
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  }
}

main();
