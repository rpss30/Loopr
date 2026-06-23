import { randomUUID } from 'crypto';

import { CreateSessionInput, LoopSession } from '../models/session';

export class SessionService {
  private sessions = new Map<string, LoopSession>();

  listSessions() {
    return Array.from(this.sessions.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  getSessionById(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  createSession(input: CreateSessionInput) {
    const now = new Date().toISOString();

    const session: LoopSession = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      bpm: input.bpm ?? 120,
      trackCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);

    return session;
  }

  reset() {
    this.sessions.clear();
  }
}

export const sessionService = new SessionService();
