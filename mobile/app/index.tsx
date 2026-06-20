import { router } from 'expo-router';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProjects } from '../features/projects/project-store';
import { useTracks } from '../features/tracks/track-store';

export default function ProjectListScreen() {
  const { projects, isLoadingProjects, projectStorageError, renameProject, deleteProject } =
    useProjects();
  const { deleteTracksByProjectId, getTrackCountForProject, isLoadingTracks, trackStorageError } =
    useTracks();

  const handleRenameProjectPress = (projectId: string, currentName: string) => {
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
                  onPress: () => {
                    handleRenameProjectPress(projectId, currentName);
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]);

              return;
            }

            renameProject(projectId, trimmedName);
          },
        },
      ],
      'plain-text',
      currentName
    );
  };

  const handleDeleteProjectPress = (projectId: string, projectName: string) => {
    Alert.alert(
      'Delete project?',
      `"${projectName}" and its track metadata will be removed from Loopr.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTracksByProjectId(projectId);
            deleteProject(projectId);
          },
        },
      ]
    );
  };

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
          {projects.map((project) => {
            const trackCount = isLoadingTracks
              ? project.trackCount
              : getTrackCountForProject(project.id);

            return (
              <View key={project.id} style={styles.projectCard}>
                <Pressable
                  style={styles.projectCardMain}
                  onPress={() => {
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  <View style={styles.projectText}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectMeta}>
                      {project.bpm} BPM · {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.projectEditButton}
                  onPress={() => {
                    handleRenameProjectPress(project.id, project.name);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${project.name}`}
                >
                  <Text style={styles.projectEditButtonText}>✎</Text>
                </Pressable>

                <Pressable
                  style={styles.projectDeleteButton}
                  onPress={() => {
                    handleDeleteProjectPress(project.id, project.name);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${project.name}`}
                >
                  <Text style={styles.projectDeleteButtonText}>Delete</Text>
                </Pressable>

                <Pressable
                  style={styles.projectArrowButton}
                  onPress={() => {
                    router.push(`/projects/${project.id}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${project.name}`}
                >
                  <Text style={styles.cardArrow}>›</Text>
                </Pressable>
              </View>
            );
          })}
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
    gap: 12,
  },
  projectCardMain: {
    flex: 1,
  },
  projectText: {
    flex: 1,
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
  projectDeleteButton: {
    backgroundColor: '#450A0A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  projectDeleteButtonText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
  },
  projectArrowButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
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
