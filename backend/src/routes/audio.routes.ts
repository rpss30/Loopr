import { NextFunction, Request, Response, Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { createAudioUploadUrlSchema } from '../schemas/audio.schema';
import {
  audioUploadUrlService,
  CreateAudioUploadUrlInput,
  CreateAudioUploadUrlResult,
} from '../storage/audio-upload-url.service';

type AudioUploadUrlServiceLike = {
  createUploadUrl: (input: CreateAudioUploadUrlInput) => Promise<CreateAudioUploadUrlResult>;
};

export function createAudioRouter(
  uploadUrlService: AudioUploadUrlServiceLike = audioUploadUrlService
) {
  const router = Router();

  router.post(
    '/upload-url',
    validateBody(createAudioUploadUrlSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = request.body as CreateAudioUploadUrlInput;
        const upload = await uploadUrlService.createUploadUrl(input);

        response.status(201).json({
          upload,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

export const audioRouter = createAudioRouter();
