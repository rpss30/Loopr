export type LoopTrackMetadata = {
  id: string;
  projectId: string;
  sessionId: string;
  name: string;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  s3Bucket: string;
  s3Key: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTrackInput = {
  projectId: string;
  sessionId: string;
  name: string;
  durationMs: number;
  volume?: number;
  isMuted?: boolean;
  s3Bucket: string;
  s3Key: string;
  contentType: string;
};
