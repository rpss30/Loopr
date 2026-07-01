import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env';

describe('backend env config', () => {
  it('loads default values', () => {
    const env = loadEnv({});

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      PERSISTENCE_DRIVER: 'memory',
      AWS_REGION: 'us-west-2',
      DYNAMODB_METADATA_TABLE_NAME: 'loopr-metadata',
      DYNAMODB_ENDPOINT: undefined,
      S3_AUDIO_BUCKET_NAME: 'loopr-audio-local',
    });
  });

  it('coerces PORT from a string', () => {
    const env = loadEnv({
      PORT: '4000',
    });

    expect(env.PORT).toBe(4000);
  });

  it('allows DynamoDB persistence config', () => {
    const env = loadEnv({
      PERSISTENCE_DRIVER: 'dynamodb',
      AWS_REGION: 'ca-central-1',
      DYNAMODB_METADATA_TABLE_NAME: 'loopr-dev-metadata',
      DYNAMODB_ENDPOINT: 'http://localhost:8000',
      S3_AUDIO_BUCKET_NAME: 'loopr-dev-audio',
    });

    expect(env.PERSISTENCE_DRIVER).toBe('dynamodb');
    expect(env.AWS_REGION).toBe('ca-central-1');
    expect(env.DYNAMODB_METADATA_TABLE_NAME).toBe('loopr-dev-metadata');
    expect(env.DYNAMODB_ENDPOINT).toBe('http://localhost:8000');
    expect(env.S3_AUDIO_BUCKET_NAME).toBe('loopr-dev-audio');
  });

  it('treats an empty DynamoDB endpoint as unset', () => {
    const env = loadEnv({
      DYNAMODB_ENDPOINT: '',
    });

    expect(env.DYNAMODB_ENDPOINT).toBeUndefined();
  });

  it('rejects unsupported persistence drivers', () => {
    expect(() =>
      loadEnv({
        PERSISTENCE_DRIVER: 'postgres',
      })
    ).toThrow();
  });

  it('rejects invalid DynamoDB endpoints', () => {
    expect(() =>
      loadEnv({
        DYNAMODB_ENDPOINT: 'localhost:8000',
      })
    ).toThrow();
  });
});
