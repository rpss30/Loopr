import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { LoopProject } from '../../types/project';

type CreateProjectInput = {
  name: string;
  bpm: number;
};

type ProjectContextValue = {
  projects: LoopProject[];
  createProject: (input: CreateProjectInput) => LoopProject;
  getProjectById: (projectId: string) => LoopProject | undefined;
};

const starterProjects: LoopProject[] = [
  {
    id: 'demo-project-1',
    name: 'Acoustic Groove',
    bpm: 92,
    trackCount: 3,
    createdAt: new Date('2025-01-01T12:00:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-01T12:00:00.000Z').toISOString(),
  },
  {
    id: 'demo-project-2',
    name: 'Late Night Loop',
    bpm: 110,
    trackCount: 2,
    createdAt: new Date('2025-01-02T12:00:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-02T12:00:00.000Z').toISOString(),
  },
];

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [projects, setProjects] = useState<LoopProject[]>(starterProjects);

  const value = useMemo<ProjectContextValue>(() => {
    const createProject = (input: CreateProjectInput) => {
      const now = new Date().toISOString();

      const project: LoopProject = {
        id: `local-${Date.now()}`,
        name: input.name,
        bpm: input.bpm,
        trackCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      setProjects((currentProjects) => [project, ...currentProjects]);

      return project;
    };

    const getProjectById = (projectId: string) => {
      return projects.find((project) => project.id === projectId);
    };

    return {
      projects,
      createProject,
      getProjectById,
    };
  }, [projects]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }

  return context;
}