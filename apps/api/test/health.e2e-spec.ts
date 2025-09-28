import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('returns 200 when not dry-run', async () => {
    const server: any = app.getHttpAdapter().getInstance();
    server.locals.isDryRun = false;
    const res = await request(server).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', ok: true });
  });

  it('returns 503 when dry-run', async () => {
    const server: any = app.getHttpAdapter().getInstance();
    server.locals.isDryRun = true;
    const res = await request(server).get('/health').expect(503);
    expect(res.body).toEqual(expect.objectContaining({ status: 'dry-run', ok: false }));
  });
});
