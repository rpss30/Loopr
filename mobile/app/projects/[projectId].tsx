import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProjects } from '../../features/projects/project-store';
import { deleteLocalAudioFile } from '../../features/tracks/audio-file-cleanup';
import { useTracks } from '../../features/tracks/track-store';
import { ensureBackendSessionForProject } from '../../services/project-session-sync';
import { LoopTrack } from '../../types/track';

async function stopAndUnloadSound(sound: Audio.Sound) {
  try {
    const status = await sound.getStatusAsync();

    if (status.isLoaded) {
      await sound.stopAsync();
    }

    await sound.unloadAsync();
  } catch {
    // The sound may already be stopped or unloaded by a playback callback.
  }
}

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const { getProjectById, isLoadingProjects, renameProject } = useProjects();
  const {
    addRecordedTrack,
    deleteTrack,
    getTracksByProjectId,
    isLoadingTracks,
    renameTrack,
    toggleTrackMuted,
    trackStorageError,
    updateTrackVolume,
  } = useTracks();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const soundRef = useRef<Audio.Sound | null>(null);
  const sessionSoundRefs = useRef<Map<string, Audio.Sound>>(new Map());

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isSessionPlaying, setIsSessionPlaying] = useState(false);
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [isEnsuringBackendSession, setIsEnsuringBackendSession] = useState(false);
  const [sessionSyncError, setSessionSyncError] = useState<string | null>(null);

  const project = getProjectById(params.projectId);
  const tracks = project ? getTracksByProjectId(project.id) : [];
  const isLoading = isLoadingProjects || isLoadingTracks;
  const isRecording = recording !== null;
  const playableSessionTracks = tracks.filter((track) => track.localUri && !track.muted);
  const canPlaySession = playableSessionTracks.length > 0;

  useEffect(() => {
    if (!project) {
      setBackendSessionId(null);
      setSessionSyncError(null);
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
        setSessionSyncError(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setBackendSessionId(null);
        setSessionSyncError(
          'Backend session sync unavailable. Recording remains local on this device.'
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
    return () => {
      if (soundRef.current) {
        void stopAndUnloadSound(soundRef.current);
        soundRef.current = null;
      }

      sessionSoundRefs.current.forEach((sound) => {
        void stopAndUnloadSound(sound);
      });

      sessionSoundRefs.current.clear();
    };
  }, []);

  const startRecording = async () => {
    if (!project || recording) {
      return;
    }

    await stopPlayback();
    await stopSessionPlayback();

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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setRecordingDurationMs(0);

      const recordingResult = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          setRecordingDurationMs(status.durationMillis ?? 0);
        },
        250
      );

      setRecording(recordingResult.recording);
    } catch {
      Alert.alert('Recording failed', 'Could not start recording. Try again.');
    }
  };

  const stopRecording = async () => {
    if (!project || !recording) {
      return;
    }

    const activeRecording = recording;
    setRecording(null);

    try {
      await activeRecording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const localUri = activeRecording.getURI();

      if (!localUri) {
        Alert.alert('Recording unavailable', 'Loopr could not find the saved recording file.');
        return;
      }

      addRecordedTrack({
        projectId: project.id,
        localUri,
        durationMs: Math.max(recordingDurationMs, 1000),
      });

      setRecordingDurationMs(0);
    } catch {
      Alert.alert('Recording failed', 'Could not stop and save the recording.');
      setRecordingDurationMs(0);
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
    const activeSounds = Array.from(sessionSoundRefs.current.values());

    sessionSoundRefs.current.clear();
    setIsSessionPlaying(false);

    await Promise.all(activeSounds.map((sound) => stopAndUnloadSound(sound)));
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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.localUri },
        {
          shouldPlay: true,
          volume: track.volume,
        },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync();
            soundRef.current = null;
            setPlayingTrackId(null);
          }
        }
      );

      soundRef.current = sound;
      setPlayingTrackId(track.id);
    } catch {
      Alert.alert('Playback failed', 'Could not play this recording.');
      setPlayingTrackId(null);
    }
  };

  const playSession = async () => {
    if (!canPlaySession) {
      Alert.alert(
        'No playable tracks',
        'Record a track or unmute an existing recorded track before playing the session.'
      );
      return;
    }

    const loadedSounds = new Map<string, Audio.Sound>();

    try {
      await stopPlayback();
      await stopSessionPlayback();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      for (const track of playableSessionTracks) {
        if (!track.localUri) {
          continue;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: track.localUri },
          {
            shouldPlay: false,
            volume: track.volume,
          }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            void stopAndUnloadSound(sound);
            sessionSoundRefs.current.delete(track.id);

            if (sessionSoundRefs.current.size === 0) {
              setIsSessionPlaying(false);
            }
          }
        });

        loadedSounds.set(track.id, sound);
      }

      sessionSoundRefs.current = loadedSounds;
      setIsSessionPlaying(true);

      await Promise.all(Array.from(loadedSounds.values()).map((sound) => sound.playAsync()));
    } catch {
      await Promise.all(Array.from(loadedSounds.values()).map((sound) => sound.unloadAsync()));
      sessionSoundRefs.current.clear();
      setIsSessionPlaying(false);

      Alert.alert('Session playback failed', 'Could not play all recorded tracks.');
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
            {project.bpm} BPM · {tracks.length} recorded {tracks.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>

        {trackStorageError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{trackStorageError}</Text>
          </View>
        ) : null}

        {isEnsuringBackendSession ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>Preparing backend session sync...</Text>
          </View>
        ) : null}

        {backendSessionId ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Backend session ready for future cloud track sync.
            </Text>
          </View>
        ) : null}

        {sessionSyncError ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{sessionSyncError}</Text>
          </View>
        ) : null}

        <View style={styles.transportCard}>
          <Text style={styles.sectionTitle}>Session controls</Text>

          <View style={styles.transportRow}>
            <Pressable
              style={[styles.recordButton, isRecording ? styles.stopButton : null]}
              onPress={isRecording ? stopRecording : startRecording}
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
              ? `Recording... ${formatDuration(recordingDurationMs)}`
              : isSessionPlaying
                ? 'Playing all unmuted recorded tracks in this workspace.'
                : canPlaySession
                  ? `Play ${playableSessionTracks.length} unmuted recorded ${
                      playableSessionTracks.length === 1 ? 'track' : 'tracks'
                    }.`
                  : 'Record a short idea, then use Play all to hear the workspace.'}
          </Text>
        </View>

        <View style={styles.tracksCard}>
          <Text style={styles.sectionTitle}>Tracks</Text>

          {tracks.length > 0 ? (
            <View style={styles.trackList}>
              {tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
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
    </SafeAreaView>
  );
}

function TrackCard({
  track,
  isPlaying,
  isPlayingInSession,
  onDeletePress,
  onMutePress,
  onPlayPress,
  onRenamePress,
  onVolumeChange,
  onVolumeChangeComplete,
}: {
  track: LoopTrack;
  isPlaying: boolean;
  isPlayingInSession: boolean;
  onDeletePress: () => void;
  onMutePress: () => void;
  onPlayPress: () => void;
  onRenamePress: () => void;
  onVolumeChange: (volume: number) => void;
  onVolumeChangeComplete: (volume: number) => void;
}) {
  const hasAudio = Boolean(track.localUri);
  const [draftVolume, setDraftVolume] = useState(track.volume);

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

          <Pressable style={styles.trackDeleteButton} onPress={onDeletePress}>
            <Text style={styles.trackDeleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.trackBadges}>
        {isPlayingInSession ? <Text style={styles.playingBadge}>Playing</Text> : null}
        {track.localUri ? <Text style={styles.recordedBadge}>Recorded</Text> : null}
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
  noticeCard: {
    backgroundColor: '#172554',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D4ED8',
  },
  noticeText: {
    color: '#BFDBFE',
    fontSize: 14,
    fontWeight: '700',
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
