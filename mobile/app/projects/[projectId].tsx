import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createPreparedHighQualityRecording,
  loadRecordingMonitorSounds,
  loadSessionTrackSounds,
  playRecordedTrack,
  playTrackSoundMapFromLoopStart,
  reinforceRecordingMonitorPlayback,
  setWorkspaceAudioMode,
  stopAndUnloadSound,
  stopAndUnloadSounds,
  unloadRecording,
} from '../../features/looper/looper-audio';
import {
  DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS,
  loadOverdubLatencyCompensationMs,
  MAX_OVERDUB_LATENCY_COMPENSATION_MS,
  MIN_OVERDUB_LATENCY_COMPENSATION_MS,
  normalizeOverdubLatencyCompensationMs,
  OVERDUB_LATENCY_COMPENSATION_STEP_MS,
  saveOverdubLatencyCompensationMs,
} from '../../features/looper/latency-compensation-storage';
import { useProjects } from '../../features/projects/project-store';
import { deleteLocalAudioFile } from '../../features/tracks/audio-file-cleanup';
import { getSavedRecordingDurationMs } from '../../features/tracks/recording-duration';
import {
  getBaseLoopDurationMs,
  getLayerRecordingLimitMs,
  getSessionLoopDurationMs,
  isBaseLoopTrack,
} from '../../features/tracks/session-loop';
import { useTracks } from '../../features/tracks/track-store';
import { ensureBackendSessionForProject } from '../../services/project-session-sync';
import {
  getTrackCloudSyncStatusForResult,
  syncRecordedTrackToCloud,
} from '../../services/recorded-track-cloud-sync';
import { type LoopTrack, type LoopTrackCloudSyncStatus } from '../../types/track';

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const { getProjectById, isLoadingProjects, renameProject, setProjectLoopDuration } =
    useProjects();
  const {
    addRecordedTrack,
    deleteTrack,
    getTracksByProjectId,
    isLoadingTracks,
    renameTrack,
    replaceRecordedTrack,
    toggleTrackMuted,
    trackStorageError,
    updateTrackCloudSyncStatus,
    updateTrackVolume,
  } = useTracks();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordingLoopLimitMs, setRecordingLoopLimitMs] = useState<number | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingDurationMsRef = useRef(0);
  const recordingPlaybackStartOffsetMsRef = useRef(0);
  const recordingLoopLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLayerRecordingOverLoopRef = useRef(false);
  const overwriteTrackRef = useRef<LoopTrack | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sessionSoundRefs = useRef<Map<string, Audio.Sound>>(new Map());
  const sessionLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionPlaybackGenerationRef = useRef(0);

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isSessionPlaying, setIsSessionPlaying] = useState(false);
  const [overwriteTrackId, setOverwriteTrackId] = useState<string | null>(null);
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [isEnsuringBackendSession, setIsEnsuringBackendSession] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [overdubLatencyCompensationMs, setOverdubLatencyCompensationMs] = useState(
    DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS
  );
  const syncToastTranslateX = useRef(new Animated.Value(360)).current;
  const syncToastOpacity = useRef(new Animated.Value(0)).current;
  const didLoadLatencyCompensationRef = useRef(false);

  const project = getProjectById(params.projectId);
  const tracks = project ? getTracksByProjectId(project.id) : [];
  const isLoading = isLoadingProjects || isLoadingTracks;
  const isRecording = recording !== null;
  const playableSessionTracks = tracks.filter((track) => track.localUri && !track.muted);
  const canPlaySession = playableSessionTracks.length > 0;
  const baseLoopDurationMs = getBaseLoopDurationMs(tracks);
  const sessionLoopDurationMs = getSessionLoopDurationMs(project?.loopDurationMs ?? null, tracks);
  const layerRecordingLimitMs = getLayerRecordingLimitMs(
    sessionLoopDurationMs,
    playableSessionTracks.length
  );
  const recordingActionLabel = overwriteTrackId
    ? 'Redoing layer'
    : recordingLoopLimitMs
      ? 'Recording layer'
      : 'Recording';
  const recordingStatusText = recordingLoopLimitMs
    ? `${recordingActionLabel}... ${formatDuration(recordingDurationMs)} / ${formatDuration(recordingLoopLimitMs)}`
    : `${recordingActionLabel}... ${formatDuration(recordingDurationMs)}`;
  const syncToastText = isEnsuringBackendSession
    ? 'Preparing backend session sync...'
    : syncToastMessage;

  useEffect(() => {
    let isMounted = true;

    loadOverdubLatencyCompensationMs()
      .then((value) => {
        if (isMounted) {
          didLoadLatencyCompensationRef.current = true;
          setOverdubLatencyCompensationMs(value);
        }
      })
      .catch(() => {
        if (isMounted) {
          didLoadLatencyCompensationRef.current = true;
          setOverdubLatencyCompensationMs(DEFAULT_OVERDUB_LATENCY_COMPENSATION_MS);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!didLoadLatencyCompensationRef.current) {
      return;
    }

    void saveOverdubLatencyCompensationMs(overdubLatencyCompensationMs);
  }, [overdubLatencyCompensationMs]);

  useEffect(() => {
    if (!syncToastText) {
      Animated.parallel([
        Animated.timing(syncToastTranslateX, {
          toValue: 360,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(syncToastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    syncToastTranslateX.setValue(360);
    syncToastOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(syncToastTranslateX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(syncToastOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();

    if (!syncToastMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(syncToastTranslateX, {
          toValue: 360,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(syncToastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setSyncToastMessage(null);
        }
      });
    }, 3200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [syncToastMessage, syncToastOpacity, syncToastText, syncToastTranslateX]);

  useEffect(() => {
    if (!project) {
      setBackendSessionId(null);
      setSyncToastMessage(null);
      setIsEnsuringBackendSession(false);
      return;
    }

    const currentProject = project;
    let isMounted = true;

    async function ensureSession() {
      setIsEnsuringBackendSession(true);

      try {
        const session = await ensureBackendSessionForProject({
          projectId: currentProject.id,
          projectName: currentProject.name,
          bpm: currentProject.bpm,
        });

        if (!isMounted) {
          return;
        }

        setBackendSessionId(session.id);
        setSyncToastMessage('Backend session ready for future cloud track sync.');
      } catch {
        if (!isMounted) {
          return;
        }

        setBackendSessionId(null);
        setSyncToastMessage(
          'Backend session unavailable for this project. Recording remains local on this device.'
        );
      } finally {
        if (isMounted) {
          setIsEnsuringBackendSession(false);
        }
      }
    }

    void ensureSession();

    return () => {
      isMounted = false;
    };
  }, [project]);

  useEffect(() => {
    if (!project || isLoadingTracks || project.loopDurationMs === baseLoopDurationMs) {
      return;
    }

    setProjectLoopDuration(project.id, baseLoopDurationMs);
  }, [baseLoopDurationMs, isLoadingTracks, project, setProjectLoopDuration]);

  useEffect(() => {
    return () => {
      clearSessionLoopTimeout();
      clearRecordingLoopLimitTimeout();
      sessionPlaybackGenerationRef.current += 1;

      if (soundRef.current) {
        void stopAndUnloadSound(soundRef.current);
        soundRef.current = null;
      }

      void stopAndUnloadSounds(sessionSoundRefs.current.values());
      sessionSoundRefs.current.clear();
    };
  }, []);

  const clearSessionLoopTimeout = () => {
    if (!sessionLoopTimeoutRef.current) {
      return;
    }

    clearTimeout(sessionLoopTimeoutRef.current);
    sessionLoopTimeoutRef.current = null;
  };

  const clearRecordingLoopLimitTimeout = () => {
    if (!recordingLoopLimitTimeoutRef.current) {
      return;
    }

    clearTimeout(recordingLoopLimitTimeoutRef.current);
    recordingLoopLimitTimeoutRef.current = null;
  };

  const startRecording = async ({ overwriteTrack }: { overwriteTrack?: LoopTrack } = {}) => {
    if (!project || recording) {
      return;
    }

    let preparedRecording: Audio.Recording | null = null;
    const activeOverwriteTrack = overwriteTrack ?? null;
    const backingSessionTracks = activeOverwriteTrack
      ? playableSessionTracks.filter((track) => track.id !== activeOverwriteTrack.id)
      : playableSessionTracks;
    const recordingLimitMs = activeOverwriteTrack ? sessionLoopDurationMs : layerRecordingLimitMs;
    const shouldStartLoopForRecording = Boolean(
      recordingLimitMs && backingSessionTracks.length > 0
    );

    await stopPlayback();

    if (!recordingLimitMs || activeOverwriteTrack) {
      await stopSessionPlayback();
    }

    try {
      let permission = permissionResponse;

      if (permission?.status !== 'granted') {
        permission = await requestPermission();
      }

      if (!permission?.granted) {
        Alert.alert(
          'Microphone permission needed',
          'Loopr needs microphone access to record loop tracks.'
        );
        return;
      }

      await setWorkspaceAudioMode(true);

      setSyncToastMessage(null);
      setRecordingDurationMs(0);
      recordingDurationMsRef.current = 0;
      recordingPlaybackStartOffsetMsRef.current = 0;
      setRecordingLoopLimitMs(recordingLimitMs);
      isLayerRecordingOverLoopRef.current = Boolean(recordingLimitMs);
      overwriteTrackRef.current = activeOverwriteTrack;
      setOverwriteTrackId(activeOverwriteTrack?.id ?? null);

      preparedRecording = await createPreparedHighQualityRecording((durationMs) => {
        recordingDurationMsRef.current = durationMs;
        setRecordingDurationMs(durationMs);
      });

      await preparedRecording.startAsync();

      const recordingStartedAtMs = Date.now();
      recordingRef.current = preparedRecording;
      setRecording(preparedRecording);

      if (shouldStartLoopForRecording) {
        const backingStartedAtMs = await playRecordingBackingLoop(backingSessionTracks);

        if (backingStartedAtMs === null) {
          clearRecordingLoopLimitTimeout();
          recordingRef.current = null;
          isLayerRecordingOverLoopRef.current = false;
          overwriteTrackRef.current = null;
          recordingPlaybackStartOffsetMsRef.current = 0;
          setRecording(null);
          setOverwriteTrackId(null);
          setRecordingLoopLimitMs(null);
          setRecordingDurationMs(0);
          recordingDurationMsRef.current = 0;

          await unloadRecording(preparedRecording);

          await setWorkspaceAudioMode(false);

          return;
        }

        recordingPlaybackStartOffsetMsRef.current = Math.max(
          0,
          backingStartedAtMs - recordingStartedAtMs + overdubLatencyCompensationMs
        );
        await reinforceRecordingMonitorPlayback(sessionSoundRefs.current, backingSessionTracks);
      }

      if (recordingLimitMs) {
        clearRecordingLoopLimitTimeout();
        recordingLoopLimitTimeoutRef.current = setTimeout(() => {
          void stopRecording();
        }, recordingLimitMs);
      }
    } catch {
      if (preparedRecording) {
        await unloadRecording(preparedRecording);
      }

      recordingRef.current = null;
      isLayerRecordingOverLoopRef.current = false;
      overwriteTrackRef.current = null;
      recordingPlaybackStartOffsetMsRef.current = 0;
      setOverwriteTrackId(null);
      setRecordingLoopLimitMs(null);
      setRecording(null);
      setRecordingDurationMs(0);
      recordingDurationMsRef.current = 0;
      if (shouldStartLoopForRecording) {
        await stopSessionPlayback();
      }
      Alert.alert('Recording failed', 'Could not start recording. Try again.');
    }
  };

  const stopRecording = async () => {
    if (!project || !recordingRef.current) {
      return;
    }

    const activeRecording = recordingRef.current;
    const activeOverwriteTrack = overwriteTrackRef.current;
    const shouldReplaceBaseLoopDuration = activeOverwriteTrack
      ? isBaseLoopTrack(tracks, activeOverwriteTrack.id)
      : false;
    const shouldRestartLoopWithSavedTrack = isLayerRecordingOverLoopRef.current;
    const loopDurationForSavedTrack = sessionLoopDurationMs;
    const playbackStartOffsetMsForSavedTrack = recordingPlaybackStartOffsetMsRef.current;
    const fallbackDurationForSavedTrack = recordingLoopLimitMs
      ? recordingLoopLimitMs + playbackStartOffsetMsForSavedTrack
      : null;
    let statusDurationMs: number | null = null;

    clearRecordingLoopLimitTimeout();
    recordingRef.current = null;
    isLayerRecordingOverLoopRef.current = false;
    overwriteTrackRef.current = null;
    recordingPlaybackStartOffsetMsRef.current = 0;
    setRecording(null);
    setRecordingLoopLimitMs(null);
    setOverwriteTrackId(null);

    try {
      try {
        const status = await activeRecording.getStatusAsync();
        statusDurationMs = status.durationMillis ?? null;
      } catch {
        statusDurationMs = null;
      }

      await activeRecording.stopAndUnloadAsync();

      await setWorkspaceAudioMode(false);

      const localUri = activeRecording.getURI();

      if (!localUri) {
        setRecordingDurationMs(0);
        recordingDurationMsRef.current = 0;
        Alert.alert('Recording unavailable', 'Loopr could not find the saved recording file.');
        return;
      }

      const savedDurationMs = getSavedRecordingDurationMs({
        trackedDurationMs: recordingDurationMsRef.current,
        statusDurationMs,
        fallbackDurationMs: fallbackDurationForSavedTrack,
      });
      const savedTrack = activeOverwriteTrack
        ? replaceRecordedTrack(activeOverwriteTrack.id, {
            localUri,
            durationMs: savedDurationMs,
            playbackStartOffsetMs: playbackStartOffsetMsForSavedTrack,
          })
        : addRecordedTrack({
            projectId: project.id,
            localUri,
            durationMs: savedDurationMs,
            playbackStartOffsetMs: playbackStartOffsetMsForSavedTrack,
          });

      if (!savedTrack) {
        deleteLocalAudioFile(localUri);
        Alert.alert('Redo failed', 'Loopr could not replace this layer.');
        return;
      }

      if (activeOverwriteTrack?.localUri && activeOverwriteTrack.localUri !== localUri) {
        const didDeleteAudioFile = deleteLocalAudioFile(activeOverwriteTrack.localUri);

        if (!didDeleteAudioFile) {
          setSyncToastMessage('Layer replaced, but old audio cleanup was unavailable.');
        }
      }

      if (
        (project.loopDurationMs === null && !activeOverwriteTrack) ||
        shouldReplaceBaseLoopDuration
      ) {
        setProjectLoopDuration(project.id, savedTrack.durationMs);
      }

      if (shouldRestartLoopWithSavedTrack && loopDurationForSavedTrack) {
        void playSession({
          loopDurationMs: loopDurationForSavedTrack,
          sessionTracks: getSessionTracksAfterSave(playableSessionTracks, savedTrack),
        });
      }

      if (backendSessionId) {
        setSyncToastMessage('Uploading recording for cloud sync...');
        updateTrackCloudSyncStatus(savedTrack.id, {
          cloudSyncStatus: 'syncing',
          backendTrackId: null,
        });

        void syncRecordedTrackToCloud({
          projectId: project.id,
          sessionId: backendSessionId,
          trackId: savedTrack.id,
          localUri,
          name: savedTrack.name,
          durationMs: savedTrack.durationMs,
          volume: savedTrack.volume,
          isMuted: savedTrack.muted,
        })
          .then((syncResult) => {
            updateTrackCloudSyncStatus(savedTrack.id, {
              cloudSyncStatus: getTrackCloudSyncStatusForResult(syncResult),
              backendTrackId: syncResult.status === 'synced' ? syncResult.track.id : null,
            });

            if (syncResult.status === 'synced') {
              setSyncToastMessage('Recording uploaded and cloud track metadata saved.');
              return;
            }

            if (syncResult.status === 'failed') {
              setSyncToastMessage(null);
              setSyncToastMessage(
                'Cloud track sync unavailable. Track is saved locally on this device.'
              );
              return;
            }

            setSyncToastMessage(null);
          })
          .catch(() => {
            updateTrackCloudSyncStatus(savedTrack.id, {
              cloudSyncStatus: 'sync-failed',
              backendTrackId: null,
            });
            setSyncToastMessage(null);
            setSyncToastMessage(
              'Cloud track sync unavailable. Track is saved locally on this device.'
            );
          });
      } else {
        updateTrackCloudSyncStatus(savedTrack.id, {
          cloudSyncStatus: 'local-only',
          backendTrackId: null,
        });
      }

      setRecordingDurationMs(0);
      recordingDurationMsRef.current = 0;
    } catch {
      Alert.alert('Recording failed', 'Could not stop and save the recording.');
      setRecordingDurationMs(0);
      recordingDurationMsRef.current = 0;
    }
  };
  const stopPlayback = async () => {
    if (!soundRef.current) {
      setPlayingTrackId(null);
      return;
    }

    const activeSound = soundRef.current;
    soundRef.current = null;
    setPlayingTrackId(null);

    await stopAndUnloadSound(activeSound);
  };

  const stopSessionPlayback = async () => {
    clearSessionLoopTimeout();
    sessionPlaybackGenerationRef.current += 1;

    await stopSessionSounds();
    setIsSessionPlaying(false);
  };

  const stopSessionSounds = async () => {
    const activeSounds = Array.from(sessionSoundRefs.current.values());

    sessionSoundRefs.current.clear();

    await stopAndUnloadSounds(activeSounds);
  };

  const playTrack = async (track: LoopTrack) => {
    if (!track.localUri) {
      Alert.alert('No audio file', 'This demo track does not have a recorded audio file yet.');
      return;
    }

    if (track.muted) {
      Alert.alert('Track muted', 'Unmute this track before playing it.');
      return;
    }

    try {
      if (playingTrackId === track.id) {
        await stopPlayback();
        await stopSessionPlayback();
        return;
      }

      await stopPlayback();
      await stopSessionPlayback();

      await setWorkspaceAudioMode(false);

      const sound = await playRecordedTrack(track, (finishedSound) => {
        void finishedSound.unloadAsync();
        soundRef.current = null;
        setPlayingTrackId(null);
      });

      soundRef.current = sound;
      setPlayingTrackId(track.id);
    } catch {
      Alert.alert('Playback failed', 'Could not play this recording.');
      setPlayingTrackId(null);
    }
  };

  const playSession = async ({
    loopDurationMs = sessionLoopDurationMs,
    sessionTracks = playableSessionTracks,
  }: {
    loopDurationMs?: number | null;
    sessionTracks?: LoopTrack[];
  } = {}) => {
    if (sessionTracks.length === 0) {
      Alert.alert(
        'No playable tracks',
        'Record a track or unmute an existing recorded track before playing the session.'
      );
      return false;
    }

    if (!loopDurationMs) {
      Alert.alert(
        'Loop unavailable',
        'Record a first layer before starting looped session playback.'
      );
      return false;
    }

    try {
      await stopPlayback();
      await stopSessionPlayback();

      await setWorkspaceAudioMode(false);

      const playbackGeneration = sessionPlaybackGenerationRef.current + 1;
      sessionPlaybackGenerationRef.current = playbackGeneration;
      setIsSessionPlaying(true);

      return await playSessionCycle(sessionTracks, loopDurationMs, playbackGeneration);
    } catch {
      sessionPlaybackGenerationRef.current += 1;
      clearSessionLoopTimeout();
      await stopSessionSounds();
      setIsSessionPlaying(false);

      Alert.alert('Session playback failed', 'Could not play all recorded tracks.');
      return false;
    }
  };

  const playRecordingBackingLoop = async (sessionTracks: LoopTrack[]) => {
    let loadedSounds = new Map<string, Audio.Sound>();

    try {
      await stopSessionPlayback();
      await setWorkspaceAudioMode(true);

      const playbackGeneration = sessionPlaybackGenerationRef.current + 1;
      sessionPlaybackGenerationRef.current = playbackGeneration;
      setIsSessionPlaying(true);

      loadedSounds = await loadRecordingMonitorSounds(sessionTracks);

      if (playbackGeneration !== sessionPlaybackGenerationRef.current) {
        await stopAndUnloadSounds(loadedSounds.values());
        return null;
      }

      sessionSoundRefs.current = loadedSounds;

      await playTrackSoundMapFromLoopStart(loadedSounds, sessionTracks);

      return Date.now();
    } catch {
      await stopAndUnloadSounds(loadedSounds.values());
      sessionSoundRefs.current.clear();
      sessionPlaybackGenerationRef.current += 1;
      setIsSessionPlaying(false);

      Alert.alert('Session playback failed', 'Could not play existing layers while recording.');
      return null;
    }
  };

  const playSessionCycle = async (
    sessionTracks: LoopTrack[],
    loopDurationMs: number,
    playbackGeneration: number
  ) => {
    let loadedSounds = new Map<string, Audio.Sound>();

    await stopSessionSounds();

    try {
      loadedSounds = await loadSessionTrackSounds(sessionTracks);

      if (playbackGeneration !== sessionPlaybackGenerationRef.current) {
        await stopAndUnloadSounds(loadedSounds.values());
        return false;
      }

      sessionSoundRefs.current = loadedSounds;

      await playTrackSoundMapFromLoopStart(loadedSounds, sessionTracks);

      clearSessionLoopTimeout();
      sessionLoopTimeoutRef.current = setTimeout(() => {
        if (playbackGeneration === sessionPlaybackGenerationRef.current) {
          void playSessionCycle(sessionTracks, loopDurationMs, playbackGeneration);
        }
      }, loopDurationMs);

      return true;
    } catch {
      await stopAndUnloadSounds(loadedSounds.values());
      sessionSoundRefs.current.clear();
      clearSessionLoopTimeout();
      sessionPlaybackGenerationRef.current += 1;
      setIsSessionPlaying(false);

      Alert.alert('Session playback failed', 'Could not play all recorded tracks.');
      return false;
    }
  };

  const handleSessionPlaybackPress = async () => {
    if (isSessionPlaying) {
      await stopSessionPlayback();
      return;
    }

    await playSession();
  };

  const handleMutePress = async (track: LoopTrack) => {
    if (playingTrackId === track.id) {
      await stopPlayback();
    }

    if (isSessionPlaying) {
      await stopSessionPlayback();
    }

    toggleTrackMuted(track.id);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.title}>Loading project...</Text>
          <Text style={styles.emptyText}>Checking saved Loopr project data on this device.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleRenamePress = (track: LoopTrack) => {
    Alert.prompt(
      'Rename track',
      'Enter a clear name for this loop layer.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: (name?: string) => {
            const trimmedName = name?.trim() ?? '';

            if (!trimmedName) {
              Alert.alert('Track name required', 'Type a track name to save, or tap Cancel.', [
                {
                  text: 'Try again',
                  onPress: () => {
                    handleRenamePress(track);
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]);

              return;
            }

            renameTrack(track.id, trimmedName);
          },
        },
      ],
      'plain-text',
      track.name
    );
  };

  const deleteSelectedTrack = async (track: LoopTrack) => {
    if (playingTrackId === track.id) {
      await stopPlayback();
    }

    if (isSessionPlaying) {
      await stopSessionPlayback();
    }

    const didDeleteAudioFile = deleteLocalAudioFile(track.localUri);

    deleteTrack(track.id);

    if (track.localUri && !didDeleteAudioFile) {
      Alert.alert(
        'Track removed',
        'Loopr removed the track, but could not delete its local audio file.'
      );
    }
  };

  const handleDeletePress = (track: LoopTrack) => {
    Alert.alert('Delete track?', `"${track.name}" will be removed from this project.`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteSelectedTrack(track);
        },
      },
    ]);
  };

  const handleRedoPress = (track: LoopTrack) => {
    if (isRecording) {
      return;
    }

    if (!track.localUri) {
      Alert.alert('No audio file', 'Record this layer before using Redo.');
      return;
    }

    Alert.alert('Redo layer?', `"${track.name}" will be replaced by a new recording.`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Redo',
        onPress: () => {
          void startRecording({ overwriteTrack: track });
        },
      },
    ]);
  };

  const previewTrackVolume = (track: LoopTrack, volume: number) => {
    if (playingTrackId === track.id && soundRef.current) {
      void soundRef.current.setVolumeAsync(volume);
    }

    const sessionSound = sessionSoundRefs.current.get(track.id);

    if (sessionSound) {
      void sessionSound.setVolumeAsync(volume);
    }
  };

  const handleVolumeChangeComplete = (track: LoopTrack, volume: number) => {
    updateTrackVolume(track.id, volume);

    if (playingTrackId === track.id && soundRef.current) {
      void soundRef.current.setVolumeAsync(volume);
    }

    const sessionSound = sessionSoundRefs.current.get(track.id);

    if (sessionSound) {
      void sessionSound.setVolumeAsync(volume);
    }
  };

  const updateOverdubLatencyCompensation = (deltaMs: number) => {
    const nextValue = normalizeOverdubLatencyCompensationMs(overdubLatencyCompensationMs + deltaMs);

    if (nextValue !== null) {
      setOverdubLatencyCompensationMs(nextValue);
    }
  };

  if (!project) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.title}>Project not found</Text>
          <Text style={styles.emptyText}>
            This project may have been removed or the app state may have reset.
          </Text>

          <Link href="/" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Back to projects</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const handleRenameProjectPress = () => {
    Alert.prompt(
      'Rename project',
      'Enter a clear name for this loop project.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: (name?: string) => {
            const trimmedName = name?.trim() ?? '';

            if (!trimmedName) {
              Alert.alert('Project name required', 'Type a project name to save, or tap Cancel.', [
                {
                  text: 'Try again',
                  onPress: handleRenameProjectPress,
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]);

              return;
            }

            renameProject(project.id, trimmedName);
          },
        },
      ],
      'plain-text',
      project.name
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.projectHeader}>
          <Text style={styles.eyebrow}>Loop Workspace</Text>
          <View style={styles.projectTitleRow}>
            <Text style={styles.title}>{project.name}</Text>

            <Pressable
              style={styles.projectEditButton}
              onPress={handleRenameProjectPress}
              accessibilityRole="button"
              accessibilityLabel={`Rename ${project.name}`}
            >
              <Text style={styles.projectEditButtonText}>✎</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            {project.bpm} BPM · {tracks.length} recorded {tracks.length === 1 ? 'track' : 'tracks'}{' '}
            ·{' '}
            {sessionLoopDurationMs
              ? `loop ${formatDuration(sessionLoopDurationMs)}`
              : 'loop set by first layer'}
          </Text>
        </View>

        {trackStorageError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{trackStorageError}</Text>
          </View>
        ) : null}

        <View style={styles.transportCard}>
          <Text style={styles.sectionTitle}>Session controls</Text>

          <View style={styles.transportRow}>
            <Pressable
              style={[styles.recordButton, isRecording ? styles.stopButton : null]}
              onPress={isRecording ? stopRecording : () => startRecording()}
            >
              <Text style={styles.recordButtonText}>{isRecording ? 'Stop & save' : 'Record'}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.sessionButton,
                isSessionPlaying ? styles.stopSessionButton : null,
                isRecording || (!canPlaySession && !isSessionPlaying)
                  ? styles.sessionButtonDisabled
                  : null,
              ]}
              onPress={() => {
                void handleSessionPlaybackPress();
              }}
              disabled={isRecording || (!canPlaySession && !isSessionPlaying)}
            >
              <Text
                style={[
                  styles.sessionButtonText,
                  isRecording || (!canPlaySession && !isSessionPlaying)
                    ? styles.sessionButtonTextDisabled
                    : null,
                ]}
              >
                {isSessionPlaying ? 'Stop all' : 'Play all'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.helperText}>
            {isRecording
              ? recordingStatusText
              : isSessionPlaying
                ? `Looping all unmuted tracks every ${formatDuration(sessionLoopDurationMs ?? 0)}.`
                : canPlaySession
                  ? `Play ${playableSessionTracks.length} unmuted recorded ${
                      playableSessionTracks.length === 1 ? 'track' : 'tracks'
                    }.`
                  : 'Record a short idea, then use Play all to hear the workspace.'}
          </Text>

          <View style={styles.latencyRow}>
            <Text style={styles.latencyLabel}>Overdub alignment</Text>
            <View style={styles.latencyControls}>
              <Pressable
                style={[
                  styles.latencyButton,
                  overdubLatencyCompensationMs <= MIN_OVERDUB_LATENCY_COMPENSATION_MS
                    ? styles.latencyButtonDisabled
                    : null,
                ]}
                onPress={() => {
                  updateOverdubLatencyCompensation(-OVERDUB_LATENCY_COMPENSATION_STEP_MS);
                }}
                disabled={overdubLatencyCompensationMs <= MIN_OVERDUB_LATENCY_COMPENSATION_MS}
              >
                <Text
                  style={[
                    styles.latencyButtonText,
                    overdubLatencyCompensationMs <= MIN_OVERDUB_LATENCY_COMPENSATION_MS
                      ? styles.latencyButtonTextDisabled
                      : null,
                  ]}
                >
                  Later
                </Text>
              </Pressable>

              <Text style={styles.latencyValue}>{overdubLatencyCompensationMs} ms</Text>

              <Pressable
                style={[
                  styles.latencyButton,
                  overdubLatencyCompensationMs >= MAX_OVERDUB_LATENCY_COMPENSATION_MS
                    ? styles.latencyButtonDisabled
                    : null,
                ]}
                onPress={() => {
                  updateOverdubLatencyCompensation(OVERDUB_LATENCY_COMPENSATION_STEP_MS);
                }}
                disabled={overdubLatencyCompensationMs >= MAX_OVERDUB_LATENCY_COMPENSATION_MS}
              >
                <Text
                  style={[
                    styles.latencyButtonText,
                    overdubLatencyCompensationMs >= MAX_OVERDUB_LATENCY_COMPENSATION_MS
                      ? styles.latencyButtonTextDisabled
                      : null,
                  ]}
                >
                  Earlier
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.tracksCard}>
          <Text style={styles.sectionTitle}>Tracks</Text>

          {tracks.length > 0 ? (
            <View style={styles.trackList}>
              {tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isRecording={isRecording}
                  isPlaying={playingTrackId === track.id}
                  isPlayingInSession={isSessionPlaying && Boolean(track.localUri) && !track.muted}
                  onDeletePress={() => {
                    handleDeletePress(track);
                  }}
                  onMutePress={() => {
                    void handleMutePress(track);
                  }}
                  onPlayPress={() => {
                    void playTrack(track);
                  }}
                  onRedoPress={() => {
                    handleRedoPress(track);
                  }}
                  onRenamePress={() => {
                    handleRenamePress(track);
                  }}
                  onVolumeChange={(volume) => {
                    previewTrackVolume(track, volume);
                  }}
                  onVolumeChangeComplete={(volume) => {
                    handleVolumeChangeComplete(track, volume);
                  }}
                />
              ))}
            </View>
          ) : (
            <>
              <Text style={styles.emptyTitle}>No tracks yet</Text>
              <Text style={styles.emptyText}>
                Tap Record to capture your first guitar, vocal, percussion, or melody idea.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {syncToastText ? (
        <Animated.View
          style={[
            styles.toastOverlay,
            {
              opacity: syncToastOpacity,
              transform: [{ translateX: syncToastTranslateX }],
            },
          ]}
        >
          <Text style={styles.toastText}>{syncToastText}</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function TrackCard({
  track,
  isRecording,
  isPlaying,
  isPlayingInSession,
  onDeletePress,
  onMutePress,
  onPlayPress,
  onRedoPress,
  onRenamePress,
  onVolumeChange,
  onVolumeChangeComplete,
}: {
  track: LoopTrack;
  isRecording: boolean;
  isPlaying: boolean;
  isPlayingInSession: boolean;
  onDeletePress: () => void;
  onMutePress: () => void;
  onPlayPress: () => void;
  onRedoPress: () => void;
  onRenamePress: () => void;
  onVolumeChange: (volume: number) => void;
  onVolumeChangeComplete: (volume: number) => void;
}) {
  const hasAudio = Boolean(track.localUri);
  const [draftVolume, setDraftVolume] = useState(track.volume);
  const cloudSyncBadge = getCloudSyncBadge(track.cloudSyncStatus);

  useEffect(() => {
    setDraftVolume(track.volume);
  }, [track.volume]);

  return (
    <View style={styles.trackCard}>
      <View style={styles.trackInfo}>
        <View style={styles.trackNameRow}>
          <Text style={styles.trackName}>{track.name}</Text>

          <Pressable
            style={styles.editNameButton}
            onPress={onRenamePress}
            accessibilityRole="button"
            accessibilityLabel={`Rename ${track.name}`}
          >
            <Text style={styles.editNameButtonText}>✎</Text>
          </Pressable>
        </View>

        <Text style={styles.trackMeta}>
          {formatDuration(track.durationMs)} · volume {Math.round(draftVolume * 100)}%
        </Text>

        <View style={styles.volumeControl}>
          <Slider
            style={styles.volumeSlider}
            value={draftVolume}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            minimumTrackTintColor="#38BDF8"
            maximumTrackTintColor="#334155"
            thumbTintColor="#F9FAFB"
            onValueChange={(volume) => {
              setDraftVolume(volume);
              onVolumeChange(volume);
            }}
            onSlidingComplete={(volume) => {
              setDraftVolume(volume);
              onVolumeChangeComplete(volume);
            }}
          />
        </View>

        <View style={styles.trackControls}>
          <Pressable
            style={[
              styles.trackPlayButton,
              !hasAudio || track.muted ? styles.trackPlayButtonDisabled : null,
            ]}
            onPress={onPlayPress}
            disabled={!hasAudio || track.muted}
          >
            <Text
              style={[
                styles.trackPlayButtonText,
                !hasAudio || track.muted ? styles.trackPlayButtonTextDisabled : null,
              ]}
            >
              {!hasAudio ? 'No audio yet' : track.muted ? 'Muted' : isPlaying ? 'Stop' : 'Play'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.trackMuteButton, track.muted ? styles.trackMuteButtonActive : null]}
            onPress={onMutePress}
          >
            <Text
              style={[
                styles.trackMuteButtonText,
                track.muted ? styles.trackMuteButtonTextActive : null,
              ]}
            >
              {track.muted ? 'Unmute' : 'Mute'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.trackRedoButton,
              !hasAudio || isRecording ? styles.trackRedoButtonDisabled : null,
            ]}
            onPress={onRedoPress}
            disabled={!hasAudio || isRecording}
          >
            <Text
              style={[
                styles.trackRedoButtonText,
                !hasAudio || isRecording ? styles.trackRedoButtonTextDisabled : null,
              ]}
            >
              Redo
            </Text>
          </Pressable>

          <Pressable style={styles.trackDeleteButton} onPress={onDeletePress}>
            <Text style={styles.trackDeleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.trackBadges}>
        {isPlayingInSession ? <Text style={styles.playingBadge}>Playing</Text> : null}
        {track.localUri ? <Text style={styles.recordedBadge}>Recorded</Text> : null}
        {track.localUri ? (
          <Text style={[styles.cloudSyncBadge, cloudSyncBadge.style]}>{cloudSyncBadge.label}</Text>
        ) : null}
        {track.muted ? <Text style={styles.mutedBadge}>Muted</Text> : null}
        {track.solo ? <Text style={styles.soloBadge}>Solo</Text> : null}
      </View>
    </View>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getCloudSyncBadge(status: LoopTrackCloudSyncStatus) {
  switch (status) {
    case 'syncing':
      return {
        label: 'Syncing',
        style: styles.cloudSyncBadgeSyncing,
      };
    case 'synced':
      return {
        label: 'Synced',
        style: styles.cloudSyncBadgeSynced,
      };
    case 'sync-failed':
      return {
        label: 'Sync failed',
        style: styles.cloudSyncBadgeFailed,
      };
    case 'local-only':
      return {
        label: 'Local only',
        style: styles.cloudSyncBadgeLocalOnly,
      };
  }
}

function getSessionTracksAfterSave(playableTracks: LoopTrack[], savedTrack: LoopTrack) {
  return [...playableTracks.filter((track) => track.id !== savedTrack.id), savedTrack]
    .filter((track) => track.localUri && !track.muted)
    .sort((left, right) => left.orderIndex - right.orderIndex);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    padding: 20,
    paddingBottom: 80,
    gap: 18,
  },
  notFoundContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 16,
  },
  projectHeader: {
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 8,
  },
  eyebrow: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 32,
    fontWeight: '800',
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  projectEditButton: {
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  projectEditButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: '#450A0A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 14,
    fontWeight: '700',
  },
  toastOverlay: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    zIndex: 20,
    pointerEvents: 'none',
    backgroundColor: '#172554',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: {
          width: 0,
          height: 6,
        },
        elevation: 8,
      },
    }),
  },
  toastText: {
    color: '#BFDBFE',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  transportCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 16,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '800',
  },
  transportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recordButton: {
    flex: 1,
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#F97316',
  },
  recordButtonText: {
    color: '#082F49',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '800',
  },
  sessionButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopSessionButton: {
    backgroundColor: '#F97316',
  },
  sessionButtonDisabled: {
    backgroundColor: '#1F2937',
  },
  sessionButtonText: {
    color: '#052E16',
    fontSize: 16,
    fontWeight: '800',
  },
  sessionButtonTextDisabled: {
    color: '#94A3B8',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  latencyRow: {
    gap: 10,
  },
  latencyLabel: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  latencyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  latencyButton: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  latencyButtonDisabled: {
    opacity: 0.45,
  },
  latencyButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '800',
  },
  latencyButtonTextDisabled: {
    color: '#64748B',
  },
  latencyValue: {
    minWidth: 72,
    textAlign: 'center',
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '800',
  },
  tracksCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 14,
  },
  trackList: {
    gap: 12,
  },
  trackCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  trackName: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '800',
  },
  trackNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameButton: {
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  editNameButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '900',
  },
  trackMeta: {
    color: '#94A3B8',
    fontSize: 14,
  },
  volumeControl: {
    marginTop: 6,
  },
  volumeSlider: {
    width: '100%',
    height: 36,
  },
  trackControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  trackRedoButton: {
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackRedoButtonDisabled: {
    backgroundColor: '#111827',
  },
  trackRedoButtonText: {
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '800',
  },
  trackRedoButtonTextDisabled: {
    color: '#64748B',
  },
  trackBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  playingBadge: {
    color: '#DCFCE7',
    backgroundColor: '#1a9848',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  recordedBadge: {
    color: '#BAE6FD',
    backgroundColor: '#075985',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  cloudSyncBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  cloudSyncBadgeLocalOnly: {
    color: '#E2E8F0',
    backgroundColor: '#334155',
  },
  cloudSyncBadgeSyncing: {
    color: '#BFDBFE',
    backgroundColor: '#1E3A8A',
  },
  cloudSyncBadgeSynced: {
    color: '#BBF7D0',
    backgroundColor: '#064E3B',
  },
  cloudSyncBadgeFailed: {
    color: '#FECACA',
    backgroundColor: '#7F1D1D',
  },
  mutedBadge: {
    color: '#FCA5A5',
    backgroundColor: '#450A0A',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  soloBadge: {
    color: '#BFDBFE',
    backgroundColor: '#172554',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyTitle: {
    color: '#E5E7EB',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#082F49',
    fontSize: 16,
    fontWeight: '800',
  },
  trackPlayButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#38BDF8',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trackPlayButtonDisabled: {
    backgroundColor: '#1F2937',
  },
  trackPlayButtonText: {
    color: '#082F49',
    fontSize: 13,
    fontWeight: '800',
  },
  trackPlayButtonTextDisabled: {
    color: '#64748B',
  },
  trackMuteButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trackMuteButtonActive: {
    backgroundColor: '#450A0A',
  },
  trackMuteButtonText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '800',
  },
  trackMuteButtonTextActive: {
    color: '#FCA5A5',
  },
  trackDeleteButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#450A0A',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trackDeleteButtonText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '800',
  },
});
