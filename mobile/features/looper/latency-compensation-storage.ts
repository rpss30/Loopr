import AsyncStorage from '@react-native-async-storage/async-storage';

const LATENCY_COMPENSATION_STORAGE_KEY = 'loopr.overdubLatencyCompensationMs.v1';

export const DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS = 120;
export const MIN_OVERDUB_LATENCY_COMPENSATION_MS = 0;
export const MAX_OVERDUB_LATENCY_COMPENSATION_MS = 500;
export const OVERDUB_LATENCY_COMPENSATION_STEP_MS = 25;

export async function loadOverdubLatencyCompensationMs() {
  const rawValue = await AsyncStorage.getItem(LATENCY_COMPENSATION_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    const normalizedValue = normalizeOverdubLatencyCompensationMs(parsedValue);

    return normalizedValue ?? DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS;
  } catch {
    return DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS;
  }
}

export async function saveOverdubLatencyCompensationMs(value: number) {
  await AsyncStorage.setItem(
    LATENCY_COMPENSATION_STORAGE_KEY,
    JSON.stringify(
      normalizeOverdubLatencyCompensationMs(value) ?? DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS
    )
  );
}

export function normalizeOverdubLatencyCompensationMs(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(
    Math.max(Math.round(value), MIN_OVERDUB_LATENCY_COMPENSATION_MS),
    MAX_OVERDUB_LATENCY_COMPENSATION_MS
  );
}
