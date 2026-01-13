// Test loading users routes
try {
  const m = require('./routes/users');
  console.log('Loaded successfully:', typeof m);
  if (m && m.stack) {
    console.log('Routes count:', m.stack.length);
  }
} catch(e) {
  console.error('Error loading:', e.message);
  console.error('Stack:', e.stack);
}
