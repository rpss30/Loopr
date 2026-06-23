import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { projectService } from '../src/services/project.service';

describe('project routes', () => {
  beforeEach(async () => {
    await projectService.reset();
  });

  it('lists projects', async () => {
    const response = await request(app).get('/api/v1/projects');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      projects: [],
    });
  });

  it('validates project creation requests', async () => {
    const response = await request(app).post('/api/v1/projects').send({
      name: '',
      bpm: 90,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
  });

  it('creates a project with a provided bpm', async () => {
    const response = await request(app).post('/api/v1/projects').send({
      name: 'Acoustic Loop',
      bpm: 90,
    });

    expect(response.status).toBe(201);
    expect(response.body.project).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Acoustic Loop',
        bpm: 90,
        trackCount: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  it('defaults bpm to 120 when omitted', async () => {
    const response = await request(app).post('/api/v1/projects').send({
      name: 'Untitled Loop',
    });

    expect(response.status).toBe(201);
    expect(response.body.project.bpm).toBe(120);
  });

  it('returns created projects from the list endpoint', async () => {
    await request(app).post('/api/v1/projects').send({
      name: 'First Loop',
      bpm: 85,
    });

    await request(app).post('/api/v1/projects').send({
      name: 'Second Loop',
      bpm: 100,
    });

    const response = await request(app).get('/api/v1/projects');

    expect(response.status).toBe(200);
    expect(response.body.projects).toHaveLength(2);
    expect(response.body.projects.map((project: { name: string }) => project.name)).toEqual([
      'Second Loop',
      'First Loop',
    ]);
  });

  it('gets a project by id', async () => {
    const createResponse = await request(app).post('/api/v1/projects').send({
      name: 'Layered Idea',
      bpm: 110,
    });

    const projectId = createResponse.body.project.id;

    const response = await request(app).get(`/api/v1/projects/${projectId}`);

    expect(response.status).toBe(200);
    expect(response.body.project).toEqual(createResponse.body.project);
  });

  it('returns 404 when a project does not exist', async () => {
    const response = await request(app).get('/api/v1/projects/missing-project');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('project_not_found');
  });
});
