import { TracksApi } from '@/services/tracks-api';

function createMockClient() {
  return {
    get: jest.fn(),
    post: jest.fn(),
  };
}

const backendTrack = {
  id: 'track-1',
  projectId: 'project-1',
  sessionId: 'session-1',
  name: 'Guitar Layer',
  durationMs: 12000,
  volume: 0.8,
  isMuted: false,
  s3Bucket: 'loopr-audio-local',
  s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
  contentType: 'audio/mp4',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TracksApi', () => {
  it('lists backend tracks', async () => {
    const client = createMockClient();
    client.get.mockResolvedValueOnce({
      tracks: [backendTrack],
    });

    const api = new TracksApi(client as never);

    const response = await api.listTracks();

    expect(response).toEqual({
      tracks: [backendTrack],
    });
    expect(client.get).toHaveBeenCalledWith('/api/v1/tracks');
  });

  it('creates backend track metadata', async () => {
    const client = createMockClient();
    client.post.mockResolvedValueOnce({
      track: backendTrack,
    });

    const api = new TracksApi(client as never);

    const response = await api.createTrack({
      projectId: 'project-1',
      sessionId: 'session-1',
      name: 'Guitar Layer',
      durationMs: 12000,
      volume: 0.8,
      isMuted: false,
      s3Bucket: 'loopr-audio-local',
      s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
      contentType: 'audio/mp4',
    });

    expect(response.track.name).toBe('Guitar Layer');
    expect(client.post).toHaveBeenCalledWith('/api/v1/tracks', {
      projectId: 'project-1',
      sessionId: 'session-1',
      name: 'Guitar Layer',
      durationMs: 12000,
      volume: 0.8,
      isMuted: false,
      s3Bucket: 'loopr-audio-local',
      s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
      contentType: 'audio/mp4',
    });
  });

  it('gets backend track metadata by id', async () => {
    const client = createMockClient();
    client.get.mockResolvedValueOnce({
      track: {
        ...backendTrack,
        id: 'track/with spaces',
      },
    });

    const api = new TracksApi(client as never);

    const response = await api.getTrack('track/with spaces');

    expect(response.track.id).toBe('track/with spaces');
    expect(client.get).toHaveBeenCalledWith('/api/v1/tracks/track%2Fwith%20spaces');
  });
});
