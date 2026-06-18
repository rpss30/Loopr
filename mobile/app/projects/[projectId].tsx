import { useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LoopWorkspaceScreen() {
  const params = useLocalSearchParams<{
    projectId: string;
    name?: string;
    bpm?: string;
  }>();

  const projectName = params.name ?? getMockProjectName(params.projectId);
  const bpm = params.bpm ?? getMockProjectBpm(params.projectId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.projectHeader}>
          <Text style={styles.eyebrow}>Loop Workspace</Text>
          <Text style={styles.title}>{projectName}</Text>
          <Text style={styles.subtitle}>{bpm} BPM · 0 recorded tracks</Text>
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
            Recording and playback will be added after the navigation and project screens are stable.
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

function getMockProjectName(projectId?: string) {
  if (projectId === 'demo-project-1') {
    return 'Acoustic Groove';
  }

  if (projectId === 'demo-project-2') {
    return 'Late Night Loop';
  }

  return 'Untitled Loop';
}

function getMockProjectBpm(projectId?: string) {
  if (projectId === 'demo-project-1') {
    return '92';
  }

  if (projectId === 'demo-project-2') {
    return '110';
  }

  return '100';
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
});