import { ProjectsApi } from '@/services/projects-api';

function createMockClient() {
  return {
    get: jest.fn(),
    post: jest.fn(),
  };
}

describe('ProjectsApi', () => {
  it('gets backend health', async () => {
    const client = createMockClient();
    client.get.mockResolvedValueOnce({
      status: 'ok',
      service: 'loopr-api',
    });

    const api = new ProjectsApi(client as never);

    const response = await api.getHealth();

    expect(response).toEqual({
      status: 'ok',
      service: 'loopr-api',
    });
    expect(client.get).toHaveBeenCalledWith('/health');
  });

  it('lists backend projects', async () => {
    const client = createMockClient();
    client.get.mockResolvedValueOnce({
      projects: [],
    });

    const api = new ProjectsApi(client as never);

    const response = await api.listProjects();

    expect(response).toEqual({
      projects: [],
    });
    expect(client.get).toHaveBeenCalledWith('/api/v1/projects');
  });

  it('creates backend projects', async () => {
    const client = createMockClient();
    client.post.mockResolvedValueOnce({
      project: {
        id: 'project-1',
        name: 'Acoustic Idea',
        bpm: 90,
        trackCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const api = new ProjectsApi(client as never);

    const response = await api.createProject({
      name: 'Acoustic Idea',
      bpm: 90,
    });

    expect(response.project.name).toBe('Acoustic Idea');
    expect(client.post).toHaveBeenCalledWith('/api/v1/projects', {
      name: 'Acoustic Idea',
      bpm: 90,
    });
  });
});
