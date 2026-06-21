import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('project routes', () => {
  it('returns a placeholder response for project listing', async () => {
    const response = await request(app).get('/api/v1/projects');

    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe('not_implemented');
  });

  it('validates project creation requests', async () => {
    const response = await request(app).post('/api/v1/projects').send({
      name: '',
      bpm: 90,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
  });

  it('accepts valid project creation shape before persistence exists', async () => {
    const response = await request(app).post('/api/v1/projects').send({
      name: 'Acoustic Loop',
      bpm: 90,
    });

    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe('not_implemented');
  });
});
