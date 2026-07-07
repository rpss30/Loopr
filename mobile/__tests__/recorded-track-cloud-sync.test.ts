import { prepareRecordedTrackCloudSync } from '@/services/recorded-track-cloud-sync';

function createMockUploadApi() {
  return {
    createUploadUrl: jest.fn(),
  };
}

function createMockTracksApi() {
  return {
    createTrack: jest.fn(),
  };
}

describe('prepareRecordedTrackCloudSync', () => {
  it('requests an upload URL and saves backend track metadata', async () => {
    const uploadApi = createMockUploadApi();
    const tracksApi = createMockTracksApi();

    uploadApi.createUploadUrl.mockResolvedValueOnce({
      upload: {
        uploadUrl: 'https://example-presigned-url',
        method: 'PUT',
        s3Bucket: 'loopr-audio-local',
        s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
        contentType: 'audio/mp4',
        expiresInSeconds: 900,
      },
    });

    tracksApi.createTrack.mockResolvedValueOnce({
      track: {
        id: 'backend-track-1',
        projectId: 'project-1',
        sessionId: 'session-1',
        name: 'Track 1',
        durationMs: 12000,
        volume: 1,
        isMuted: false,
        s3Bucket: 'loopr-audio-local',
        s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
        contentType: 'audio/mp4',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const result = await prepareRecordedTrackCloudSync(
      {
        projectId: 'project-1',
        sessionId: 'session-1',
        trackId: 'track-1',
        name: 'Track 1',
        durationMs: 12000,
        volume: 1,
        isMuted: false,
      },
      uploadApi,
      tracksApi
    );

    expect(result.upload.s3Key).toBe('projects/project-1/sessions/session-1/tracks/track-1.m4a');
    expect(result.track.id).toBe('backend-track-1');

    expect(uploadApi.createUploadUrl).toHaveBeenCalledWith({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(tracksApi.createTrack).toHaveBeenCalledWith({
      projectId: 'project-1',
      sessionId: 'session-1',
      name: 'Track 1',
      durationMs: 12000,
      volume: 1,
      isMuted: false,
      s3Bucket: 'loopr-audio-local',
      s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
      contentType: 'audio/mp4',
    });
  });
});
