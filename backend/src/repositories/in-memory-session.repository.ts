import { LoopSession } from '../models/session';
import { SessionRepository } from './session.repository';

export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, LoopSession>();

  async listSessions() {
    return Array.from(this.sessions.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  async getSessionById(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async createSession(session: LoopSession) {
    this.sessions.set(session.id, session);

    return session;
  }

  async reset() {
    this.sessions.clear();
  }
}

export const sessionRepository = new InMemorySessionRepository();
