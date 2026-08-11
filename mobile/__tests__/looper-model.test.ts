import {
  canAdjustBaseLoop,
  createEmptyLooperState,
  getLayerDurationMs,
  getLayerPhaseOffsetMs,
  getLayerRestartBaseCyclesWithinArrangement,
  reduceLooperState,
  type LooperState,
  type RecordedLayerInput,
} from '@/features/looper/looper-model';
import {
  createLooperStateFromLegacyProjectTracks,
  inferSupportedCycleMultiplier,
} from '@/features/looper/legacy-track-migration';
import { type LoopProject } from '@/types/project';
import { type LoopTrack } from '@/types/track';

const now = '2026-01-01T00:00:00.000Z';

function recordedLayer(id: string, durationMs: number): RecordedLayerInput {
  return {
    id,
    localUri: `file:///${id}.m4a`,
    durationMs,
    createdAt: now,
  };
}

function createPlayingBaseState(durationMs = 4000): LooperState {
  return reduceLooperState(
    reduceLooperState(
      reduceLooperState(createEmptyLooperState({ projectId: 'project-1' }), {
        type: 'RECORD_BASE',
      }),
      {
        type: 'BASE_COUNTDOWN_COMPLETE',
      }
    ),
    {
      type: 'FINISH_BASE',
      layer: recordedLayer('base', durationMs),
    }
  );
}

function recordOverdub(
  state: LooperState,
  input: { id: string; multiplier: 1 | 2 | 4 | 8; startBaseCycleIndex?: number }
) {
  return reduceLooperState(
    reduceLooperState(
      reduceLooperState(
        reduceLooperState(state, {
          type: 'SET_OVERDUB_MULTIPLIER',
          multiplier: input.multiplier,
        }),
        {
          type: 'ARM_OVERDUB',
        }
      ),
      {
        type: 'START_OVERDUB',
        startBaseCycleIndex: input.startBaseCycleIndex ?? 0,
      }
    ),
    {
      type: 'FINISH_OVERDUB',
      layer: recordedLayer(
        input.id,
        getLayerDurationMs(state.baseCycleDurationMs ?? 0, input.multiplier)
      ),
    }
  );
}

describe('looper domain model', () => {
  it('records a base layer after countdown and establishes the arrangement cycle', () => {
    const emptyState = createEmptyLooperState({ projectId: 'project-1' });
    const countInState = reduceLooperState(emptyState, { type: 'RECORD_BASE' });
    const recordingState = reduceLooperState(countInState, { type: 'BASE_COUNTDOWN_COMPLETE' });
    const playingState = reduceLooperState(recordingState, {
      type: 'FINISH_BASE',
      layer: recordedLayer('base', 3998.4),
    });

    expect(countInState.status).toBe('base-count-in');
    expect(recordingState.status).toBe('recording-base');
    expect(playingState.status).toBe('playing');
    expect(playingState.baseCycleDurationMs).toBe(3998);
    expect(playingState.arrangementCycleDurationMs).toBe(3998);
    expect(playingState.baseLayer).toMatchObject({
      id: 'base',
      role: 'base',
      cycleMultiplier: 1,
      phaseStartBaseCycle: 0,
      active: true,
    });
  });

  it('supports immediate base recording when countdown is set to off', () => {
    const state = createEmptyLooperState({
      projectId: 'project-1',
      baseCountdownSeconds: 0,
    });

    expect(reduceLooperState(state, { type: 'RECORD_BASE' }).status).toBe('recording-base');
  });

  it('adjusts base boundaries before overdubs and rejects adjustment after overdubs exist', () => {
    const baseState = createPlayingBaseState(5000);
    const adjustedState = reduceLooperState(baseState, {
      type: 'ADJUST_BASE_LOOP',
      startMs: 250,
      endMs: 4250,
    });
    const withOverdub = recordOverdub(adjustedState, {
      id: 'guitar',
      multiplier: 1,
    });
    const rejectedAdjustment = reduceLooperState(withOverdub, {
      type: 'ADJUST_BASE_LOOP',
      startMs: 500,
      endMs: 3500,
    });

    expect(canAdjustBaseLoop(baseState)).toBe(true);
    expect(adjustedState.baseCycleDurationMs).toBe(4000);
    expect(adjustedState.arrangementCycleDurationMs).toBe(4000);
    expect(canAdjustBaseLoop(withOverdub)).toBe(false);
    expect(rejectedAdjustment.baseCycleDurationMs).toBe(4000);
  });

  it('arms an overdub, starts it after count-in, and commits a variable-length layer', () => {
    const baseState = createPlayingBaseState();
    const armedState = reduceLooperState(
      reduceLooperState(baseState, { type: 'SET_OVERDUB_MULTIPLIER', multiplier: 4 }),
      { type: 'ARM_OVERDUB' }
    );
    const overdubbingState = reduceLooperState(armedState, {
      type: 'START_OVERDUB',
      startBaseCycleIndex: 8,
    });
    const playingState = reduceLooperState(overdubbingState, {
      type: 'FINISH_OVERDUB',
      layer: recordedLayer('vocals', 16020),
    });

    expect(armedState).toMatchObject({
      status: 'overdub-armed',
      armedOverdub: {
        cycleMultiplier: 4,
        countInBaseCycles: 1,
      },
    });
    expect(overdubbingState).toMatchObject({
      status: 'overdubbing',
      activeOverdub: {
        cycleMultiplier: 4,
        expectedDurationMs: 16000,
        startedAtBaseCycle: 8,
      },
    });
    expect(playingState.status).toBe('playing');
    expect(playingState.arrangementCycleDurationMs).toBe(16000);
    expect(playingState.overdubLayers[0]).toMatchObject({
      id: 'vocals',
      cycleMultiplier: 4,
      phaseStartBaseCycle: 8,
      active: true,
    });
  });

  it('repeats shorter layers underneath longer arrangement cycles', () => {
    const state = recordOverdub(
      recordOverdub(createPlayingBaseState(), {
        id: 'bass',
        multiplier: 1,
      }),
      {
        id: 'guitar',
        multiplier: 4,
      }
    );
    const baseLayer = state.baseLayer!;
    const bassLayer = state.overdubLayers[0];
    const guitarLayer = state.overdubLayers[1];

    expect(state.arrangementCycleDurationMs).toBe(16000);
    expect(getLayerRestartBaseCyclesWithinArrangement(baseLayer, 4000, 16000)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(getLayerRestartBaseCyclesWithinArrangement(bassLayer, 4000, 16000)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(getLayerRestartBaseCyclesWithinArrangement(guitarLayer, 4000, 16000)).toEqual([0]);
  });

  it('preserves phase offsets for overdubs started on later base boundaries', () => {
    const state = recordOverdub(createPlayingBaseState(), {
      id: 'guitar',
      multiplier: 4,
      startBaseCycleIndex: 3,
    });
    const guitarLayer = state.overdubLayers[0];

    expect(getLayerPhaseOffsetMs(guitarLayer, 4000)).toBe(12000);
    expect(getLayerRestartBaseCyclesWithinArrangement(guitarLayer, 4000, 16000)).toEqual([3]);
  });

  it('undoes and redoes only overdubs while recalculating arrangement duration', () => {
    const withOneOverdub = recordOverdub(createPlayingBaseState(), {
      id: 'guitar',
      multiplier: 4,
    });
    const undoneState = reduceLooperState(withOneOverdub, { type: 'UNDO' });
    const redoneState = reduceLooperState(undoneState, { type: 'REDO' });

    expect(undoneState.baseLayer?.active).toBe(true);
    expect(undoneState.overdubLayers[0].active).toBe(false);
    expect(undoneState.redoCandidate?.id).toBe('guitar');
    expect(undoneState.arrangementCycleDurationMs).toBe(4000);
    expect(redoneState.overdubLayers[0].active).toBe(true);
    expect(redoneState.redoCandidate).toBeNull();
    expect(redoneState.arrangementCycleDurationMs).toBe(16000);
  });

  it('invalidates redo when a new overdub is recorded', () => {
    const withOneOverdub = recordOverdub(createPlayingBaseState(), {
      id: 'old-guitar',
      multiplier: 4,
    });
    const undoneState = reduceLooperState(withOneOverdub, { type: 'UNDO' });
    const withNewOverdub = recordOverdub(undoneState, {
      id: 'new-guitar',
      multiplier: 2,
    });

    expect(withNewOverdub.redoCandidate).toBeNull();
    expect(withNewOverdub.overdubLayers.map((layer) => layer.id)).toEqual(['new-guitar']);
    expect(withNewOverdub.arrangementCycleDurationMs).toBe(8000);
  });

  it('marks normal stop during overdubbing and discards incomplete overdubs on hard stop', () => {
    const overdubbingState = reduceLooperState(
      reduceLooperState(reduceLooperState(createPlayingBaseState(), { type: 'ARM_OVERDUB' }), {
        type: 'START_OVERDUB',
        startBaseCycleIndex: 0,
      }),
      { type: 'STOP' }
    );
    const stopPendingState = reduceLooperState(overdubbingState, {
      type: 'FINISH_OVERDUB',
      layer: recordedLayer('bass', 4000),
    });
    const hardStoppedState = reduceLooperState(
      reduceLooperState(reduceLooperState(createPlayingBaseState(), { type: 'ARM_OVERDUB' }), {
        type: 'START_OVERDUB',
        startBaseCycleIndex: 0,
      }),
      { type: 'HARD_STOP' }
    );

    expect(overdubbingState.status).toBe('overdubbing');
    expect(overdubbingState.pendingStop).toBe(true);
    expect(stopPendingState.status).toBe('stop-pending');
    expect(stopPendingState.overdubLayers).toHaveLength(1);
    expect(hardStoppedState.status).toBe('stopped');
    expect(hardStoppedState.activeOverdub).toBeNull();
    expect(hardStoppedState.overdubLayers).toHaveLength(0);
  });

  it('clears a stopped loop while preserving countdown preference', () => {
    const stoppedState = reduceLooperState(
      reduceLooperState(
        {
          ...createPlayingBaseState(),
          baseCountdownSeconds: 5,
        },
        { type: 'STOP' }
      ),
      { type: 'FINISH_MUSICAL_STOP' }
    );
    const clearedState = reduceLooperState(stoppedState, { type: 'CLEAR' });

    expect(clearedState).toMatchObject({
      projectId: 'project-1',
      status: 'empty',
      baseCountdownSeconds: 5,
      baseLayer: null,
      overdubLayers: [],
      arrangementCycleDurationMs: null,
    });
  });
});

describe('legacy track migration', () => {
  const project: LoopProject = {
    id: 'project-1',
    name: 'Legacy Loop',
    bpm: 100,
    trackCount: 3,
    loopDurationMs: 12000,
    createdAt: now,
    updatedAt: now,
  };
  const baseTrack: LoopTrack = {
    id: 'track-1',
    projectId: project.id,
    name: 'Base',
    localUri: 'file:///base.m4a',
    durationMs: 4000,
    volume: 1,
    muted: false,
    solo: false,
    orderIndex: 0,
    cloudSyncStatus: 'synced',
    backendTrackId: 'backend-track-1',
    createdAt: now,
    updatedAt: now,
  };

  it('maps the first playable legacy track to base and remaining tracks to overdubs', () => {
    const state = createLooperStateFromLegacyProjectTracks(project, [
      {
        ...baseTrack,
        id: 'track-3',
        name: 'Muted vocal',
        durationMs: 16000,
        muted: true,
        orderIndex: 2,
      },
      baseTrack,
      {
        ...baseTrack,
        id: 'track-2',
        name: 'Guitar',
        durationMs: 8000,
        orderIndex: 1,
      },
    ]);

    expect(state.status).toBe('playing');
    expect(state.baseCycleDurationMs).toBe(4000);
    expect(state.arrangementCycleDurationMs).toBe(8000);
    expect(state.baseLayer).toMatchObject({
      id: 'track-1',
      role: 'base',
      cycleMultiplier: 1,
      active: true,
      backendTrackId: 'backend-track-1',
    });
    expect(state.overdubLayers).toEqual([
      expect.objectContaining({
        id: 'track-2',
        role: 'overdub',
        cycleMultiplier: 2,
        active: true,
      }),
      expect.objectContaining({
        id: 'track-3',
        role: 'overdub',
        cycleMultiplier: 4,
        active: false,
      }),
    ]);
  });

  it('infers only supported power-of-two multipliers from legacy durations', () => {
    expect(inferSupportedCycleMultiplier(3998, 4000)).toBe(1);
    expect(inferSupportedCycleMultiplier(8050, 4000)).toBe(2);
    expect(inferSupportedCycleMultiplier(16080, 4000)).toBe(4);
    expect(inferSupportedCycleMultiplier(32010, 4000)).toBe(8);
    expect(inferSupportedCycleMultiplier(11000, 4000)).toBe(1);
  });
});
