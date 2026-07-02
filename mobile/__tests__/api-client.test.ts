import { getApiBaseUrl, normalizeApiBaseUrl } from '@/config/api';
import { ApiClient } from '@/services/api-client';

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('api config', () => {
  it('uses localhost by default', () => {
    expect(getApiBaseUrl({})).toBe('http://localhost:3001');
  });

  it('uses the configured Expo public API URL', () => {
    expect(
      getApiBaseUrl({
        EXPO_PUBLIC_LOOPR_API_BASE_URL: 'http://192.168.1.10:3001/',
      })
    ).toBe('http://192.168.1.10:3001');
  });

  it('normalizes trailing slashes', () => {
    expect(normalizeApiBaseUrl('http://localhost:3001///')).toBe('http://localhost:3001');
  });
});

describe('ApiClient', () => {
  it('sends GET requests and parses JSON responses', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(
      createJsonResponse({
        status: 'ok',
      })
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetcher,
    });

    const response = await client.get('/health');

    expect(response).toEqual({
      status: 'ok',
    });
    expect(fetcher).toHaveBeenCalledWith('http://localhost:3001/health', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('sends POST requests with JSON bodies', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(
      createJsonResponse({
        project: {
          id: 'project-1',
        },
      })
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001/',
      fetcher,
    });

    await client.post('/api/v1/projects', {
      name: 'Acoustic Idea',
    });

    expect(fetcher).toHaveBeenCalledWith('http://localhost:3001/api/v1/projects', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Acoustic Idea',
      }),
    });
  });

  it('throws an ApiClientError for non-2xx responses', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            code: 'invalid_request',
          },
        },
        {
          status: 400,
        }
      )
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetcher,
    });

    await expect(client.get('/api/v1/projects')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      responseBody: {
        error: {
          code: 'invalid_request',
        },
      },
    });
  });
});
