import { Link, router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const mockProjects = [
  {
    id: 'demo-project-1',
    name: 'Acoustic Groove',
    bpm: 92,
    trackCount: 3,
  },
  {
    id: 'demo-project-2',
    name: 'Late Night Loop',
    bpm: 110,
    trackCount: 2,
  },
];

export default function ProjectListScreen() {
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Projects</Text>
          <Text style={styles.sectionCaption}>Mock data for now</Text>
        </View>

        <View style={styles.projectList}>
          {mockProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} asChild>
              <Pressable style={styles.projectCard}>
                <View>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectMeta}>
                    {project.bpm} BPM · {project.trackCount} tracks
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
});