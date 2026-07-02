import { randomUUID } from 'crypto';

import { CreateTrackInput, LoopTrackMetadata } from '../models/track';
import { trackRepository } from '../repositories/in-memory-track.repository';
import { TrackRepository } from '../repositories/track.repository';

export class TrackService {
  constructor(private readonly repository: TrackRepository) {}

  listTracks() {
    return this.repository.listTracks();
  }

  getTrackById(trackId: string) {
    return this.repository.getTrackById(trackId);
  }

  async createTrack(input: CreateTrackInput) {
    const now = new Date().toISOString();

    const track: LoopTrackMetadata = {
      id: randomUUID(),
      projectId: input.projectId,
      sessionId: input.sessionId,
      name: input.name,
      durationMs: input.durationMs,
      volume: input.volume ?? 1,
      isMuted: input.isMuted ?? false,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      contentType: input.contentType,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.createTrack(track);
  }

  reset() {
    return this.repository.reset();
  }
}

export const trackService = new TrackService(trackRepository);
