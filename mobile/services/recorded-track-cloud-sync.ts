import {
  AudioUploadApi,
  AudioUploadTarget,
  audioUploadApi,
  CreateAudioUploadUrlInput,
} from './audio-upload-api';
import { BackendTrackMetadata, TracksApi, tracksApi } from './tracks-api';

export type PrepareRecordedTrackCloudSyncInput = {
  projectId: string;
  sessionId: string;
  trackId: string;
  name: string;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  contentType?: CreateAudioUploadUrlInput['contentType'];
};

export type PreparedRecordedTrackCloudSync = {
  upload: AudioUploadTarget;
  track: BackendTrackMetadata;
};

type AudioUploadApiLike = Pick<AudioUploadApi, 'createUploadUrl'>;
type TracksApiLike = Pick<TracksApi, 'createTrack'>;

export async function prepareRecordedTrackCloudSync(
  input: PrepareRecordedTrackCloudSyncInput,
  uploadApi: AudioUploadApiLike = audioUploadApi,
  metadataApi: TracksApiLike = tracksApi
): Promise<PreparedRecordedTrackCloudSync> {
  const contentType = input.contentType ?? 'audio/mp4';

  const uploadResponse = await uploadApi.createUploadUrl({
    projectId: input.projectId,
    sessionId: input.sessionId,
    trackId: input.trackId,
    contentType,
  });

  const trackResponse = await metadataApi.createTrack({
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

  return {
    upload: uploadResponse.upload,
    track: trackResponse.track,
  };
}
