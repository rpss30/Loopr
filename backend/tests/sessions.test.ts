import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { projectService } from '../src/services/project.service';
import { sessionService } from '../src/services/session.service';

describe('session routes', () => {
  beforeEach(() => {
    projectService.reset();
    sessionService.reset();
  });

  it('lists sessions', async () => {
    const response = await request(app).get('/api/v1/sessions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sessions: [],
    });
  });

  it('validates session creation requests', async () => {
    const response = await request(app).post('/api/v1/sessions').send({
      projectId: '',
      name: '',
      bpm: 90,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
  });

  it('returns 404 when creating a session for a missing project', async () => {
    const response = await request(app).post('/api/v1/sessions').send({
      projectId: 'missing-project',
      name: 'Verse Loop',
      bpm: 90,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('project_not_found');
  });

  it('creates a session for an existing project', async () => {
    const project = projectService.createProject({
      name: 'Acoustic Project',
      bpm: 90,
    });

    const response = await request(app).post('/api/v1/sessions').send({
      projectId: project.id,
      name: 'Verse Loop',
      bpm: 90,
    });

    expect(response.status).toBe(201);
    expect(response.body.session).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        projectId: project.id,
        name: 'Verse Loop',
        bpm: 90,
        trackCount: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  it('defaults bpm to 120 when omitted', async () => {
    const project = projectService.createProject({
      name: 'Untitled Project',
    });

    const response = await request(app).post('/api/v1/sessions').send({
      projectId: project.id,
      name: 'Untitled Session',
    });

    expect(response.status).toBe(201);
    expect(response.body.session.bpm).toBe(120);
  });

  it('returns created sessions from the list endpoint', async () => {
    const project = projectService.createProject({
      name: 'Layered Project',
      bpm: 100,
    });

    await request(app).post('/api/v1/sessions').send({
      projectId: project.id,
      name: 'First Session',
      bpm: 85,
    });

    await request(app).post('/api/v1/sessions').send({
      projectId: project.id,
      name: 'Second Session',
      bpm: 100,
    });

    const response = await request(app).get('/api/v1/sessions');

    expect(response.status).toBe(200);
    expect(response.body.sessions).toHaveLength(2);
    expect(response.body.sessions.map((session: { name: string }) => session.name)).toEqual([
      'Second Session',
      'First Session',
    ]);
  });

  it('gets a session by id', async () => {
    const project = projectService.createProject({
      name: 'Guitar Ideas',
      bpm: 110,
    });

    const createResponse = await request(app).post('/api/v1/sessions').send({
      projectId: project.id,
      name: 'Layered Idea',
      bpm: 110,
    });

    const sessionId = createResponse.body.session.id;

    const response = await request(app).get(`/api/v1/sessions/${sessionId}`);

    expect(response.status).toBe(200);
    expect(response.body.session).toEqual(createResponse.body.session);
  });

  it('returns 404 when a session does not exist', async () => {
    const response = await request(app).get('/api/v1/sessions/missing-session');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('session_not_found');
  });
});
