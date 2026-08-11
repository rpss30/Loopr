import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoopProject } from '../../types/project';

const PROJECTS_STORAGE_KEY = 'loopr.projects.v1';

export async function loadProjectsFromStorage(): Promise<LoopProject[]> {
  const rawProjects = await AsyncStorage.getItem(PROJECTS_STORAGE_KEY);

  if (!rawProjects) {
    return [];
  }

  try {
    const parsedProjects: unknown = JSON.parse(rawProjects);

    if (!Array.isArray(parsedProjects)) {
      return [];
    }

    return parsedProjects.flatMap((project) => {
      const normalizedProject = toLoopProject(project);

      return normalizedProject ? [normalizedProject] : [];
    });
  } catch {
    return [];
  }
}

export async function saveProjectsToStorage(projects: LoopProject[]) {
  await AsyncStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function toLoopProject(value: unknown): LoopProject | null {
  if (!isRecord(value)) {
    return null;
  }

  const { bpm, createdAt, id, loopDurationMs, name, trackCount, updatedAt } = value;
  const hasValidCoreFields =
    typeof id === 'string' &&
    typeof name === 'string' &&
    typeof bpm === 'number' &&
    Number.isFinite(bpm) &&
    typeof trackCount === 'number' &&
    Number.isFinite(trackCount) &&
    typeof createdAt === 'string' &&
    typeof updatedAt === 'string';

  if (!hasValidCoreFields) {
    return null;
  }

  if (
    loopDurationMs !== undefined &&
    loopDurationMs !== null &&
    (typeof loopDurationMs !== 'number' || !Number.isFinite(loopDurationMs) || loopDurationMs <= 0)
  ) {
    return null;
  }

  return {
    id,
    name,
    bpm,
    trackCount,
    loopDurationMs: loopDurationMs ?? null,
    createdAt,
    updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
