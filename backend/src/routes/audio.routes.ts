import { Router } from 'express';

import { env } from '../config/env';
import { validateBody } from '../middleware/validate-body';
import { createAudioUploadUrlSchema } from '../schemas/audio.schema';
import { buildTrackAudioObjectKey } from '../storage/audio-object-keys';

type CreateAudioUploadUrlInput = {
  projectId: string;
  sessionId: string;
  trackId: string;
  contentType: string;
};

export const audioRouter = Router();

audioRouter.post('/upload-url', validateBody(createAudioUploadUrlSchema), (request, response) => {
  const input = request.body as CreateAudioUploadUrlInput;

  const s3Key = buildTrackAudioObjectKey({
    projectId: input.projectId,
    sessionId: input.sessionId,
    trackId: input.trackId,
  });

  response.status(501).json({
    error: {
      code: 'presigned_upload_not_implemented',
      message: 'Presigned S3 upload URLs will be added in a future branch.',
    },
    upload: {
      s3Bucket: env.S3_AUDIO_BUCKET_NAME,
      s3Key,
      contentType: input.contentType,
    },
  });
});
