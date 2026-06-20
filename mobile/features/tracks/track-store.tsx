import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LoopTrack } from '../../types/track';
import { loadTracksFromStorage, saveTracksToStorage } from './track-storage';

type AddRecordedTrackInput = {
  projectId: string;
  localUri: string;
  durationMs: number;
};

type TrackContextValue = {
  tracks: LoopTrack[];
  isLoadingTracks: boolean;
  trackStorageError: string | null;
  addRecordedTrack: (input: AddRecordedTrackInput) => LoopTrack;
  toggleTrackMuted: (trackId: string) => void;
  renameTrack: (trackId: string, name: string) => void;
  deleteTrack: (trackId: string) => void;
  deleteTracksByProjectId: (projectId: string) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  getTracksByProjectId: (projectId: string) => LoopTrack[];
  getTrackCountForProject: (projectId: string) => number;
};

const starterTracks: LoopTrack[] = [
  {
    id: 'demo-track-1',
    projectId: 'demo-project-1',
    name: 'Percussive guitar',
    localUri: null,
    durationMs: 16000,
    volume: 0.9,
    muted: false,
    solo: false,
    orderIndex: 0,
    createdAt: new Date('2025-01-01T12:05:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-01T12:05:00.000Z').toISOString(),
  },
  {
    id: 'demo-track-2',
    projectId: 'demo-project-1',
    name: 'Rhythm chords',
    localUri: null,
    durationMs: 16000,
    volume: 0.8,
    muted: false,
    solo: false,
    orderIndex: 1,
    createdAt: new Date('2025-01-01T12:06:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-01T12:06:00.000Z').toISOString(),
  },
  {
    id: 'demo-track-3',
    projectId: 'demo-project-1',
    name: 'Vocal hook',
    localUri: null,
    durationMs: 16000,
    volume: 0.75,
    muted: true,
    solo: false,
    orderIndex: 2,
    createdAt: new Date('2025-01-01T12:07:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-01T12:07:00.000Z').toISOString(),
  },
  {
    id: 'demo-track-4',
    projectId: 'demo-project-2',
    name: 'Pad idea',
    localUri: null,
    durationMs: 12000,
    volume: 0.7,
    muted: false,
    solo: false,
    orderIndex: 0,
    createdAt: new Date('2025-01-02T12:05:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-02T12:05:00.000Z').toISOString(),
  },
  {
    id: 'demo-track-5',
    projectId: 'demo-project-2',
    name: 'Lead melody',
    localUri: null,
    durationMs: 12000,
    volume: 0.85,
    muted: false,
    solo: false,
    orderIndex: 1,
    createdAt: new Date('2025-01-02T12:06:00.000Z').toISOString(),
    updatedAt: new Date('2025-01-02T12:06:00.000Z').toISOString(),
  },
];

const TrackContext = createContext<TrackContextValue | undefined>(undefined);

export function TrackProvider({ children }: PropsWithChildren) {
  const [tracks, setTracks] = useState<LoopTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);
  const [trackStorageError, setTrackStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTracks() {
      try {
        const storedTracks = await loadTracksFromStorage();

        if (!isMounted) {
          return;
        }

        setTracks(storedTracks.length > 0 ? storedTracks : starterTracks);
      } catch {
        if (!isMounted) {
          return;
        }

        setTracks(starterTracks);
        setTrackStorageError('Could not load saved tracks. Showing starter tracks instead.');
      } finally {
        if (isMounted) {
          setIsLoadingTracks(false);
        }
      }
    }

    loadTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingTracks) {
      return;
    }

    saveTracksToStorage(tracks).catch(() => {
      setTrackStorageError('Could not save tracks to local storage.');
    });
  }, [isLoadingTracks, tracks]);

  const addRecordedTrack = useCallback(
    (input: AddRecordedTrackInput) => {
      const now = new Date().toISOString();

      const projectTrackCount = tracks.filter(
        (track) => track.projectId === input.projectId
      ).length;

      const track: LoopTrack = {
        id: `track-${Date.now()}`,
        projectId: input.projectId,
        name: `Track ${projectTrackCount + 1}`,
        localUri: input.localUri,
        durationMs: input.durationMs,
        volume: 1,
        muted: false,
        solo: false,
        orderIndex: projectTrackCount,
        createdAt: now,
        updatedAt: now,
      };

      setTracks((currentTracks) => [...currentTracks, track]);

      return track;
    },
    [tracks]
  );

  const toggleTrackMuted = useCallback((trackId: string) => {
    const now = new Date().toISOString();

    setTracks((currentTracks) =>
      currentTracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        return {
          ...track,
          muted: !track.muted,
          updatedAt: now,
        };
      })
    );
  }, []);

  const renameTrack = useCallback((trackId: string, name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const now = new Date().toISOString();

    setTracks((currentTracks) =>
      currentTracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        return {
          ...track,
          name: trimmedName,
          updatedAt: now,
        };
      })
    );
  }, []);

  const deleteTrack = useCallback((trackId: string) => {
    const now = new Date().toISOString();

    setTracks((currentTracks) => {
      const trackToDelete = currentTracks.find((track) => track.id === trackId);

      if (!trackToDelete) {
        return currentTracks;
      }

      const remainingTracks = currentTracks.filter((track) => track.id !== trackId);

      const reorderedProjectTracks = new Map(
        remainingTracks
          .filter((track) => track.projectId === trackToDelete.projectId)
          .sort((left, right) => left.orderIndex - right.orderIndex)
          .map((track, index) => [
            track.id,
            {
              ...track,
              orderIndex: index,
              updatedAt: now,
            },
          ])
      );

      return remainingTracks.map((track) => reorderedProjectTracks.get(track.id) ?? track);
    });
  }, []);

  const deleteTracksByProjectId = useCallback((projectId: string) => {
    setTracks((currentTracks) => currentTracks.filter((track) => track.projectId !== projectId));
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    const normalizedVolume = Math.min(Math.max(volume, 0), 1);
    const now = new Date().toISOString();

    setTracks((currentTracks) =>
      currentTracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        return {
          ...track,
          volume: normalizedVolume,
          updatedAt: now,
        };
      })
    );
  }, []);

  const getTracksByProjectId = useCallback(
    (projectId: string) => {
      return tracks
        .filter((track) => track.projectId === projectId)
        .sort((left, right) => left.orderIndex - right.orderIndex);
    },
    [tracks]
  );

  const getTrackCountForProject = useCallback(
    (projectId: string) => {
      return tracks.filter((track) => track.projectId === projectId).length;
    },
    [tracks]
  );

  const value = useMemo<TrackContextValue>(
    () => ({
      tracks,
      isLoadingTracks,
      trackStorageError,
      addRecordedTrack,
      toggleTrackMuted,
      renameTrack,
      deleteTrack,
      deleteTracksByProjectId,
      updateTrackVolume,
      getTracksByProjectId,
      getTrackCountForProject,
    }),
    [
      addRecordedTrack,
      deleteTrack,
      deleteTracksByProjectId,
      getTrackCountForProject,
      getTracksByProjectId,
      isLoadingTracks,
      renameTrack,
      toggleTrackMuted,
      trackStorageError,
      tracks,
      updateTrackVolume,
    ]
  );

  return <TrackContext.Provider value={value}>{children}</TrackContext.Provider>;
}

export function useTracks() {
  const context = useContext(TrackContext);

  if (!context) {
    throw new Error('useTracks must be used within a TrackProvider');
  }

  return context;
}
