import { File } from 'expo-file-system';

export type UploadLocalAudioFileInput = {
  localUri: string;
  uploadUrl: string;
  contentType: string;
  method?: 'PUT';
};

export type UploadLocalAudioFileResult = {
  status: number;
};

export class LocalAudioFileUploadError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'LocalAudioFileUploadError';
  }
}

type UploadFetch = typeof fetch;

export async function uploadLocalAudioFileToPresignedUrl(
  input: UploadLocalAudioFileInput,
  uploadFetch: UploadFetch = fetch
): Promise<UploadLocalAudioFileResult> {
  const audioFile = new File(input.localUri);

  const response = await uploadFetch(input.uploadUrl, {
    method: input.method ?? 'PUT',
    headers: {
      'Content-Type': input.contentType,
    },
    body: audioFile,
  });

  if (!response.ok) {
    throw new LocalAudioFileUploadError(
      `Audio upload failed with status ${response.status}`,
      response.status
    );
  }

  return {
    status: response.status,
  };
}
