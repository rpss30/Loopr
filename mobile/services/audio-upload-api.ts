import { ApiClient, apiClient } from './api-client';

export type CreateAudioUploadUrlInput = {
  projectId: string;
  sessionId: string;
  trackId: string;
  contentType: 'audio/mp4' | 'audio/m4a' | 'audio/x-m4a' | 'audio/wav';
};

export type AudioUploadTarget = {
  uploadUrl: string;
  method: 'PUT';
  s3Bucket: string;
  s3Key: string;
  contentType: string;
  expiresInSeconds: number;
};

type CreateAudioUploadUrlResponse = {
  upload: AudioUploadTarget;
};

export class AudioUploadApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  createUploadUrl(input: CreateAudioUploadUrlInput) {
    return this.client.post<CreateAudioUploadUrlResponse>('/api/v1/audio/upload-url', input);
  }
}

export const audioUploadApi = new AudioUploadApi();
