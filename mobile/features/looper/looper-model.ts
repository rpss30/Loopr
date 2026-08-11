export const SUPPORTED_OVERDUB_MULTIPLIERS = [1, 2, 4, 8] as const;
export const DEFAULT_OVERDUB_MULTIPLIER: OverdubMultiplier = 1;
export const DEFAULT_BASE_COUNTDOWN_SECONDS = 3;
export const MIN_BASE_COUNTDOWN_SECONDS = 0;
export const MAX_BASE_COUNTDOWN_SECONDS = 30;
export const DEFAULT_OVERDUB_COUNT_IN_BASE_CYCLES = 1;

export type OverdubMultiplier = (typeof SUPPORTED_OVERDUB_MULTIPLIERS)[number];

export type LooperStatus =
  | 'empty'
  | 'base-count-in'
  | 'recording-base'
  | 'playing'
  | 'overdub-armed'
  | 'overdubbing'
  | 'stop-pending'
  | 'stopped';

export type LoopLayerRole = 'base' | 'overdub';

export type LoopLayerCloudSyncStatus = 'local-only' | 'syncing' | 'synced' | 'sync-failed';

export type LoopLayer = {
  id: string;
  role: LoopLayerRole;
  localUri: string;
  durationMs: number;
  cycleMultiplier: OverdubMultiplier;
  phaseStartBaseCycle: number;
  active: boolean;
  cloudSyncStatus: LoopLayerCloudSyncStatus;
  backendTrackId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BaseLoopAdjustment = {
  startMs: number;
  endMs: number;
};

export type ArmedOverdub = {
  cycleMultiplier: OverdubMultiplier;
  countInBaseCycles: number;
};

export type ActiveOverdub = {
  cycleMultiplier: OverdubMultiplier;
  expectedDurationMs: number;
  startedAtBaseCycle: number;
};

export type LooperState = {
  projectId: string;
  status: LooperStatus;
  baseCountdownSeconds: number;
  selectedOverdubMultiplier: OverdubMultiplier;
  baseLayer: LoopLayer | null;
  baseCycleDurationMs: number | null;
  baseAdjustment: BaseLoopAdjustment | null;
  arrangementCycleDurationMs: number | null;
  overdubLayers: LoopLayer[];
  redoCandidate: LoopLayer | null;
  armedOverdub: ArmedOverdub | null;
  activeOverdub: ActiveOverdub | null;
  pendingStop: boolean;
  error: string | null;
};

export type RecordedLayerInput = {
  id: string;
  localUri: string;
  durationMs: number;
  createdAt: string;
  updatedAt?: string;
  cloudSyncStatus?: LoopLayerCloudSyncStatus;
  backendTrackId?: string | null;
};

export type CreateEmptyLooperStateInput = {
  projectId: string;
  baseCountdownSeconds?: number;
  selectedOverdubMultiplier?: OverdubMultiplier;
};

export type LooperAction =
  | { type: 'SET_BASE_COUNTDOWN_SECONDS'; seconds: number }
  | { type: 'SET_OVERDUB_MULTIPLIER'; multiplier: number }
  | { type: 'RECORD_BASE' }
  | { type: 'BASE_COUNTDOWN_COMPLETE' }
  | { type: 'FINISH_BASE'; layer: RecordedLayerInput }
  | { type: 'ARM_OVERDUB' }
  | { type: 'CANCEL_OVERDUB' }
  | { type: 'START_OVERDUB'; startBaseCycleIndex: number }
  | { type: 'FINISH_OVERDUB'; layer: RecordedLayerInput }
  | { type: 'OVERDUB_FAILED'; message?: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'STOP' }
  | { type: 'FINISH_MUSICAL_STOP' }
  | { type: 'HARD_STOP' }
  | { type: 'CLEAR' }
  | { type: 'ADJUST_BASE_LOOP'; startMs: number; endMs: number };

export function createEmptyLooperState(input: CreateEmptyLooperStateInput): LooperState {
  return {
    projectId: input.projectId,
    status: 'empty',
    baseCountdownSeconds:
      normalizeBaseCountdownSeconds(input.baseCountdownSeconds) ?? DEFAULT_BASE_COUNTDOWN_SECONDS,
    selectedOverdubMultiplier: input.selectedOverdubMultiplier ?? DEFAULT_OVERDUB_MULTIPLIER,
    baseLayer: null,
    baseCycleDurationMs: null,
    baseAdjustment: null,
    arrangementCycleDurationMs: null,
    overdubLayers: [],
    redoCandidate: null,
    armedOverdub: null,
    activeOverdub: null,
    pendingStop: false,
    error: null,
  };
}

export function reduceLooperState(state: LooperState, action: LooperAction): LooperState {
  switch (action.type) {
    case 'SET_BASE_COUNTDOWN_SECONDS': {
      const baseCountdownSeconds = normalizeBaseCountdownSeconds(action.seconds);

      return baseCountdownSeconds === null
        ? state
        : {
            ...state,
            baseCountdownSeconds,
            error: null,
          };
    }

    case 'SET_OVERDUB_MULTIPLIER': {
      const selectedOverdubMultiplier = normalizeOverdubMultiplier(action.multiplier);

      return selectedOverdubMultiplier === null
        ? state
        : {
            ...state,
            selectedOverdubMultiplier,
            error: null,
          };
    }

    case 'RECORD_BASE':
      if (state.status !== 'empty') {
        return state;
      }

      return {
        ...state,
        status: state.baseCountdownSeconds === 0 ? 'recording-base' : 'base-count-in',
        error: null,
      };

    case 'BASE_COUNTDOWN_COMPLETE':
      return state.status === 'base-count-in'
        ? {
            ...state,
            status: 'recording-base',
            error: null,
          }
        : state;

    case 'FINISH_BASE': {
      if (state.status !== 'recording-base') {
        return state;
      }

      const durationMs = normalizePositiveDurationMs(action.layer.durationMs);

      if (durationMs === null) {
        return state;
      }

      const baseLayer = toLoopLayer(action.layer, {
        role: 'base',
        cycleMultiplier: 1,
        phaseStartBaseCycle: 0,
        active: true,
      });

      return recalculateArrangement({
        ...state,
        status: 'playing',
        baseLayer,
        baseCycleDurationMs: durationMs,
        baseAdjustment: null,
        overdubLayers: [],
        redoCandidate: null,
        armedOverdub: null,
        activeOverdub: null,
        pendingStop: false,
        error: null,
      });
    }

    case 'ARM_OVERDUB':
      if (state.status !== 'playing' || !state.baseLayer || !state.baseCycleDurationMs) {
        return state;
      }

      return {
        ...state,
        status: 'overdub-armed',
        armedOverdub: {
          cycleMultiplier: state.selectedOverdubMultiplier,
          countInBaseCycles: DEFAULT_OVERDUB_COUNT_IN_BASE_CYCLES,
        },
        error: null,
      };

    case 'CANCEL_OVERDUB':
      return state.status === 'overdub-armed'
        ? {
            ...state,
            status: 'playing',
            armedOverdub: null,
            error: null,
          }
        : state;

    case 'START_OVERDUB': {
      if (state.status !== 'overdub-armed' || !state.armedOverdub || !state.baseCycleDurationMs) {
        return state;
      }

      const startBaseCycleIndex = normalizeBaseCycleIndex(action.startBaseCycleIndex);

      if (startBaseCycleIndex === null) {
        return state;
      }

      return {
        ...state,
        status: 'overdubbing',
        armedOverdub: null,
        activeOverdub: {
          cycleMultiplier: state.armedOverdub.cycleMultiplier,
          expectedDurationMs: getLayerDurationMs(
            state.baseCycleDurationMs,
            state.armedOverdub.cycleMultiplier
          ),
          startedAtBaseCycle: startBaseCycleIndex,
        },
        error: null,
      };
    }

    case 'FINISH_OVERDUB': {
      if (state.status !== 'overdubbing' || !state.activeOverdub) {
        return state;
      }

      const measuredDurationMs = normalizePositiveDurationMs(action.layer.durationMs);
      const overdubLayer = toLoopLayer(
        {
          ...action.layer,
          durationMs: measuredDurationMs ?? state.activeOverdub.expectedDurationMs,
        },
        {
          role: 'overdub',
          cycleMultiplier: state.activeOverdub.cycleMultiplier,
          phaseStartBaseCycle: state.activeOverdub.startedAtBaseCycle,
          active: true,
        }
      );
      const overdubLayers = discardRedoLayer(state.overdubLayers, state.redoCandidate).concat(
        overdubLayer
      );

      return recalculateArrangement({
        ...state,
        status: state.pendingStop ? 'stop-pending' : 'playing',
        overdubLayers,
        redoCandidate: null,
        activeOverdub: null,
        pendingStop: false,
        error: null,
      });
    }

    case 'OVERDUB_FAILED':
      if (state.status !== 'overdubbing') {
        return state;
      }

      return {
        ...state,
        status: state.pendingStop ? 'stop-pending' : 'playing',
        activeOverdub: null,
        pendingStop: false,
        error: action.message ?? 'Overdub failed.',
      };

    case 'UNDO': {
      if (state.status !== 'playing') {
        return state;
      }

      const undoableLayer = findLatestActiveOverdub(state.overdubLayers);

      if (!undoableLayer) {
        return state;
      }

      return recalculateArrangement({
        ...state,
        overdubLayers: state.overdubLayers.map((layer) =>
          layer.id === undoableLayer.id ? { ...layer, active: false } : layer
        ),
        redoCandidate: undoableLayer,
        error: null,
      });
    }

    case 'REDO':
      if (state.status !== 'playing' || !state.redoCandidate) {
        return state;
      }

      return recalculateArrangement({
        ...state,
        overdubLayers: state.overdubLayers.map((layer) =>
          layer.id === state.redoCandidate?.id ? { ...layer, active: true } : layer
        ),
        redoCandidate: null,
        error: null,
      });

    case 'STOP':
      if (state.status === 'playing' || state.status === 'overdub-armed') {
        return {
          ...state,
          status: 'stop-pending',
          armedOverdub: null,
          pendingStop: false,
          error: null,
        };
      }

      if (state.status === 'overdubbing') {
        return {
          ...state,
          pendingStop: true,
          error: null,
        };
      }

      return state;

    case 'FINISH_MUSICAL_STOP':
      return state.status === 'stop-pending'
        ? {
            ...state,
            status: 'stopped',
            pendingStop: false,
            error: null,
          }
        : state;

    case 'HARD_STOP':
      if (
        state.status !== 'playing' &&
        state.status !== 'overdub-armed' &&
        state.status !== 'overdubbing' &&
        state.status !== 'stop-pending'
      ) {
        return state;
      }

      return {
        ...state,
        status: 'stopped',
        armedOverdub: null,
        activeOverdub: null,
        pendingStop: false,
        error: null,
      };

    case 'CLEAR':
      return state.status === 'stopped'
        ? createEmptyLooperState({
            projectId: state.projectId,
            baseCountdownSeconds: state.baseCountdownSeconds,
          })
        : state;

    case 'ADJUST_BASE_LOOP': {
      if (!canAdjustBaseLoop(state) || !state.baseLayer) {
        return state;
      }

      const adjustment = normalizeBaseLoopAdjustment(action, state.baseLayer.durationMs);

      if (!adjustment) {
        return state;
      }

      return recalculateArrangement({
        ...state,
        baseAdjustment: adjustment,
        baseCycleDurationMs: adjustment.endMs - adjustment.startMs,
        error: null,
      });
    }
  }
}

export function canAdjustBaseLoop(state: LooperState) {
  return (
    Boolean(state.baseLayer) &&
    (state.status === 'playing' || state.status === 'stopped') &&
    state.overdubLayers.length === 0 &&
    state.activeOverdub === null &&
    state.armedOverdub === null
  );
}

export function getLayerDurationMs(baseCycleDurationMs: number, multiplier: OverdubMultiplier) {
  return Math.round(baseCycleDurationMs * multiplier);
}

export function calculateArrangementCycleDurationMs(
  baseCycleDurationMs: number | null,
  overdubLayers: LoopLayer[]
) {
  const normalizedBaseDurationMs = normalizePositiveDurationMs(baseCycleDurationMs);

  if (normalizedBaseDurationMs === null) {
    return null;
  }

  const longestMultiplier = Math.max(
    1,
    ...overdubLayers.filter((layer) => layer.active).map((layer) => layer.cycleMultiplier)
  ) as OverdubMultiplier;

  return getLayerDurationMs(normalizedBaseDurationMs, longestMultiplier);
}

export function getActiveLoopLayers(state: LooperState) {
  return [state.baseLayer, ...state.overdubLayers].filter((layer): layer is LoopLayer =>
    Boolean(layer?.active)
  );
}

export function shouldLayerRestartAtBaseCycle(layer: LoopLayer, baseCycleIndex: number) {
  if (!layer.active) {
    return false;
  }

  const normalizedBaseCycleIndex = normalizeBaseCycleIndex(baseCycleIndex);

  if (normalizedBaseCycleIndex === null) {
    return false;
  }

  return modulo(normalizedBaseCycleIndex - layer.phaseStartBaseCycle, layer.cycleMultiplier) === 0;
}

export function getLayerRestartBaseCyclesWithinArrangement(
  layer: LoopLayer,
  baseCycleDurationMs: number,
  arrangementCycleDurationMs: number
) {
  const normalizedBaseDurationMs = normalizePositiveDurationMs(baseCycleDurationMs);
  const normalizedArrangementDurationMs = normalizePositiveDurationMs(arrangementCycleDurationMs);

  if (normalizedBaseDurationMs === null || normalizedArrangementDurationMs === null) {
    return [];
  }

  const arrangementBaseCycles = Math.max(
    1,
    Math.round(normalizedArrangementDurationMs / normalizedBaseDurationMs)
  );
  const restartCycles: number[] = [];

  for (let baseCycleIndex = 0; baseCycleIndex < arrangementBaseCycles; baseCycleIndex += 1) {
    if (shouldLayerRestartAtBaseCycle(layer, baseCycleIndex)) {
      restartCycles.push(baseCycleIndex);
    }
  }

  return restartCycles;
}

export function getLayerPhaseOffsetMs(layer: LoopLayer, baseCycleDurationMs: number) {
  const normalizedBaseDurationMs = normalizePositiveDurationMs(baseCycleDurationMs);

  if (normalizedBaseDurationMs === null) {
    return 0;
  }

  return modulo(layer.phaseStartBaseCycle, layer.cycleMultiplier) * normalizedBaseDurationMs;
}

export function normalizeOverdubMultiplier(value: number): OverdubMultiplier | null {
  return SUPPORTED_OVERDUB_MULTIPLIERS.includes(value as OverdubMultiplier)
    ? (value as OverdubMultiplier)
    : null;
}

export function normalizeBaseCountdownSeconds(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const seconds = Math.round(value);

  if (seconds < MIN_BASE_COUNTDOWN_SECONDS || seconds > MAX_BASE_COUNTDOWN_SECONDS) {
    return null;
  }

  return seconds;
}

export function normalizePositiveDurationMs(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function recalculateArrangement(state: LooperState): LooperState {
  return {
    ...state,
    arrangementCycleDurationMs: calculateArrangementCycleDurationMs(
      state.baseCycleDurationMs,
      state.overdubLayers
    ),
  };
}

function toLoopLayer(
  input: RecordedLayerInput,
  options: {
    role: LoopLayerRole;
    cycleMultiplier: OverdubMultiplier;
    phaseStartBaseCycle: number;
    active: boolean;
  }
): LoopLayer {
  return {
    id: input.id,
    role: options.role,
    localUri: input.localUri,
    durationMs: Math.round(input.durationMs),
    cycleMultiplier: options.cycleMultiplier,
    phaseStartBaseCycle: options.phaseStartBaseCycle,
    active: options.active,
    cloudSyncStatus: input.cloudSyncStatus ?? 'local-only',
    backendTrackId: input.backendTrackId ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
  };
}

function discardRedoLayer(overdubLayers: LoopLayer[], redoCandidate: LoopLayer | null) {
  if (!redoCandidate) {
    return overdubLayers;
  }

  return overdubLayers.filter((layer) => layer.id !== redoCandidate.id);
}

function findLatestActiveOverdub(overdubLayers: LoopLayer[]) {
  return [...overdubLayers].reverse().find((layer) => layer.active);
}

function normalizeBaseCycleIndex(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizeBaseLoopAdjustment(
  input: { startMs: number; endMs: number },
  rawBaseDurationMs: number
): BaseLoopAdjustment | null {
  const startMs = normalizeNonNegativeDurationMs(input.startMs);
  const endMs = normalizeNonNegativeDurationMs(input.endMs);
  const normalizedRawBaseDurationMs = normalizePositiveDurationMs(rawBaseDurationMs);

  if (
    startMs === null ||
    endMs === null ||
    normalizedRawBaseDurationMs === null ||
    startMs >= endMs ||
    endMs > normalizedRawBaseDurationMs
  ) {
    return null;
  }

  return {
    startMs,
    endMs,
  };
}

function normalizeNonNegativeDurationMs(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function modulo(dividend: number, divisor: number) {
  return ((dividend % divisor) + divisor) % divisor;
}
