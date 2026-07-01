export const DEFAULT_TRACK_AUDIO_EXTENSION = 'm4a';

export type TrackAudioObjectKeyInput = {
  projectId: string;
  sessionId: string;
  trackId: string;
  extension?: string;
};

export function buildTrackAudioObjectKey(input: TrackAudioObjectKeyInput) {
  const extension = normalizeAudioExtension(input.extension ?? DEFAULT_TRACK_AUDIO_EXTENSION);

  return [
    'projects',
    encodeS3KeySegment(input.projectId),
    'sessions',
    encodeS3KeySegment(input.sessionId),
    'tracks',
    `${encodeS3KeySegment(input.trackId)}.${extension}`,
  ].join('/');
}

export function buildTrackAudioObjectPrefix(projectId: string, sessionId: string) {
  return [
    'projects',
    encodeS3KeySegment(projectId),
    'sessions',
    encodeS3KeySegment(sessionId),
    'tracks',
  ].join('/');
}

function encodeS3KeySegment(segment: string) {
  const trimmedSegment = segment.trim();

  if (!trimmedSegment) {
    throw new Error('S3 object key segments must not be empty.');
  }

  return encodeURIComponent(trimmedSegment);
}

function normalizeAudioExtension(extension: string) {
  const normalizedExtension = extension.trim().replace(/^\./, '').toLowerCase();

  if (!/^[a-z0-9]+$/.test(normalizedExtension)) {
    throw new Error('Audio file extension must be alphanumeric.');
  }

  return normalizedExtension;
}
