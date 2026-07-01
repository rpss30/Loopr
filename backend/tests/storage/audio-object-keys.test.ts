import { describe, expect, it } from 'vitest';

import {
  buildTrackAudioObjectKey,
  buildTrackAudioObjectPrefix,
} from '../../src/storage/audio-object-keys';

describe('audio object keys', () => {
  it('builds the default track audio object key', () => {
    expect(
      buildTrackAudioObjectKey({
        projectId: 'project-1',
        sessionId: 'session-1',
        trackId: 'track-1',
      })
    ).toBe('projects/project-1/sessions/session-1/tracks/track-1.m4a');
  });

  it('supports custom audio extensions', () => {
    expect(
      buildTrackAudioObjectKey({
        projectId: 'project-1',
        sessionId: 'session-1',
        trackId: 'track-1',
        extension: '.wav',
      })
    ).toBe('projects/project-1/sessions/session-1/tracks/track-1.wav');
  });

  it('builds a project session track prefix', () => {
    expect(buildTrackAudioObjectPrefix('project-1', 'session-1')).toBe(
      'projects/project-1/sessions/session-1/tracks'
    );
  });

  it('trims and URL-encodes key segments', () => {
    expect(
      buildTrackAudioObjectKey({
        projectId: ' project 1 ',
        sessionId: 'session/1',
        trackId: 'track 1',
      })
    ).toBe('projects/project%201/sessions/session%2F1/tracks/track%201.m4a');
  });

  it('rejects empty key segments', () => {
    expect(() =>
      buildTrackAudioObjectKey({
        projectId: '',
        sessionId: 'session-1',
        trackId: 'track-1',
      })
    ).toThrow('S3 object key segments must not be empty.');
  });

  it('rejects invalid audio extensions', () => {
    expect(() =>
      buildTrackAudioObjectKey({
        projectId: 'project-1',
        sessionId: 'session-1',
        trackId: 'track-1',
        extension: '../m4a',
      })
    ).toThrow('Audio file extension must be alphanumeric.');
  });
});
