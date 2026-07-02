import { describe, expect, it } from 'vitest';

import { buildS3ClientConfig } from '../../src/aws/s3-client';

describe('S3 client config', () => {
  it('builds S3 client config from backend env', () => {
    expect(
      buildS3ClientConfig({
        AWS_REGION: 'ca-central-1',
      })
    ).toEqual({
      region: 'ca-central-1',
    });
  });
});
