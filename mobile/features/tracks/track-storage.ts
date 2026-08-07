import AsyncStorage from '@react-native-async-storage/async-storage';

import { type LoopTrack, type LoopTrackCloudSyncStatus } from '../../types/track';

const TRACKS_STORAGE_KEY = 'loopr.tracks.v1';

export async function loadTracksFromStorage(): Promise<LoopTrack[]> {
  const rawTracks = await AsyncStorage.getItem(TRACKS_STORAGE_KEY);

  if (!rawTracks) {
    return [];
  }

  try {
    const parsedTracks: unknown = JSON.parse(rawTracks);

    if (!Array.isArray(parsedTracks)) {
      return [];
    }

    return parsedTracks
      .map(normalizeLoopTrack)
      .filter((track): track is LoopTrack => track !== null);
  } catch {
    return [];
  }
}

export async function saveTracksToStorage(tracks: LoopTrack[]) {
  await AsyncStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(tracks));
}

function normalizeLoopTrack(value: unknown): LoopTrack | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !(
      typeof value.id === 'string' &&
      typeof value.projectId === 'string' &&
      typeof value.name === 'string' &&
      (typeof value.localUri === 'string' || value.localUri === null) &&
      typeof value.durationMs === 'number' &&
      Number.isFinite(value.durationMs) &&
      typeof value.volume === 'number' &&
      Number.isFinite(value.volume) &&
      typeof value.muted === 'boolean' &&
      typeof value.solo === 'boolean' &&
      typeof value.orderIndex === 'number' &&
      Number.isFinite(value.orderIndex) &&
      typeof value.createdAt === 'string' &&
      typeof value.updatedAt === 'string'
    )
  ) {
    return null;
  }

  const cloudSyncStatus = normalizeCloudSyncStatus(value.cloudSyncStatus);

  if (!cloudSyncStatus) {
    return null;
  }

  if (
    value.backendTrackId !== undefined &&
    value.backendTrackId !== null &&
    typeof value.backendTrackId !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    projectId: value.projectId,
    name: value.name,
    localUri: value.localUri,
    durationMs: value.durationMs,
    volume: value.volume,
    muted: value.muted,
    solo: value.solo,
    orderIndex: value.orderIndex,
    cloudSyncStatus,
    backendTrackId: value.backendTrackId ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function normalizeCloudSyncStatus(value: unknown): LoopTrackCloudSyncStatus | null {
  if (value === undefined) {
    return 'local-only';
  }

  if (value === 'syncing') {
    return 'sync-failed';
  }

  if (value === 'local-only' || value === 'synced' || value === 'sync-failed') {
    return value;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
