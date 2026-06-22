export type LoopSession = {
  id: string;
  projectId: string;
  name: string;
  bpm: number;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionInput = {
  projectId: string;
  name: string;
  bpm?: number;
};
