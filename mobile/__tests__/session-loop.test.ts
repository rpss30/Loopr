import {
  getBaseLoopDurationMs,
  getLayerRecordingLimitMs,
  getSessionLoopDurationMs,
  isBaseLoopTrack,
} from '@/features/tracks/session-loop';
import { LoopTrack } from '@/types/track';

const recordedTrack: LoopTrack = {
  id: 'track-1',
  projectId: 'project-1',
  name: 'Guitar Layer',
  localUri: 'file:///recording.m4a',
  durationMs: 3998.4,
  volume: 0.8,
  muted: false,
  solo: false,
  orderIndex: 0,
  cloudSyncStatus: 'local-only',
  backendTrackId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('session loop duration', () => {
  it('uses the project loop duration when there is no recorded track', () => {
    expect(getSessionLoopDurationMs(8000.4, [{ ...recordedTrack, localUri: null }])).toBe(8000);
  });

  it('uses the first recorded track before stale project loop metadata', () => {
    expect(getSessionLoopDurationMs(13000, [recordedTrack])).toBe(3998);
  });

  it('falls back to the first recorded track for older saved projects', () => {
    expect(getSessionLoopDurationMs(null, [recordedTrack])).toBe(3998);
  });

  it('returns null when there is no recorded layer to define the loop', () => {
    expect(getSessionLoopDurationMs(null, [{ ...recordedTrack, localUri: null }])).toBeNull();
  });

  it('limits layer recordings when a playable layer already exists', () => {
    expect(getLayerRecordingLimitMs(4000.4, 1)).toBe(4000);
  });

  it('does not limit the first layer recording', () => {
    expect(getLayerRecordingLimitMs(4000, 0)).toBeNull();
  });

  it('finds the base loop duration from track order', () => {
    expect(
      getBaseLoopDurationMs([
        { ...recordedTrack, id: 'track-2', orderIndex: 1, durationMs: 11000 },
        recordedTrack,
      ])
    ).toBe(3998);
  });

  it('identifies the base loop track from track order', () => {
    expect(
      isBaseLoopTrack(
        [{ ...recordedTrack, id: 'track-2', orderIndex: 1, durationMs: 11000 }, recordedTrack],
        recordedTrack.id
      )
    ).toBe(true);
  });
});
