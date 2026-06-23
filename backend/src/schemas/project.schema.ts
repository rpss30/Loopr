import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  bpm: z.number().int().min(40).max(240).optional(),
});
