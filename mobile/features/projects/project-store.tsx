import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { projectsApi } from '@/services/projects-api';

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
  projectSyncError: string | null;
  createProject: (input: CreateProjectInput) => Promise<LoopProject>;
  renameProject: (projectId: string, name: string) => void;
  deleteProject: (projectId: string) => void;
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
  const [projectSyncError, setProjectSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const storedProjects = await loadProjectsFromStorage();
        const localProjects = storedProjects.length > 0 ? storedProjects : starterProjects;

        if (!isMounted) {
          return;
        }

        setProjects(localProjects);

        try {
          const response = await projectsApi.listProjects();

          if (!isMounted) {
            return;
          }

          if (response.projects.length > 0) {
            setProjects(response.projects);
            setProjectSyncError(null);
          }
        } catch {
          if (isMounted) {
            setProjectSyncError('Backend sync unavailable. Showing local projects.');
          }
        }
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

  const createLocalProject = useCallback((input: CreateProjectInput) => {
    const now = new Date().toISOString();

    return {
      id: `local-${Date.now()}`,
      name: input.name,
      bpm: input.bpm,
      trackCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }, []);

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      try {
        const response = await projectsApi.createProject(input);
        const project = response.project;

        setProjects((currentProjects) => [project, ...currentProjects]);
        setProjectSyncError(null);

        return project;
      } catch {
        const project = createLocalProject(input);

        setProjects((currentProjects) => [project, ...currentProjects]);
        setProjectSyncError('Backend sync unavailable. Created this project locally.');

        return project;
      }
    },
    [createLocalProject]
  );

  const renameProject = useCallback((projectId: string, name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const now = new Date().toISOString();

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        return {
          ...project,
          name: trimmedName,
          updatedAt: now,
        };
      })
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
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
      projectSyncError,
      createProject,
      renameProject,
      deleteProject,
      getProjectById,
    }),
    [
      createProject,
      deleteProject,
      getProjectById,
      isLoadingProjects,
      projectStorageError,
      projectSyncError,
      projects,
      renameProject,
    ]
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
