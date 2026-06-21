import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadTracksFromStorage, saveTracksToStorage } from '@/features/tracks/track-storage';
import { LoopTrack } from '@/types/track';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const TRACKS_STORAGE_KEY = 'loopr.tracks.v1';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

const validTrack: LoopTrack = {
  id: 'track-1',
  projectId: 'project-1',
  name: 'Guitar Layer',
  localUri: 'file:///recording.m4a',
  durationMs: 12000,
  volume: 0.8,
  muted: false,
  solo: false,
  orderIndex: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('track storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when no tracks are stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const tracks = await loadTracksFromStorage();

    expect(tracks).toEqual([]);
    expect(mockGetItem).toHaveBeenCalledWith(TRACKS_STORAGE_KEY);
  });

  it('loads valid tracks from storage', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify([validTrack]));

    const tracks = await loadTracksFromStorage();

    expect(tracks).toEqual([validTrack]);
  });

  it('filters out invalid stored tracks', async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify([
        validTrack,
        {
          id: 'bad-track',
          name: 'Missing fields',
        },
        null,
      ])
    );

    const tracks = await loadTracksFromStorage();

    expect(tracks).toEqual([validTrack]);
  });

  it('returns an empty array when stored data is not an array', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({ tracks: [] }));

    const tracks = await loadTracksFromStorage();

    expect(tracks).toEqual([]);
  });

  it('returns an empty array when stored JSON is corrupt', async () => {
    mockGetItem.mockResolvedValueOnce('{bad json');

    const tracks = await loadTracksFromStorage();

    expect(tracks).toEqual([]);
  });

  it('saves tracks to storage as JSON', async () => {
    mockSetItem.mockResolvedValueOnce();

    await saveTracksToStorage([validTrack]);

    expect(mockSetItem).toHaveBeenCalledWith(TRACKS_STORAGE_KEY, JSON.stringify([validTrack]));
  });
});
