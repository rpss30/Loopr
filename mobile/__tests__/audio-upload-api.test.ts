import { AudioUploadApi } from '@/services/audio-upload-api';

function createMockClient() {
  return {
    post: jest.fn(),
  };
}

describe('AudioUploadApi', () => {
  it('creates backend audio upload URLs', async () => {
    const client = createMockClient();
    client.post.mockResolvedValueOnce({
      upload: {
        uploadUrl: 'https://example-presigned-url',
        method: 'PUT',
        s3Bucket: 'loopr-audio-local',
        s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
        contentType: 'audio/mp4',
        expiresInSeconds: 900,
      },
    });

    const api = new AudioUploadApi(client as never);

    const response = await api.createUploadUrl({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(response.upload.method).toBe('PUT');
    expect(response.upload.s3Key).toBe('projects/project-1/sessions/session-1/tracks/track-1.m4a');
    expect(client.post).toHaveBeenCalledWith('/api/v1/audio/upload-url', {
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });
  });
});
