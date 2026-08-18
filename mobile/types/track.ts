export type LoopTrackCloudSyncStatus = 'local-only' | 'syncing' | 'synced' | 'sync-failed';

export type LoopTrack = {
  id: string;
  projectId: string;
  name: string;
  localUri: string | null;
  durationMs: number;
  playbackStartOffsetMs?: number;
  volume: number;
  muted: boolean;
  solo: boolean;
  orderIndex: number;
  cloudSyncStatus: LoopTrackCloudSyncStatus;
  backendTrackId: string | null;
  createdAt: string;
  updatedAt: string;
};
