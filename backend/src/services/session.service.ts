import { randomUUID } from 'crypto';

import { CreateSessionInput, LoopSession } from '../models/session';
import { sessionRepository } from '../repositories/in-memory-session.repository';
import { SessionRepository } from '../repositories/session.repository';

export class SessionService {
  constructor(private readonly repository: SessionRepository) {}

  listSessions() {
    return this.repository.listSessions();
  }

  getSessionById(sessionId: string) {
    return this.repository.getSessionById(sessionId);
  }

  async createSession(input: CreateSessionInput) {
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

    return this.repository.createSession(session);
  }

  reset() {
    return this.repository.reset();
  }
}

export const sessionService = new SessionService(sessionRepository);
