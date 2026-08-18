import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS,
  loadOverdubLatencyCompensationMs,
  MAX_OVERDUB_LATENCY_COMPENSATION_MS,
  normalizeOverdubLatencyCompensationMs,
  saveOverdubLatencyCompensationMs,
} from '@/features/looper/latency-compensation-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const LATENCY_COMPENSATION_STORAGE_KEY = 'loopr.overdubLatencyCompensationMs.v1';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

describe('overdub latency compensation storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the default latency compensation when none is stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);

    await expect(loadOverdubLatencyCompensationMs()).resolves.toBe(
      DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS
    );
    expect(mockGetItem).toHaveBeenCalledWith(LATENCY_COMPENSATION_STORAGE_KEY);
  });

  it('loads a stored latency compensation value', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify(175));

    await expect(loadOverdubLatencyCompensationMs()).resolves.toBe(175);
  });

  it('falls back to the default latency compensation for corrupt storage', async () => {
    mockGetItem.mockResolvedValueOnce('{bad json');

    await expect(loadOverdubLatencyCompensationMs()).resolves.toBe(
      DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS
    );
  });

  it('saves normalized latency compensation values', async () => {
    mockSetItem.mockResolvedValueOnce();

    await saveOverdubLatencyCompensationMs(176.7);

    expect(mockSetItem).toHaveBeenCalledWith(LATENCY_COMPENSATION_STORAGE_KEY, JSON.stringify(177));
  });

  it('clamps latency compensation to a bounded range', () => {
    expect(normalizeOverdubLatencyCompensationMs(-25)).toBe(0);
    expect(normalizeOverdubLatencyCompensationMs(MAX_OVERDUB_LATENCY_COMPENSATION_MS + 25)).toBe(
      MAX_OVERDUB_LATENCY_COMPENSATION_MS
    );
    expect(normalizeOverdubLatencyCompensationMs('175')).toBeNull();
  });
});
