import { type LoopProject } from '../../types/project';
import { type LoopTrack } from '../../types/track';
import {
  createEmptyLooperState,
  type LoopLayer,
  type LooperState,
  normalizeOverdubMultiplier,
  normalizePositiveDurationMs,
  type OverdubMultiplier,
  SUPPORTED_OVERDUB_MULTIPLIERS,
} from './looper-model';

export function createLooperStateFromLegacyProjectTracks(
  project: LoopProject,
  tracks: LoopTrack[]
): LooperState {
  const emptyState = createEmptyLooperState({
    projectId: project.id,
  });
  const playableTracks = tracks
    .filter((track) => track.projectId === project.id)
    .filter(hasPlayableLocalUri)
    .sort((left, right) => left.orderIndex - right.orderIndex);
  const baseTrack = playableTracks[0];

  if (!baseTrack) {
    return emptyState;
  }

  const baseCycleDurationMs =
    normalizePositiveDurationMs(baseTrack.durationMs) ??
    normalizePositiveDurationMs(project.loopDurationMs);

  if (baseCycleDurationMs === null) {
    return emptyState;
  }

  const baseLayer = toLoopLayer(baseTrack, {
    role: 'base',
    cycleMultiplier: 1,
    active: true,
  });
  const overdubLayers = playableTracks.slice(1).map((track) =>
    toLoopLayer(track, {
      role: 'overdub',
      cycleMultiplier: inferSupportedCycleMultiplier(track.durationMs, baseCycleDurationMs),
      active: !track.muted,
    })
  );
  const longestActiveMultiplier = Math.max(
    1,
    ...overdubLayers.filter((layer) => layer.active).map((layer) => layer.cycleMultiplier)
  );

  return {
    ...emptyState,
    status: 'playing',
    baseLayer,
    baseCycleDurationMs,
    arrangementCycleDurationMs: baseCycleDurationMs * longestActiveMultiplier,
    overdubLayers,
  };
}

export function inferSupportedCycleMultiplier(
  durationMs: number,
  baseCycleDurationMs: number
): OverdubMultiplier {
  const normalizedDurationMs = normalizePositiveDurationMs(durationMs);
  const normalizedBaseCycleDurationMs = normalizePositiveDurationMs(baseCycleDurationMs);

  if (normalizedDurationMs === null || normalizedBaseCycleDurationMs === null) {
    return 1;
  }

  const estimatedRatio = normalizedDurationMs / normalizedBaseCycleDurationMs;
  const nearestMultiplier = SUPPORTED_OVERDUB_MULTIPLIERS.reduce((nearest, multiplier) => {
    return Math.abs(multiplier - estimatedRatio) < Math.abs(nearest - estimatedRatio)
      ? multiplier
      : nearest;
  });
  const tolerance = Math.max(250, normalizedBaseCycleDurationMs * 0.05);

  return Math.abs(nearestMultiplier * normalizedBaseCycleDurationMs - normalizedDurationMs) <=
    tolerance
    ? (normalizeOverdubMultiplier(nearestMultiplier) ?? 1)
    : 1;
}

function hasPlayableLocalUri(track: LoopTrack): track is LoopTrack & { localUri: string } {
  return Boolean(track.localUri && normalizePositiveDurationMs(track.durationMs));
}

function toLoopLayer(
  track: LoopTrack & { localUri: string },
  options: {
    role: LoopLayer['role'];
    cycleMultiplier: OverdubMultiplier;
    active: boolean;
  }
): LoopLayer {
  return {
    id: track.id,
    role: options.role,
    localUri: track.localUri,
    durationMs: Math.round(track.durationMs),
    cycleMultiplier: options.cycleMultiplier,
    phaseStartBaseCycle: 0,
    active: options.active,
    cloudSyncStatus: track.cloudSyncStatus,
    backendTrackId: track.backendTrackId,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  };
}
