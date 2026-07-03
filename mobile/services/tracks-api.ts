import { ApiClient, apiClient } from './api-client';

export type BackendTrackMetadata = {
  id: string;
  projectId: string;
  sessionId: string;
  name: string;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  s3Bucket: string;
  s3Key: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBackendTrackInput = {
  projectId: string;
  sessionId: string;
  name: string;
  durationMs: number;
  volume?: number;
  isMuted?: boolean;
  s3Bucket: string;
  s3Key: string;
  contentType: 'audio/mp4' | 'audio/m4a' | 'audio/x-m4a' | 'audio/wav';
};

type ListTracksResponse = {
  tracks: BackendTrackMetadata[];
};

type CreateTrackResponse = {
  track: BackendTrackMetadata;
};

type GetTrackResponse = {
  track: BackendTrackMetadata;
};

export class TracksApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  listTracks() {
    return this.client.get<ListTracksResponse>('/api/v1/tracks');
  }

  createTrack(input: CreateBackendTrackInput) {
    return this.client.post<CreateTrackResponse>('/api/v1/tracks', input);
  }

  getTrack(trackId: string) {
    return this.client.get<GetTrackResponse>(`/api/v1/tracks/${encodeURIComponent(trackId)}`);
  }
}

export const tracksApi = new TracksApi();
