import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3Client } from '../aws/s3-client';
import { BackendEnv, env } from '../config/env';
import { buildTrackAudioObjectKey } from './audio-object-keys';

type AudioUploadUrlEnv = Pick<
  BackendEnv,
  'S3_AUDIO_BUCKET_NAME' | 'S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS'
>;

export type CreateAudioUploadUrlInput = {
  projectId: string;
  sessionId: string;
  trackId: string;
  contentType: string;
};

export type CreateAudioUploadUrlResult = {
  uploadUrl: string;
  method: 'PUT';
  s3Bucket: string;
  s3Key: string;
  contentType: string;
  expiresInSeconds: number;
};

export type AudioUploadUrlSigner = typeof getSignedUrl;

export class AudioUploadUrlService {
  constructor(
    private readonly client: S3Client,
    private readonly sourceEnv: AudioUploadUrlEnv,
    private readonly signer: AudioUploadUrlSigner = getSignedUrl
  ) {}

  async createUploadUrl(input: CreateAudioUploadUrlInput): Promise<CreateAudioUploadUrlResult> {
    const s3Key = buildTrackAudioObjectKey({
      projectId: input.projectId,
      sessionId: input.sessionId,
      trackId: input.trackId,
    });

    const command = new PutObjectCommand({
      Bucket: this.sourceEnv.S3_AUDIO_BUCKET_NAME,
      Key: s3Key,
      ContentType: input.contentType,
    });

    const uploadUrl = await this.signer(this.client, command, {
      expiresIn: this.sourceEnv.S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS,
    });

    return {
      uploadUrl,
      method: 'PUT',
      s3Bucket: this.sourceEnv.S3_AUDIO_BUCKET_NAME,
      s3Key,
      contentType: input.contentType,
      expiresInSeconds: this.sourceEnv.S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS,
    };
  }
}

export const audioUploadUrlService = new AudioUploadUrlService(s3Client, env);
