import { syncRecordedTrackToCloud } from '@/services/recorded-track-cloud-sync';

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

function createMockAudioFileUploader() {
  return jest.fn();
}

describe('syncRecordedTrackToCloud', () => {
  it('uploads recorded audio before saving backend track metadata', async () => {
    const uploadApi = createMockUploadApi();
    const tracksApi = createMockTracksApi();
    const uploadAudioFile = createMockAudioFileUploader();

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

    uploadAudioFile.mockResolvedValueOnce({
      status: 200,
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

    const result = await syncRecordedTrackToCloud(
      {
        projectId: 'project-1',
        sessionId: 'session-1',
        trackId: 'track-1',
        localUri: 'file:///recording.m4a',
        name: 'Track 1',
        durationMs: 12000,
        volume: 1,
        isMuted: false,
      },
      uploadApi,
      tracksApi,
      uploadAudioFile
    );

    expect(result.status).toBe('synced');

    if (result.status !== 'synced') {
      throw new Error('Expected recorded track cloud sync to succeed');
    }

    expect(result.upload.s3Key).toBe('projects/project-1/sessions/session-1/tracks/track-1.m4a');
    expect(result.uploadResult.status).toBe(200);
    expect(result.track.id).toBe('backend-track-1');

    expect(uploadApi.createUploadUrl).toHaveBeenCalledWith({
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    });

    expect(uploadAudioFile).toHaveBeenCalledWith({
      localUri: 'file:///recording.m4a',
      uploadUrl: 'https://example-presigned-url',
      method: 'PUT',
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

    expect(uploadAudioFile.mock.invocationCallOrder[0]).toBeLessThan(
      tracksApi.createTrack.mock.invocationCallOrder[0]
    );
  });

  it('does not save backend track metadata when audio upload fails', async () => {
    const uploadApi = createMockUploadApi();
    const tracksApi = createMockTracksApi();
    const uploadAudioFile = createMockAudioFileUploader();
    const uploadError = new Error('upload failed');

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

    uploadAudioFile.mockRejectedValueOnce(uploadError);

    const result = await syncRecordedTrackToCloud(
      {
        projectId: 'project-1',
        sessionId: 'session-1',
        trackId: 'track-1',
        localUri: 'file:///recording.m4a',
        name: 'Track 1',
        durationMs: 12000,
        volume: 1,
        isMuted: false,
      },
      uploadApi,
      tracksApi,
      uploadAudioFile
    );

    expect(result).toEqual({
      status: 'failed',
      reason: 'audio-upload-failed',
      error: uploadError,
    });
    expect(tracksApi.createTrack).not.toHaveBeenCalled();
  });

  it('skips cloud sync safely when there is no backend session', async () => {
    const uploadApi = createMockUploadApi();
    const tracksApi = createMockTracksApi();
    const uploadAudioFile = createMockAudioFileUploader();

    const result = await syncRecordedTrackToCloud(
      {
        projectId: 'project-1',
        sessionId: null,
        trackId: 'track-1',
        localUri: 'file:///recording.m4a',
        name: 'Track 1',
        durationMs: 12000,
        volume: 1,
        isMuted: false,
      },
      uploadApi,
      tracksApi,
      uploadAudioFile
    );

    expect(result).toEqual({
      status: 'skipped',
      reason: 'missing-backend-session',
    });
    expect(uploadApi.createUploadUrl).not.toHaveBeenCalled();
    expect(uploadAudioFile).not.toHaveBeenCalled();
    expect(tracksApi.createTrack).not.toHaveBeenCalled();
  });
});
