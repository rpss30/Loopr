import { LoopTrackMetadata } from '../models/track';

export type TrackRepository = {
  listTracks: () => Promise<LoopTrackMetadata[]>;
  getTrackById: (trackId: string) => Promise<LoopTrackMetadata | null>;
  createTrack: (track: LoopTrackMetadata) => Promise<LoopTrackMetadata>;
  reset: () => Promise<void>;
};
