import { Audio } from 'expo-av';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useProjects } from '../../features/projects/project-store';
import { useTracks } from '../../features/tracks/track-store';
import { LoopTrack } from '../../types/track';

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const { getProjectById, isLoadingProjects } = useProjects();
  const {
    addRecordedTrack,
    getTracksByProjectId,
    isLoadingTracks,
    renameTrack,
    toggleTrackMuted,
    trackStorageError,
  } = useTracks();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const project = getProjectById(params.projectId);
  const tracks = project ? getTracksByProjectId(project.id) : [];
  const isLoading = isLoadingProjects || isLoadingTracks;
  const isRecording = recording !== null;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (!project || recording) {
      return;
    }

    await stopPlayback();

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

    await activeSound.unloadAsync();
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
        return;
      }

      await stopPlayback();

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

  const handleMutePress = async (track: LoopTrack) => {
    if (playingTrackId === track.id) {
      await stopPlayback();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.projectHeader}>
          <Text style={styles.eyebrow}>Loop Workspace</Text>
          <Text style={styles.title}>{project.name}</Text>
          <Text style={styles.subtitle}>
            {project.bpm} BPM · {tracks.length} recorded {tracks.length === 1 ? 'track' : 'tracks'}
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
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.recordButtonText}>{isRecording ? 'Stop & save' : 'Record'}</Text>
            </Pressable>

            <Pressable style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>Play next</Text>
            </Pressable>
          </View>

          <Text style={styles.helperText}>
            {isRecording
              ? `Recording... ${formatDuration(recordingDurationMs)}`
              : 'Record a short idea. Playback will be added in the next step.'}
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
                  onMutePress={() => {
                    void handleMutePress(track);
                  }}
                  onPlayPress={() => {
                    void playTrack(track);
                  }}
                  onRenameSubmit={(name) => {
                    renameTrack(track.id, name);
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
  onMutePress,
  onPlayPress,
  onRenameSubmit,
}: {
  track: LoopTrack;
  isPlaying: boolean;
  onMutePress: () => void;
  onPlayPress: () => void;
  onRenameSubmit: (name: string) => void;
}) {
  const hasAudio = Boolean(track.localUri);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(track.name);

  useEffect(() => {
    if (!isEditingName) {
      setDraftName(track.name);
    }
  }, [isEditingName, track.name]);

  const saveName = () => {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setDraftName(track.name);
      setIsEditingName(false);
      return;
    }

    onRenameSubmit(trimmedName);
    setDraftName(trimmedName);
    setIsEditingName(false);
  };

  const cancelRename = () => {
    setDraftName(track.name);
    setIsEditingName(false);
  };

  return (
    <View style={styles.trackCard}>
      <View style={styles.trackInfo}>
        {isEditingName ? (
          <View style={styles.renameContainer}>
            <TextInput
              style={styles.trackNameInput}
              value={draftName}
              onChangeText={setDraftName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              autoFocus
              placeholder="Track name"
              placeholderTextColor="#64748B"
            />

            <View style={styles.renameActions}>
              <Pressable style={styles.renameSaveButton} onPress={saveName}>
                <Text style={styles.renameSaveButtonText}>Save</Text>
              </Pressable>

              <Pressable style={styles.renameCancelButton} onPress={cancelRename}>
                <Text style={styles.renameCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.trackNameButton}
            onPress={() => {
              setDraftName(track.name);
              setIsEditingName(true);
            }}
          >
            <Text style={styles.trackName}>{track.name}</Text>
            <Text style={styles.renameHint}>Tap name to rename</Text>
          </Pressable>
        )}
        <Text style={styles.trackMeta}>
          {formatDuration(track.durationMs)} · volume {Math.round(track.volume * 100)}%
        </Text>

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
        </View>
      </View>

      <View style={styles.trackBadges}>
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
  trackNameButton: {
    alignSelf: 'flex-start',
  },
  renameHint: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  renameContainer: {
    gap: 8,
  },
  trackNameInput: {
    color: '#F9FAFB',
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
    fontWeight: '800',
  },
  renameActions: {
    flexDirection: 'row',
    gap: 8,
  },
  renameSaveButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  renameSaveButtonText: {
    color: '#082F49',
    fontSize: 12,
    fontWeight: '800',
  },
  renameCancelButton: {
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  renameCancelButtonText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  trackMeta: {
    color: '#94A3B8',
    fontSize: 14,
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
  recordedBadge: {
    color: '#BBF7D0',
    backgroundColor: '#14532D',
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
    marginTop: 8,
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
});
