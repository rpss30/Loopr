import { SessionsApi } from '@/services/sessions-api';

function createMockClient() {
  return {
    get: jest.fn(),
    post: jest.fn(),
  };
}

describe('SessionsApi', () => {
  it('lists backend sessions', async () => {
    const client = createMockClient();
    client.get.mockResolvedValueOnce({
      sessions: [],
    });

    const api = new SessionsApi(client as never);

    const response = await api.listSessions();

    expect(response).toEqual({
      sessions: [],
    });
    expect(client.get).toHaveBeenCalledWith('/api/v1/sessions');
  });

  it('creates backend sessions', async () => {
    const client = createMockClient();
    client.post.mockResolvedValueOnce({
      session: {
        id: 'session-1',
        projectId: 'project-1',
        name: 'Verse Loop',
        bpm: 90,
        trackCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const api = new SessionsApi(client as never);

    const response = await api.createSession({
      projectId: 'project-1',
      name: 'Verse Loop',
      bpm: 90,
    });

    expect(response.session.name).toBe('Verse Loop');
    expect(client.post).toHaveBeenCalledWith('/api/v1/sessions', {
      projectId: 'project-1',
      name: 'Verse Loop',
      bpm: 90,
    });
  });

  it('gets a backend session by id', async () => {
    const client = createMockClient();
    client.get.mockResolvedValueOnce({
      session: {
        id: 'session/with spaces',
        projectId: 'project-1',
        name: 'Chorus Loop',
        bpm: 110,
        trackCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const api = new SessionsApi(client as never);

    const response = await api.getSession('session/with spaces');

    expect(response.session.name).toBe('Chorus Loop');
    expect(client.get).toHaveBeenCalledWith('/api/v1/sessions/session%2Fwith%20spaces');
  });
});
