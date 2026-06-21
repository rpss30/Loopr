import { Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { createProjectSchema } from '../schemas/project.schema';

export const projectsRouter = Router();

projectsRouter.get('/', (_request, response) => {
  response.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Project listing will be connected to persistence later.',
    },
  });
});

projectsRouter.post('/', validateBody(createProjectSchema), (_request, response) => {
  response.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Project creation will be connected to persistence later.',
    },
  });
});
