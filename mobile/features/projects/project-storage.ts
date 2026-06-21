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

    return parsedProjects.filter(isLoopProject);
  } catch {
    return [];
  }
}

export async function saveProjectsToStorage(projects: LoopProject[]) {
  await AsyncStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function isLoopProject(value: unknown): value is LoopProject {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.bpm === 'number' &&
    Number.isFinite(value.bpm) &&
    typeof value.trackCount === 'number' &&
    Number.isFinite(value.trackCount) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
