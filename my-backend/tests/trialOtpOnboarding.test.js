const request = require('supertest');
const express = require('express');

// Mount the OTP router on a throwaway app instance
const otpRouter = require('../routes/trialOtpOnboarding');

function makeApp(){
  const app = express();
  app.use(express.json());
  app.use('/api/trial', otpRouter);
  return app;
}

describe('Trial OTP Onboarding API', () => {
  afterAll(async () => {
    // Give Jest a moment to settle then force exit
    await new Promise(r => setTimeout(r, 10))
  })
  const app = makeApp();

  it('lists modules', async () => {
    const res = await request(app).get('/api/trial/modules/list').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(2);
  });

  it('rejects invalid email and mobile', async () => {
    const res = await request(app).post('/api/trial/request-otp').send({
      email: 'bad',
      mobile: '123',
      businessType: 'Retail',
      employeeCount: '1-10',
      locationCountry: 'IN',
      locationCity: 'Indore',
      companyType: 'Proprietorship'
    }).expect(400);
    expect(res.body.error).toBeDefined();
  });

  it('enforces OTP verify attempts', async () => {
    // happy request
    const signup = {
      email: `user${Date.now()}@example.com`,
      mobile: '+919999999999',
      businessType: 'Retail',
      employeeCount: '1-10',
      locationCountry: 'IN',
      locationCity: 'Indore',
      companyType: 'Proprietorship'
    };
    const reqRes = await request(app).post('/api/trial/request-otp').send(signup).expect(200);
    const { requestId } = reqRes.body;
    expect(requestId).toBeTruthy();

    // try invalid codes 5 times -> last should hit 429
    for (let i=1;i<=4;i++){
      const r = await request(app).post('/api/trial/verify-otp').send({ requestId, code: '000000' });
      expect([400,429,200]).toContain(r.statusCode);
      if (r.statusCode === 429) return; // already capped
    }
    const last = await request(app).post('/api/trial/verify-otp').send({ requestId, code: '000000' });
    expect(last.statusCode).toBe(429);
  });
});
