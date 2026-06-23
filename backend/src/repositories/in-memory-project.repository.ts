import { LoopProject } from '../models/project';
import { ProjectRepository } from './project.repository';

export class InMemoryProjectRepository implements ProjectRepository {
  private projects = new Map<string, LoopProject>();

  async listProjects() {
    return Array.from(this.projects.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  async getProjectById(projectId: string) {
    return this.projects.get(projectId) ?? null;
  }

  async createProject(project: LoopProject) {
    this.projects.set(project.id, project);

    return project;
  }

  async reset() {
    this.projects.clear();
  }
}

export const projectRepository = new InMemoryProjectRepository();
