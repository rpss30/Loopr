import { Router } from 'express';

import { validateBody } from '../middleware/validate-body';
import { CreateProjectInput } from '../models/project';
import { createProjectSchema } from '../schemas/project.schema';
import { projectService } from '../services/project.service';

export const projectsRouter = Router();

projectsRouter.get('/', async (_request, response) => {
  const projects = await projectService.listProjects();

  response.status(200).json({
    projects,
  });
});

projectsRouter.post('/', validateBody(createProjectSchema), async (request, response) => {
  const project = await projectService.createProject(request.body as CreateProjectInput);

  response.status(201).json({
    project,
  });
});

projectsRouter.get('/:projectId', async (request, response) => {
  const project = await projectService.getProjectById(request.params.projectId);

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
