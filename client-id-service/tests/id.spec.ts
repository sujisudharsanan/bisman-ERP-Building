import { generateClientId, isValidClientId, hmacSign } from '../src/lib/id';
import dotenv from 'dotenv';
dotenv.config();

test('uuid generation and validation', () => {
  const id = generateClientId({ format: 'uuid' });
  expect(typeof id).toBe('string');
  expect(isValidClientId(id)).toBeTruthy();
});

test('signed id verification', () => {
  const secret = process.env.HMAC_SECRET || 'test';
  const id = generateClientId({ format: 'uuid', signed: true }, secret);
  expect(isValidClientId(id, { expectSigned: true, hmacSecret: secret })).toBeTruthy();
});

// simulate duplicate insert logic will be covered by integration test using DB
