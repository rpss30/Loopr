import { Link, router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProjects } from '../features/projects/project-store';
import { useTracks } from '../features/tracks/track-store';

export default function ProjectListScreen() {
  const { projects, isLoadingProjects, projectStorageError } = useProjects();
  const { getTrackCountForProject, isLoadingTracks, trackStorageError } = useTracks();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Mobile loop workspace</Text>
          <Text style={styles.title}>Capture layered musical ideas.</Text>
          <Text style={styles.subtitle}>
            Create loop projects, record tracks, and build simple layered sessions from your phone.
          </Text>

          <Pressable style={styles.primaryButton} onPress={() => router.push('/create-project')}>
            <Text style={styles.primaryButtonText}>Create new project</Text>
          </Pressable>
        </View>

        {isLoadingProjects ? (
        <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>Loading saved projects...</Text>
        </View>
        ) : null}

        {projectStorageError ? (
        <View style={styles.errorCard}>
            <Text style={styles.errorText}>{projectStorageError}</Text>
        </View>
        ) : null}

        {trackStorageError ? (
        <View style={styles.errorCard}>
            <Text style={styles.errorText}>{trackStorageError}</Text>
        </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Projects</Text>
          <Text style={styles.sectionCaption}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </Text>
        </View>

        <View style={styles.projectList}>
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} asChild>
              <Pressable style={styles.projectCard}>
                <View>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectMeta}>
                    {project.bpm} BPM · {isLoadingTracks ? project.trackCount : getTrackCountForProject(project.id)}{' '}
                    {(isLoadingTracks ? project.trackCount : getTrackCountForProject(project.id)) === 1
                        ? 'track'
                        : 'tracks'}
                  </Text>
                </View>

                <Text style={styles.cardArrow}>›</Text>
              </Pressable>
            </Link>
          ))}
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
    gap: 24,
  },
  hero: {
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 12,
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
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#38BDF8',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#082F49',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionCaption: {
    color: '#94A3B8',
    fontSize: 14,
  },
  projectList: {
    gap: 12,
  },
  projectCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectName: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  projectMeta: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  cardArrow: {
    color: '#38BDF8',
    fontSize: 32,
    fontWeight: '300',
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
});