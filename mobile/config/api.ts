export const DEFAULT_API_BASE_URL = 'http://localhost:5101';

type ApiEnvironment = {
  EXPO_PUBLIC_LOOPR_API_BASE_URL?: string;
};

function getConfiguredApiBaseUrl(environment?: ApiEnvironment) {
  if (environment) {
    return environment.EXPO_PUBLIC_LOOPR_API_BASE_URL;
  }

  return process.env.EXPO_PUBLIC_LOOPR_API_BASE_URL;
}

export function normalizeApiBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(environment?: ApiEnvironment) {
  const configuredBaseUrl = getConfiguredApiBaseUrl(environment)?.trim();

  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  return normalizeApiBaseUrl(configuredBaseUrl);
}

export const API_BASE_URL = getApiBaseUrl();
