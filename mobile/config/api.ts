export const DEFAULT_API_BASE_URL = 'http://localhost:3001';

type ApiEnvironment = {
  EXPO_PUBLIC_LOOPR_API_BASE_URL?: string;
};

function getEnvironment(): ApiEnvironment {
  return process.env as ApiEnvironment;
}

export function normalizeApiBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(environment: ApiEnvironment = getEnvironment()) {
  const configuredBaseUrl = environment.EXPO_PUBLIC_LOOPR_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  return normalizeApiBaseUrl(configuredBaseUrl);
}

export const API_BASE_URL = getApiBaseUrl();
