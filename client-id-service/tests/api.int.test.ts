import request from 'supertest';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

const base = `http://localhost:${process.env.PORT || 4000}`;

// This is a lightweight integration test that expects the dev server to be running.
// In CI you'd start the server in a test container; here we assume manual run.

describe('API integration', () => {
  test('POST /api/client-ids returns id', async () => {
    const resp = await request(base)
      .post('/api/client-ids')
      .set('x-api-key', (process.env.API_KEYS || '').split(',')[0])
      .send({ format: 'uuid' })
      .expect(200);
    expect(resp.body.client_id).toBeDefined();
    expect(resp.body.issued_at).toBeDefined();
  }, 10000);
});
