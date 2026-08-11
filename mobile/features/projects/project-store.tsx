import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type BackendProject, projectsApi } from '@/services/projects-api';

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
  setProjectLoopDuration: (projectId: string, durationMs: number) => void;
};

const starterProjects: LoopProject[] = [
  {
    id: 'demo-project-1',
    name: 'Acoustic Groove',
    bpm: 92,
    trackCount: 3,
    loopDurationMs: 16000,
    createdAt: new Date('2025-01-01T12:00:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-01T12:00:00.000Z').toISOString(),
  },
  {
    id: 'demo-project-2',
    name: 'Late Night Loop',
    bpm: 110,
    trackCount: 2,
    loopDurationMs: 12000,
    createdAt: new Date('2025-01-02T12:00:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-02T12:00:00.000Z').toISOString(),
  },
];

function mergeProjectsById(localProjects: LoopProject[], backendProjects: LoopProject[]) {
  const backendProjectIds = new Set(backendProjects.map((project) => project.id));
  const localProjectsById = new Map(localProjects.map((project) => [project.id, project]));
  const mergedBackendProjects = backendProjects.map((project) => ({
    ...project,
    loopDurationMs: localProjectsById.get(project.id)?.loopDurationMs ?? project.loopDurationMs,
  }));
  const localOnlyProjects = localProjects.filter((project) => !backendProjectIds.has(project.id));

  return [...mergedBackendProjects, ...localOnlyProjects];
}

function toLoopProject(project: BackendProject): LoopProject {
  return {
    ...project,
    loopDurationMs: null,
  };
}

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
            setProjects(mergeProjectsById(localProjects, response.projects.map(toLoopProject)));
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
      loopDurationMs: null,
      createdAt: now,
      updatedAt: now,
    };
  }, []);

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      try {
        const response = await projectsApi.createProject(input);
        const project = toLoopProject(response.project);

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

  const setProjectLoopDuration = useCallback((projectId: string, durationMs: number) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
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
          loopDurationMs: Math.round(durationMs),
          updatedAt: now,
        };
      })
    );
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
      setProjectLoopDuration,
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
      setProjectLoopDuration,
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
