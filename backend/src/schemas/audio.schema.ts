import { z } from 'zod';

export const createAudioUploadUrlSchema = z.object({
  projectId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  trackId: z.string().trim().min(1),
  contentType: z.enum(['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav']),
});
