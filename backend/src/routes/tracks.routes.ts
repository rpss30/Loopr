import { Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { CreateTrackInput } from '../models/track';
import { createTrackSchema } from '../schemas/track.schema';
import { projectService } from '../services/project.service';
import { sessionService } from '../services/session.service';
import { trackService } from '../services/track.service';

export const tracksRouter = Router();

tracksRouter.get('/', async (_request, response) => {
  const tracks = await trackService.listTracks();

  response.status(200).json({
    tracks,
  });
});

tracksRouter.post('/', validateBody(createTrackSchema), async (request, response) => {
  const input = request.body as CreateTrackInput;

  const project = await projectService.getProjectById(input.projectId);

  if (!project) {
    response.status(404).json({
      error: {
        code: 'project_not_found',
        message: 'Project not found.',
      },
    });
    return;
  }

  const session = await sessionService.getSessionById(input.sessionId);

  if (!session) {
    response.status(404).json({
      error: {
        code: 'session_not_found',
        message: 'Session not found.',
      },
    });
    return;
  }

  if (session.projectId !== input.projectId) {
    response.status(400).json({
      error: {
        code: 'session_project_mismatch',
        message: 'Session does not belong to the provided project.',
      },
    });
    return;
  }

  const track = await trackService.createTrack(input);

  response.status(201).json({
    track,
  });
});

tracksRouter.get('/:trackId', async (request, response) => {
  const track = await trackService.getTrackById(request.params.trackId);

  if (!track) {
    response.status(404).json({
      error: {
        code: 'track_not_found',
        message: 'Track not found.',
      },
    });
    return;
  }

  response.status(200).json({
    track,
  });
});
