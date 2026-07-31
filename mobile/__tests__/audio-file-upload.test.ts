import { File } from 'expo-file-system';

import {
  LocalAudioFileUploadError,
  uploadLocalAudioFileToPresignedUrl,
} from '@/services/audio-file-upload';

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

const MockFile = File as unknown as jest.Mock;

describe('uploadLocalAudioFileToPresignedUrl', () => {
  beforeEach(() => {
    MockFile.mockReset();
  });

  it('uploads a local audio file to the presigned URL with PUT', async () => {
    const audioFile = { uri: 'file:///recording.m4a' };
    const uploadFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    MockFile.mockReturnValueOnce(audioFile);

    const result = await uploadLocalAudioFileToPresignedUrl(
      {
        localUri: 'file:///recording.m4a',
        uploadUrl: 'https://example-presigned-url',
        contentType: 'audio/mp4',
      },
      uploadFetch as never
    );

    expect(result.status).toBe(200);
    expect(MockFile).toHaveBeenCalledWith('file:///recording.m4a');
    expect(uploadFetch).toHaveBeenCalledWith('https://example-presigned-url', {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/mp4',
      },
      body: audioFile,
    });
  });

  it('throws a typed error when the presigned upload fails', async () => {
    const uploadFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    MockFile.mockReturnValueOnce({ uri: 'file:///recording.m4a' });

    let error: unknown;

    try {
      await uploadLocalAudioFileToPresignedUrl(
        {
          localUri: 'file:///recording.m4a',
          uploadUrl: 'https://example-presigned-url',
          contentType: 'audio/mp4',
        },
        uploadFetch as never
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(LocalAudioFileUploadError);
    expect(error).toMatchObject({
      name: 'LocalAudioFileUploadError',
      status: 403,
    });
    expect(uploadFetch).toHaveBeenCalledTimes(1);
  });
});
