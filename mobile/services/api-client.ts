import { API_BASE_URL } from '@/config/api';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type ApiClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

type RequestOptions = {
  body?: unknown;
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? API_BASE_URL).replace(/\/+$/, '');
    this.fetcher = options.fetcher ?? fetch;
  }

  get<TResponse>(path: string) {
    return this.request<TResponse>('GET', path);
  }

  post<TResponse>(path: string, body: unknown) {
    return this.request<TResponse>('POST', path, {
      body,
    });
  }

  private async request<TResponse>(
    method: 'GET' | 'POST',
    path: string,
    options: RequestOptions = {}
  ) {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new ApiClientError(
        `Loopr API request failed with status ${response.status}.`,
        response.status,
        responseBody
      );
    }

    return responseBody as TResponse;
  }
}

async function parseResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

export const apiClient = new ApiClient();
