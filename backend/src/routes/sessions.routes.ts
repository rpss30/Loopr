import { Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { CreateSessionInput } from '../models/session';
import { createSessionSchema } from '../schemas/session.schema';
import { projectService } from '../services/project.service';
import { sessionService } from '../services/session.service';

export const sessionsRouter = Router();

sessionsRouter.get('/', async (_request, response) => {
  const sessions = await sessionService.listSessions();

  response.status(200).json({
    sessions,
  });
});

sessionsRouter.post('/', validateBody(createSessionSchema), async (request, response) => {
  const input = request.body as CreateSessionInput;
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

  const session = await sessionService.createSession(input);

  response.status(201).json({
    session,
  });
});

sessionsRouter.get('/:sessionId', async (request, response) => {
  const session = await sessionService.getSessionById(request.params.sessionId);

  if (!session) {
    response.status(404).json({
      error: {
        code: 'session_not_found',
        message: 'Session not found.',
      },
    });
    return;
  }

  response.status(200).json({
    session,
  });
});
