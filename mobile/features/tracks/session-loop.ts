import { LoopTrack } from '../../types/track';

export function getSessionLoopDurationMs(
  projectLoopDurationMs: number | null,
  tracks: LoopTrack[]
) {
  return getBaseLoopDurationMs(tracks) ?? normalizeDurationMs(projectLoopDurationMs);
}

export function getBaseLoopDurationMs(tracks: LoopTrack[]) {
  return normalizeDurationMs(getBaseLoopTrack(tracks)?.durationMs);
}

export function getLayerRecordingLimitMs(
  sessionLoopDurationMs: number | null,
  playableLayerCount: number
) {
  if (!isPositiveDuration(sessionLoopDurationMs) || playableLayerCount <= 0) {
    return null;
  }

  return Math.round(sessionLoopDurationMs);
}

export function isBaseLoopTrack(tracks: LoopTrack[], trackId: string) {
  return getBaseLoopTrack(tracks)?.id === trackId;
}

function getBaseLoopTrack(tracks: LoopTrack[]) {
  return [...tracks]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .find((track) => track.localUri && isPositiveDuration(track.durationMs));
}

function normalizeDurationMs(durationMs: number | null | undefined) {
  return isPositiveDuration(durationMs) ? Math.round(durationMs) : null;
}

function isPositiveDuration(durationMs: number | null | undefined): durationMs is number {
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0;
}
