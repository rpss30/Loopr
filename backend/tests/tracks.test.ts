import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { projectService } from '../src/services/project.service';
import { sessionService } from '../src/services/session.service';
import { trackService } from '../src/services/track.service';

async function createProjectAndSession() {
  const project = await projectService.createProject({
    name: 'Acoustic Project',
    bpm: 90,
  });

  const session = await sessionService.createSession({
    projectId: project.id,
    name: 'Verse Session',
    bpm: 90,
  });

  return {
    project,
    session,
  };
}

describe('track routes', () => {
  beforeEach(async () => {
    await projectService.reset();
    await sessionService.reset();
    await trackService.reset();
  });

  it('lists tracks', async () => {
    const response = await request(app).get('/api/v1/tracks');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      tracks: [],
    });
  });

  it('validates track creation requests', async () => {
    const response = await request(app).post('/api/v1/tracks').send({
      projectId: '',
      sessionId: '',
      name: '',
      durationMs: -1,
      s3Bucket: '',
      s3Key: '',
      contentType: 'text/plain',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
  });

  it('returns 404 when creating a track for a missing project', async () => {
    const response = await request(app).post('/api/v1/tracks').send({
      projectId: 'missing-project',
      sessionId: 'missing-session',
      name: 'Guitar Layer',
      durationMs: 12000,
      s3Bucket: 'loopr-audio-local',
      s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
      contentType: 'audio/mp4',
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('project_not_found');
  });

  it('returns 404 when creating a track for a missing session', async () => {
    const project = await projectService.createProject({
      name: 'Acoustic Project',
      bpm: 90,
    });

    const response = await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: project.id,
        sessionId: 'missing-session',
        name: 'Guitar Layer',
        durationMs: 12000,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/missing-session/tracks/track-1.m4a`,
        contentType: 'audio/mp4',
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('session_not_found');
  });

  it('returns 400 when the session does not belong to the provided project', async () => {
    const firstProject = await projectService.createProject({
      name: 'First Project',
      bpm: 90,
    });

    const secondProject = await projectService.createProject({
      name: 'Second Project',
      bpm: 120,
    });

    const session = await sessionService.createSession({
      projectId: firstProject.id,
      name: 'Verse Session',
      bpm: 90,
    });

    const response = await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: secondProject.id,
        sessionId: session.id,
        name: 'Guitar Layer',
        durationMs: 12000,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${secondProject.id}/sessions/${session.id}/tracks/track-1.m4a`,
        contentType: 'audio/mp4',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('session_project_mismatch');
  });

  it('creates a track for an existing project and session', async () => {
    const { project, session } = await createProjectAndSession();

    const response = await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: project.id,
        sessionId: session.id,
        name: 'Guitar Layer',
        durationMs: 12000,
        volume: 0.75,
        isMuted: true,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-1.m4a`,
        contentType: 'audio/mp4',
      });

    expect(response.status).toBe(201);
    expect(response.body.track).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        projectId: project.id,
        sessionId: session.id,
        name: 'Guitar Layer',
        durationMs: 12000,
        volume: 0.75,
        isMuted: true,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-1.m4a`,
        contentType: 'audio/mp4',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  it('defaults volume and mute state when omitted', async () => {
    const { project, session } = await createProjectAndSession();

    const response = await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: project.id,
        sessionId: session.id,
        name: 'Bass Layer',
        durationMs: 9000,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-2.m4a`,
        contentType: 'audio/mp4',
      });

    expect(response.status).toBe(201);
    expect(response.body.track.volume).toBe(1);
    expect(response.body.track.isMuted).toBe(false);
  });

  it('returns created tracks from the list endpoint', async () => {
    const { project, session } = await createProjectAndSession();

    await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: project.id,
        sessionId: session.id,
        name: 'First Layer',
        durationMs: 8000,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-1.m4a`,
        contentType: 'audio/mp4',
      });

    await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: project.id,
        sessionId: session.id,
        name: 'Second Layer',
        durationMs: 9000,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-2.m4a`,
        contentType: 'audio/mp4',
      });

    const response = await request(app).get('/api/v1/tracks');

    expect(response.status).toBe(200);
    expect(response.body.tracks).toHaveLength(2);
    expect(response.body.tracks.map((track: { name: string }) => track.name)).toEqual([
      'Second Layer',
      'First Layer',
    ]);
  });

  it('gets a track by id', async () => {
    const { project, session } = await createProjectAndSession();

    const createResponse = await request(app)
      .post('/api/v1/tracks')
      .send({
        projectId: project.id,
        sessionId: session.id,
        name: 'Lead Layer',
        durationMs: 10000,
        s3Bucket: 'loopr-audio-local',
        s3Key: `projects/${project.id}/sessions/${session.id}/tracks/track-3.m4a`,
        contentType: 'audio/mp4',
      });

    const trackId = createResponse.body.track.id;

    const response = await request(app).get(`/api/v1/tracks/${trackId}`);

    expect(response.status).toBe(200);
    expect(response.body.track).toEqual(createResponse.body.track);
  });

  it('returns 404 when a track does not exist', async () => {
    const response = await request(app).get('/api/v1/tracks/missing-track');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('track_not_found');
  });
});
