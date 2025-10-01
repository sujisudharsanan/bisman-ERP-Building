const http = require('http');
const data = JSON.stringify({ email: 'Suji@gmail.com', password: 'Password@123' });
const opts = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  }
};
const req = http.request(opts, (res) => {
  console.log('STATUS', res.statusCode);
  let body = '';
  res.on('data', (c) => body += c.toString());
  res.on('end', () => console.log('BODY', body));
});
req.on('error', (e) => console.error('ERR', e && e.message));
req.write(data);
req.end();
