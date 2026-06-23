import { LoopProject } from '../models/project';

export type ProjectRepository = {
  listProjects: () => Promise<LoopProject[]>;
  getProjectById: (projectId: string) => Promise<LoopProject | null>;
  createProject: (project: LoopProject) => Promise<LoopProject>;
  reset: () => Promise<void>;
};
