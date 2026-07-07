import { BackendSession, SessionsApi, sessionsApi } from './sessions-api';

export const DEFAULT_BACKEND_SESSION_NAME = 'Main Session';

export type EnsureBackendSessionInput = {
  projectId: string;
  projectName: string;
  bpm: number;
};

type SessionsApiLike = Pick<SessionsApi, 'listSessions' | 'createSession'>;

export async function ensureBackendSessionForProject(
  input: EnsureBackendSessionInput,
  api: SessionsApiLike = sessionsApi
): Promise<BackendSession> {
  const response = await api.listSessions();
  const existingSession = response.sessions.find(
    (session) => session.projectId === input.projectId
  );

  if (existingSession) {
    return existingSession;
  }

  const createdSession = await api.createSession({
    projectId: input.projectId,
    name: DEFAULT_BACKEND_SESSION_NAME,
    bpm: input.bpm,
  });

  return createdSession.session;
}
