import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import {
  AudioUploadUrlService,
  AudioUploadUrlSigner,
} from '../../src/storage/audio-upload-url.service';

describe('AudioUploadUrlService', () => {
  it('creates a presigned S3 PUT upload target', async () => {
    const client = new S3Client({
      region: 'us-west-2',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    const signer = vi.fn().mockResolvedValue('https://signed.example/upload');

    const service = new AudioUploadUrlService(
      client,
      {
        S3_AUDIO_BUCKET_NAME: 'loopr-test-audio',
        S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS: 600,
      },
      signer as unknown as AudioUploadUrlSigner
    );

    const result = await service.createUploadUrl({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(result).toEqual({
      uploadUrl: 'https://signed.example/upload',
      method: 'PUT',
      s3Bucket: 'loopr-test-audio',
      s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
      contentType: 'audio/mp4',
      expiresInSeconds: 600,
    });

    expect(signer).toHaveBeenCalledTimes(1);

    const [signerClient, command, options] = signer.mock.calls[0];

    expect(signerClient).toBe(client);
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'loopr-test-audio',
      Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
      ContentType: 'audio/mp4',
    });
    expect(options).toEqual({
      expiresIn: 600,
    });
  });

  it('URL-encodes object key segments before signing', async () => {
    const client = new S3Client({
      region: 'us-west-2',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    const signer = vi.fn().mockResolvedValue('https://signed.example/upload');

    const service = new AudioUploadUrlService(
      client,
      {
        S3_AUDIO_BUCKET_NAME: 'loopr-test-audio',
        S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS: 900,
      },
      signer as unknown as AudioUploadUrlSigner
    );

    await service.createUploadUrl({
      projectId: 'project 1',
      sessionId: 'session/1',
      trackId: 'track 1',
      contentType: 'audio/mp4',
    });

    const [, command] = signer.mock.calls[0];

    expect(command.input.Key).toBe(
      'projects/project%201/sessions/session%2F1/tracks/track%201.m4a'
    );
  });
});
