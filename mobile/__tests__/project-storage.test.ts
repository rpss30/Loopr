import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadProjectsFromStorage,
  saveProjectsToStorage,
} from '@/features/projects/project-storage';
import { LoopProject } from '@/types/project';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const PROJECTS_STORAGE_KEY = 'loopr.projects.v1';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

const validProject: LoopProject = {
  id: 'project-1',
  name: 'Acoustic Idea',
  bpm: 90,
  trackCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('project storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when no projects are stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const projects = await loadProjectsFromStorage();

    expect(projects).toEqual([]);
    expect(mockGetItem).toHaveBeenCalledWith(PROJECTS_STORAGE_KEY);
  });

  it('loads valid projects from storage', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify([validProject]));

    const projects = await loadProjectsFromStorage();

    expect(projects).toEqual([validProject]);
  });

  it('filters out invalid stored projects', async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify([
        validProject,
        {
          id: 'bad-project',
          name: 'Missing fields',
        },
        null,
      ])
    );

    const projects = await loadProjectsFromStorage();

    expect(projects).toEqual([validProject]);
  });

  it('returns an empty array when stored data is not an array', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({ projects: [] }));

    const projects = await loadProjectsFromStorage();

    expect(projects).toEqual([]);
  });

  it('returns an empty array when stored JSON is corrupt', async () => {
    mockGetItem.mockResolvedValueOnce('{bad json');

    const projects = await loadProjectsFromStorage();

    expect(projects).toEqual([]);
  });

  it('saves projects to storage as JSON', async () => {
    mockSetItem.mockResolvedValueOnce();

    await saveProjectsToStorage([validProject]);

    expect(mockSetItem).toHaveBeenCalledWith(PROJECTS_STORAGE_KEY, JSON.stringify([validProject]));
  });
});
