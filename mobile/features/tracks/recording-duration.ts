type SavedRecordingDurationInput = {
  trackedDurationMs: number;
  statusDurationMs?: number | null;
  fallbackDurationMs?: number | null;
};

export function getSavedRecordingDurationMs(input: SavedRecordingDurationInput) {
  const measuredDurationMs = Math.max(
    ...[input.trackedDurationMs, input.statusDurationMs ?? 0].filter(isPositiveDuration)
  );

  if (Number.isFinite(measuredDurationMs)) {
    return Math.max(Math.round(measuredDurationMs), 1000);
  }

  if (isPositiveDuration(input.fallbackDurationMs)) {
    return Math.max(Math.round(input.fallbackDurationMs), 1000);
  }

  return 1000;
}

function isPositiveDuration(durationMs: number | null | undefined): durationMs is number {
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0;
}
