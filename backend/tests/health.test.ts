import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('health route', () => {
  it('returns API health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'loopr-api',
    });
  });

  it('returns a structured 404 for unknown routes', async () => {
    const response = await request(app).get('/missing-route');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });
});
