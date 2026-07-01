import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('audio routes', () => {
  it('validates audio upload URL requests', async () => {
    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: '',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
  });

  it('rejects unsupported audio content types', async () => {
    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'application/octet-stream',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
  });

  it('returns the future S3 upload target shape', async () => {
    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(response.status).toBe(501);
    expect(response.body).toEqual({
      error: {
        code: 'presigned_upload_not_implemented',
        message: 'Presigned S3 upload URLs will be added in a future branch.',
      },
      upload: {
        s3Bucket: 'loopr-audio-local',
        s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
        contentType: 'audio/mp4',
      },
    });
  });
});
