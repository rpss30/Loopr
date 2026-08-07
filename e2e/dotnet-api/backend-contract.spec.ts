import { expect, test } from '@playwright/test';

test.afterEach(async ({ request }) => {
  const response = await request.post('/api/v1/e2e/reset');

  expect(response.status()).toBe(204);
});

test('creates and reads track metadata through the ASP.NET Core API', async ({ request }) => {
  const projectResponse = await request.post('/api/v1/projects', {
    data: {
      name: `Dotnet E2E Project ${Date.now()}`,
      bpm: 96,
    },
  });

  expect(projectResponse.status()).toBe(201);

  const { project } = await projectResponse.json();
  const sessionResponse = await request.post('/api/v1/sessions', {
    data: {
      projectId: project.id,
      name: 'Main Session',
      bpm: project.bpm,
    },
  });

  expect(sessionResponse.status()).toBe(201);

  const { session } = await sessionResponse.json();
  const trackResponse = await request.post('/api/v1/tracks', {
    data: {
      projectId: project.id,
      sessionId: session.id,
      name: 'Track 1',
      durationMs: 12_000,
      volume: 0.8,
      isMuted: false,
      s3Bucket: 'loopr-audio-local',
      s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-1.m4a`,
      contentType: 'audio/mp4',
    },
  });

  expect(trackResponse.status()).toBe(201);

  const { track } = await trackResponse.json();

  expect(track).toMatchObject({
    projectId: project.id,
    sessionId: session.id,
    name: 'Track 1',
    durationMs: 12_000,
    volume: 0.8,
    isMuted: false,
    s3Bucket: 'loopr-audio-local',
    contentType: 'audio/mp4',
  });

  const getTrackResponse = await request.get(`/api/v1/tracks/${track.id}`);

  expect(getTrackResponse.status()).toBe(200);

  const { track: fetchedTrack } = await getTrackResponse.json();

  expect(fetchedTrack.id).toBe(track.id);

  const listTracksResponse = await request.get('/api/v1/tracks');

  expect(listTracksResponse.status()).toBe(200);

  const { tracks } = await listTracksResponse.json();

  expect(tracks).toEqual(expect.arrayContaining([expect.objectContaining({ id: track.id })]));
});

test('returns a presigned upload target through the ASP.NET Core API', async ({ request }) => {
  const response = await request.post('/api/v1/audio/upload-url', {
    data: {
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'audio/mp4',
    },
  });

  expect(response.status()).toBe(201);

  const { upload } = await response.json();

  expect(upload).toMatchObject({
    method: 'PUT',
    s3Bucket: 'loopr-audio-local',
    s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
    contentType: 'audio/mp4',
    expiresInSeconds: 900,
  });
  expect(upload.uploadUrl).toContain('loopr-audio-local.s3');
  expect(upload.uploadUrl).toContain('X-Amz-Signature=');
});

test('rejects malformed upload payloads with validation details', async ({ request }) => {
  const response = await request.post('/api/v1/audio/upload-url', {
    data: {
      projectId: 'project-1',
      sessionId: 'session-1',
      trackId: 'track-1',
      contentType: 'text/plain',
    },
  });

  expect(response.status()).toBe(400);

  const body = await response.json();

  expect(body.error).toMatchObject({
    code: 'invalid_request',
    message: 'Request body failed validation.',
  });
  expect(body.error.details).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: 'contentType' })])
  );
});
