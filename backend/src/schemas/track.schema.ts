import { z } from 'zod';

export const createTrackSchema = z.object({
  projectId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  durationMs: z.number().int().nonnegative(),
  volume: z.number().min(0).max(1).optional(),
  isMuted: z.boolean().optional(),
  s3Bucket: z.string().trim().min(1),
  s3Key: z.string().trim().min(1),
  contentType: z.enum(['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav']),
});
