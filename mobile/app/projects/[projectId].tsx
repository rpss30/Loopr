import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProjects } from '../../features/projects/project-store';
import { useTracks } from '../../features/tracks/track-store';
import { LoopTrack } from '../../types/track';

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const { getProjectById, isLoadingProjects } = useProjects();
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

    deleteTrack(track.id);
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
    if (playingTrackId !== track.id || !soundRef.current) {
      return;
    }

    void soundRef.current.setVolumeAsync(volume);
  };

  const handleVolumeChangeComplete = (track: LoopTrack, volume: number) => {
    updateTrackVolume(track.id, volume);

    if (playingTrackId === track.id && soundRef.current) {
      void soundRef.current.setVolumeAsync(volume);
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
  onDeletePress,
  onMutePress,
  onPlayPress,
  onRenamePress,
  onVolumeChange,
  onVolumeChangeComplete,
}: {
  track: LoopTrack;
  isPlaying: boolean;
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
