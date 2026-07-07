import {
  DEFAULT_BACKEND_SESSION_NAME,
  ensureBackendSessionForProject,
} from '@/services/project-session-sync';

function createMockSessionsApi() {
  return {
    listSessions: jest.fn(),
    createSession: jest.fn(),
  };
}

describe('ensureBackendSessionForProject', () => {
  it('returns an existing backend session for the project', async () => {
    const api = createMockSessionsApi();
    const existingSession = {
      id: 'session-1',
      projectId: 'project-1',
      name: 'Existing Session',
      bpm: 90,
      trackCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    api.listSessions.mockResolvedValueOnce({
      sessions: [
        {
          ...existingSession,
          id: 'other-session',
          projectId: 'other-project',
        },
        existingSession,
      ],
    });

    const session = await ensureBackendSessionForProject(
      {
        projectId: 'project-1',
        projectName: 'Acoustic Project',
        bpm: 90,
      },
      api
    );

    expect(session).toEqual(existingSession);
    expect(api.createSession).not.toHaveBeenCalled();
  });

  it('creates a default backend session when none exists for the project', async () => {
    const api = createMockSessionsApi();
    const createdSession = {
      id: 'session-1',
      projectId: 'project-1',
      name: DEFAULT_BACKEND_SESSION_NAME,
      bpm: 90,
      trackCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    api.listSessions.mockResolvedValueOnce({
      sessions: [],
    });
    api.createSession.mockResolvedValueOnce({
      session: createdSession,
    });

    const session = await ensureBackendSessionForProject(
      {
        projectId: 'project-1',
        projectName: 'Acoustic Project',
        bpm: 90,
      },
      api
    );

    expect(session).toEqual(createdSession);
    expect(api.createSession).toHaveBeenCalledWith({
      projectId: 'project-1',
      name: DEFAULT_BACKEND_SESSION_NAME,
      bpm: 90,
    });
  });
});
