import {
  AudioUploadApi,
  AudioUploadTarget,
  audioUploadApi,
  CreateAudioUploadUrlInput,
} from './audio-upload-api';
import {
  uploadLocalAudioFileToPresignedUrl,
  UploadLocalAudioFileInput,
  UploadLocalAudioFileResult,
} from './audio-file-upload';
import { type LoopTrackCloudSyncStatus } from '../types/track';
import { BackendTrackMetadata, TracksApi, tracksApi } from './tracks-api';

export type SyncRecordedTrackCloudInput = {
  projectId: string;
  sessionId: string | null;
  trackId: string;
  localUri: string;
  name: string;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  contentType?: CreateAudioUploadUrlInput['contentType'];
};

export type SyncedRecordedTrackCloudSync = {
  status: 'synced';
  upload: AudioUploadTarget;
  uploadResult: UploadLocalAudioFileResult;
  track: BackendTrackMetadata;
};

export type SkippedRecordedTrackCloudSync = {
  status: 'skipped';
  reason: 'missing-backend-session';
};

export type FailedRecordedTrackCloudSync = {
  status: 'failed';
  reason: 'create-upload-url-failed' | 'audio-upload-failed' | 'create-track-metadata-failed';
  error: unknown;
};

export type RecordedTrackCloudSyncResult =
  | SyncedRecordedTrackCloudSync
  | SkippedRecordedTrackCloudSync
  | FailedRecordedTrackCloudSync;

export function getTrackCloudSyncStatusForResult(
  result: RecordedTrackCloudSyncResult
): LoopTrackCloudSyncStatus {
  if (result.status === 'synced') {
    return 'synced';
  }

  if (result.status === 'skipped') {
    return 'local-only';
  }

  return 'sync-failed';
}

type AudioUploadApiLike = Pick<AudioUploadApi, 'createUploadUrl'>;
type TracksApiLike = Pick<TracksApi, 'createTrack'>;
type LocalAudioFileUploader = (
  input: UploadLocalAudioFileInput
) => Promise<UploadLocalAudioFileResult>;

export async function syncRecordedTrackToCloud(
  input: SyncRecordedTrackCloudInput,
  uploadApi: AudioUploadApiLike = audioUploadApi,
  metadataApi: TracksApiLike = tracksApi,
  uploadAudioFile: LocalAudioFileUploader = uploadLocalAudioFileToPresignedUrl
): Promise<RecordedTrackCloudSyncResult> {
  if (!input.sessionId) {
    return {
      status: 'skipped',
      reason: 'missing-backend-session',
    };
  }

  const contentType = input.contentType ?? 'audio/mp4';

  let uploadResponse;

  try {
    uploadResponse = await uploadApi.createUploadUrl({
      projectId: input.projectId,
      sessionId: input.sessionId,
      trackId: input.trackId,
      contentType,
    });
  } catch (error) {
    return {
      status: 'failed',
      reason: 'create-upload-url-failed',
      error,
    };
  }

  let uploadResult;

  try {
    uploadResult = await uploadAudioFile({
      localUri: input.localUri,
      uploadUrl: uploadResponse.upload.uploadUrl,
      method: uploadResponse.upload.method,
      contentType,
    });
  } catch (error) {
    return {
      status: 'failed',
      reason: 'audio-upload-failed',
      error,
    };
  }

  let trackResponse;

  try {
    trackResponse = await metadataApi.createTrack({
      projectId: input.projectId,
      sessionId: input.sessionId,
      name: input.name,
      durationMs: input.durationMs,
      volume: input.volume,
      isMuted: input.isMuted,
      s3Bucket: uploadResponse.upload.s3Bucket,
      s3Key: uploadResponse.upload.s3Key,
      contentType,
    });
  } catch (error) {
    return {
      status: 'failed',
      reason: 'create-track-metadata-failed',
      error,
    };
  }

  return {
    status: 'synced',
    upload: uploadResponse.upload,
    uploadResult,
    track: trackResponse.track,
  };
}
