#!/usr/bin/env node
const http = require('http');

const host = '127.0.0.1';
const port = process.env.PORT || 3000;
const base = `http://${host}:${port}`;

function check(path) {
  return new Promise((resolve) => {
    const req = http.get(base + path, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
    req.setTimeout(5000, () => { req.abort(); resolve(false); });
  });
}

(async function main(){
  const max = 8;
  for (let i=0;i<max;i++){
    const h = await check('/health');
    const m = await check('/metrics');
    if (h && m) {
      console.log('smoke-test: OK');
      process.exit(0);
    }
    await new Promise(r=>setTimeout(r, 1000));
  }
  console.error('smoke-test: FAILED');
  process.exit(2);
})();
