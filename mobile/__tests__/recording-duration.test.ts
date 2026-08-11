import { getSavedRecordingDurationMs } from '@/features/tracks/recording-duration';

describe('saved recording duration', () => {
  it('uses the final recording status when the tracked duration is stale', () => {
    expect(
      getSavedRecordingDurationMs({
        trackedDurationMs: 0,
        statusDurationMs: 7250,
      })
    ).toBe(7250);
  });

  it('uses the largest measured duration', () => {
    expect(
      getSavedRecordingDurationMs({
        trackedDurationMs: 7600,
        statusDurationMs: 7425,
      })
    ).toBe(7600);
  });

  it('falls back to the layer loop limit before using the one second minimum', () => {
    expect(
      getSavedRecordingDurationMs({
        trackedDurationMs: 0,
        fallbackDurationMs: 4000,
      })
    ).toBe(4000);
  });

  it('keeps one second as the minimum saved duration', () => {
    expect(
      getSavedRecordingDurationMs({
        trackedDurationMs: 250,
        statusDurationMs: 300,
      })
    ).toBe(1000);
  });
});
