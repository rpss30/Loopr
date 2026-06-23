import { LoopSession } from '../models/session';

export type SessionRepository = {
  listSessions: () => Promise<LoopSession[]>;
  getSessionById: (sessionId: string) => Promise<LoopSession | null>;
  createSession: (session: LoopSession) => Promise<LoopSession>;
  reset: () => Promise<void>;
};
