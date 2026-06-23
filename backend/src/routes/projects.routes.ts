import { Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { CreateProjectInput } from '../models/project';
import { createProjectSchema } from '../schemas/project.schema';
import { projectService } from '../services/project.service';

export const projectsRouter = Router();

projectsRouter.get('/', (_request, response) => {
  response.status(200).json({
    projects: projectService.listProjects(),
  });
});

projectsRouter.post('/', validateBody(createProjectSchema), (request, response) => {
  const project = projectService.createProject(request.body as CreateProjectInput);

  response.status(201).json({
    project,
  });
});

projectsRouter.get('/:projectId', (request, response) => {
  const project = projectService.getProjectById(request.params.projectId);

  if (!project) {
    response.status(404).json({
      error: {
        code: 'project_not_found',
        message: 'Project not found.',
      },
    });
    return;
  }

  response.status(200).json({
    project,
  });
});
