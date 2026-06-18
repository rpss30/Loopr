import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProjects } from '../../features/projects/project-store';

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const { getProjectById, isLoadingProjects } = useProjects();

  const project = getProjectById(params.projectId);

  if (isLoadingProjects) {
    return (
        <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
            <Text style={styles.title}>Loading project...</Text>
            <Text style={styles.emptyText}>Checking saved Loopr projects on this device.</Text>
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
            {project.bpm} BPM · {project.trackCount} recorded{' '}
            {project.trackCount === 1 ? 'track' : 'tracks'}
          </Text>
        </View>

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
            Recording and playback will be added after the project screens and local storage are
            stable.
          </Text>
        </View>

        <View style={styles.emptyTracksCard}>
          <Text style={styles.sectionTitle}>Tracks</Text>
          <Text style={styles.emptyTitle}>No tracks yet</Text>
          <Text style={styles.emptyText}>
            Soon you’ll be able to record guitar, vocals, percussion, or imported clips into this
            workspace.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  emptyTracksCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 10,
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