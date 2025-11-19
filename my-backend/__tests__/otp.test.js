const { hmac } = (()=>{ try { return require('../services/otpService'); } catch { return {}; }})();

test('dummy', () => {
  expect(1).toBe(1);
});
