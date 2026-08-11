import { LoopTrack } from '../../types/track';

export function getSessionLoopDurationMs(
  projectLoopDurationMs: number | null,
  tracks: LoopTrack[]
) {
  if (isPositiveDuration(projectLoopDurationMs)) {
    return Math.round(projectLoopDurationMs);
  }

  const firstRecordedTrack = tracks.find(
    (track) => track.localUri && isPositiveDuration(track.durationMs)
  );

  return firstRecordedTrack ? Math.round(firstRecordedTrack.durationMs) : null;
}

function isPositiveDuration(durationMs: number | null | undefined): durationMs is number {
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0;
}
