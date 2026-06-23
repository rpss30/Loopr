import { randomUUID } from 'crypto';

import { CreateProjectInput, LoopProject } from '../models/project';

export class ProjectService {
  private projects = new Map<string, LoopProject>();

  listProjects() {
    return Array.from(this.projects.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  getProjectById(projectId: string) {
    return this.projects.get(projectId) ?? null;
  }

  createProject(input: CreateProjectInput) {
    const now = new Date().toISOString();

    const project: LoopProject = {
      id: randomUUID(),
      name: input.name,
      bpm: input.bpm ?? 120,
      trackCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(project.id, project);

    return project;
  }

  reset() {
    this.projects.clear();
  }
}

export const projectService = new ProjectService();
