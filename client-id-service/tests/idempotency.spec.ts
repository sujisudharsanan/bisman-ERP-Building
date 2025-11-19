import request from 'supertest';
import dotenv from 'dotenv';

dotenv.config();

const base = `http://localhost:${process.env.PORT || 4000}`;

describe('Idempotency', () => {
  test('same idempotency token returns same client_id', async () => {
    const token = 'test-token-' + Date.now();
    const key = (process.env.API_KEYS || '').split(',')[0];
    const resp1 = await request(base)
      .post('/api/client-ids')
      .set('x-api-key', key)
      .set('x-idempotency-token', token)
      .send({ format: 'uuid' })
      .expect(200);
    const resp2 = await request(base)
      .post('/api/client-ids')
      .set('x-api-key', key)
      .set('x-idempotency-token', token)
      .send({ format: 'uuid' })
      .expect(200);
    expect(resp1.body.client_id).toBeDefined();
    expect(resp1.body.client_id).toEqual(resp2.body.client_id);
  }, 20000);
});
