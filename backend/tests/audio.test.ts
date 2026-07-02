import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../src/middleware/error-handler';
import { notFoundHandler } from '../src/middleware/not-found';
import { createAudioRouter } from '../src/routes/audio.routes';
import { CreateAudioUploadUrlResult } from '../src/storage/audio-upload-url.service';

function createTestApp(uploadResult?: CreateAudioUploadUrlResult) {
  const app = express();

  const uploadUrlService = {
    createUploadUrl: vi.fn().mockResolvedValue(
      uploadResult ?? {
        uploadUrl: 'https://signed.example/upload',
        method: 'PUT',
        s3Bucket: 'loopr-audio-local',
        s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
        contentType: 'audio/mp4',
        expiresInSeconds: 900,
      }
    ),
  };

  app.use(express.json());
  app.use('/api/v1/audio', createAudioRouter(uploadUrlService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    uploadUrlService,
  };
}

describe('audio routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates audio upload URL requests', async () => {
    const { app, uploadUrlService } = createTestApp();

    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: '',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
    expect(uploadUrlService.createUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects unsupported audio content types', async () => {
    const { app, uploadUrlService } = createTestApp();

    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'application/octet-stream',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
    expect(uploadUrlService.createUploadUrl).not.toHaveBeenCalled();
  });

  it('returns a presigned S3 upload target', async () => {
    const { app, uploadUrlService } = createTestApp();

    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      upload: {
        uploadUrl: 'https://signed.example/upload',
        method: 'PUT',
        s3Bucket: 'loopr-audio-local',
        s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
        contentType: 'audio/mp4',
        expiresInSeconds: 900,
      },
    });

    expect(uploadUrlService.createUploadUrl).toHaveBeenCalledWith({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });
  });

  it('passes upload service errors to the error handler', async () => {
    const app = express();

    const uploadUrlService = {
      createUploadUrl: vi.fn().mockRejectedValue(new Error('S3 signing failed')),
    };

    app.use(express.json());
    app.use('/api/v1/audio', createAudioRouter(uploadUrlService));
    app.use(notFoundHandler);
    app.use(errorHandler);

    const response = await request(app).post('/api/v1/audio/upload-url').send({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('internal_server_error');
  });
});
