import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProjects } from '../../features/projects/project-store';
import { useTracks } from '../../features/tracks/track-store';
import { LoopTrack } from '../../types/track';

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const { getProjectById, isLoadingProjects } = useProjects();
  const { getTracksByProjectId, isLoadingTracks, trackStorageError } = useTracks();

  const project = getProjectById(params.projectId);
  const tracks = project ? getTracksByProjectId(project.id) : [];
  const isLoading = isLoadingProjects || isLoadingTracks;

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
            <Pressable style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>Record</Text>
            </Pressable>

            <Pressable style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>Play</Text>
            </Pressable>
          </View>

          <Text style={styles.helperText}>
            Recording and playback will be added next. This screen now has real track metadata
            ready for recorded audio.
          </Text>
        </View>

        <View style={styles.tracksCard}>
          <Text style={styles.sectionTitle}>Tracks</Text>

          {tracks.length > 0 ? (
            <View style={styles.trackList}>
              {tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </View>
          ) : (
            <>
              <Text style={styles.emptyTitle}>No tracks yet</Text>
              <Text style={styles.emptyText}>
                Soon you’ll be able to record guitar, vocals, percussion, or imported clips into
                this workspace.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrackCard({ track }: { track: LoopTrack }) {
  return (
    <View style={styles.trackCard}>
      <View style={styles.trackInfo}>
        <Text style={styles.trackName}>{track.name}</Text>
        <Text style={styles.trackMeta}>
          {formatDuration(track.durationMs)} · volume {Math.round(track.volume * 100)}%
        </Text>
      </View>

      <View style={styles.trackBadges}>
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
  trackMeta: {
    color: '#94A3B8',
    fontSize: 14,
  },
  trackBadges: {
    alignItems: 'flex-end',
    gap: 6,
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
});