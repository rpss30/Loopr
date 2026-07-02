import { LoopTrackMetadata } from '../models/track';
import { TrackRepository } from './track.repository';

export class InMemoryTrackRepository implements TrackRepository {
  private tracks = new Map<string, LoopTrackMetadata>();

  async listTracks() {
    return Array.from(this.tracks.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTrackById(trackId: string) {
    return this.tracks.get(trackId) ?? null;
  }

  async createTrack(track: LoopTrackMetadata) {
    this.tracks.set(track.id, track);

    return track;
  }

  async reset() {
    this.tracks.clear();
  }
}

export const trackRepository = new InMemoryTrackRepository();
