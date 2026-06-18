import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoopTrack } from '../../types/track';

const TRACKS_STORAGE_KEY = 'loopr.tracks.v1';

export async function loadTracksFromStorage(): Promise<LoopTrack[]> {
  const rawTracks = await AsyncStorage.getItem(TRACKS_STORAGE_KEY);

  if (!rawTracks) {
    return [];
  }

  const parsedTracks: unknown = JSON.parse(rawTracks);

  if (!Array.isArray(parsedTracks)) {
    return [];
  }

  return parsedTracks.filter(isLoopTrack);
}

export async function saveTracksToStorage(tracks: LoopTrack[]) {
  await AsyncStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(tracks));
}

function isLoopTrack(value: unknown): value is LoopTrack {
  if (!isRecord(value)) {
    return false;
  }

  return (
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
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}