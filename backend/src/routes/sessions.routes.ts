import { Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { CreateSessionInput } from '../models/session';
import { createSessionSchema } from '../schemas/session.schema';
import { projectService } from '../services/project.service';
import { sessionService } from '../services/session.service';

export const sessionsRouter = Router();

sessionsRouter.get('/', (_request, response) => {
  response.status(200).json({
    sessions: sessionService.listSessions(),
  });
});

sessionsRouter.post('/', validateBody(createSessionSchema), (request, response) => {
  const input = request.body as CreateSessionInput;
  const project = projectService.getProjectById(input.projectId);

  if (!project) {
    response.status(404).json({
      error: {
        code: 'project_not_found',
        message: 'Project not found.',
      },
    });
    return;
  }

  const session = sessionService.createSession(input);

  response.status(201).json({
    session,
  });
});

sessionsRouter.get('/:sessionId', (request, response) => {
  const session = sessionService.getSessionById(request.params.sessionId);

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
