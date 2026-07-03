import { ApiClient, apiClient } from './api-client';

export type BackendSession = {
  id: string;
  projectId: string;
  name: string;
  bpm: number;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBackendSessionInput = {
  projectId: string;
  name: string;
  bpm?: number;
};

type ListSessionsResponse = {
  sessions: BackendSession[];
};

type CreateSessionResponse = {
  session: BackendSession;
};

type GetSessionResponse = {
  session: BackendSession;
};

export class SessionsApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  listSessions() {
    return this.client.get<ListSessionsResponse>('/api/v1/sessions');
  }

  createSession(input: CreateBackendSessionInput) {
    return this.client.post<CreateSessionResponse>('/api/v1/sessions', input);
  }

  getSession(sessionId: string) {
    return this.client.get<GetSessionResponse>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`);
  }
}

export const sessionsApi = new SessionsApi();
