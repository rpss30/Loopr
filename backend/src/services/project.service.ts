import { randomUUID } from 'crypto';

import { CreateProjectInput, LoopProject } from '../models/project';
import { ProjectRepository } from '../repositories/project.repository';
import { repositories } from '../repositories/repository-factory';

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  listProjects() {
    return this.repository.listProjects();
  }

  getProjectById(projectId: string) {
    return this.repository.getProjectById(projectId);
  }

  async createProject(input: CreateProjectInput) {
    const now = new Date().toISOString();

    const project: LoopProject = {
      id: randomUUID(),
      name: input.name,
      bpm: input.bpm ?? 120,
      trackCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.createProject(project);
  }

  reset() {
    return this.repository.reset();
  }
}

export const projectService = new ProjectService(repositories.projectRepository);
