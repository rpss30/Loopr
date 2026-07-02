import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

import { BackendEnv, env } from '../config/env';

type S3ClientEnv = Pick<BackendEnv, 'AWS_REGION'>;

export function buildS3ClientConfig(sourceEnv: S3ClientEnv): S3ClientConfig {
  return {
    region: sourceEnv.AWS_REGION,
  };
}

export function createS3Client(sourceEnv: S3ClientEnv = env) {
  return new S3Client(buildS3ClientConfig(sourceEnv));
}

export const s3Client = createS3Client();
