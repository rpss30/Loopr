import { ApiClient, apiClient } from './api-client';

export type BackendProject = {
  id: string;
  name: string;
  bpm: number;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBackendProjectInput = {
  name: string;
  bpm?: number;
};

type HealthResponse = {
  status: 'ok';
  service: 'loopr-api';
};

type ListProjectsResponse = {
  projects: BackendProject[];
};

type CreateProjectResponse = {
  project: BackendProject;
};

export class ProjectsApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  getHealth() {
    return this.client.get<HealthResponse>('/health');
  }

  listProjects() {
    return this.client.get<ListProjectsResponse>('/api/v1/projects');
  }

  createProject(input: CreateBackendProjectInput) {
    return this.client.post<CreateProjectResponse>('/api/v1/projects', input);
  }
}

export const projectsApi = new ProjectsApi();
