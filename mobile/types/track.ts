export type LoopTrack = {
  id: string;
  projectId: string;
  name: string;
  localUri: string | null;
  durationMs: number;
  volume: number;
  muted: boolean;
  solo: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};