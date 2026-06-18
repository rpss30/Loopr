import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LoopProject } from '../../types/project';
import { loadProjectsFromStorage, saveProjectsToStorage } from './project-storage';

type CreateProjectInput = {
  name: string;
  bpm: number;
};

type ProjectContextValue = {
  projects: LoopProject[];
  isLoadingProjects: boolean;
  projectStorageError: string | null;
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
  const [projects, setProjects] = useState<LoopProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectStorageError, setProjectStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const storedProjects = await loadProjectsFromStorage();

        if (!isMounted) {
          return;
        }

        setProjects(storedProjects.length > 0 ? storedProjects : starterProjects);
      } catch {
        if (!isMounted) {
          return;
        }

        setProjects(starterProjects);
        setProjectStorageError('Could not load saved projects. Showing starter projects instead.');
      } finally {
        if (isMounted) {
          setIsLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingProjects) {
      return;
    }

    saveProjectsToStorage(projects).catch(() => {
      setProjectStorageError('Could not save projects to local storage.');
    });
  }, [isLoadingProjects, projects]);

  const createProject = useCallback((input: CreateProjectInput) => {
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
  }, []);

  const getProjectById = useCallback(
    (projectId: string) => {
      return projects.find((project) => project.id === projectId);
    },
    [projects]
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      isLoadingProjects,
      projectStorageError,
      createProject,
      getProjectById,
    }),
    [createProject, getProjectById, isLoadingProjects, projectStorageError, projects]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }

  return context;
}