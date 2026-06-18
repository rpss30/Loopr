import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useProjects } from '../features/projects/project-store';

export default function CreateProjectScreen() {
  const { createProject } = useProjects();
  const [name, setName] = useState('');
  const [bpm, setBpm] = useState('100');

  const handleCreateProject = () => {
    const trimmedName = name.trim();
    const parsedBpm = Number(bpm);

    if (!trimmedName) {
      Alert.alert('Project name required', 'Give your loop project a name before continuing.');
      return;
    }

    if (!Number.isFinite(parsedBpm) || parsedBpm < 40 || parsedBpm > 240) {
      Alert.alert('Invalid BPM', 'Enter a BPM between 40 and 240.');
      return;
    }

    const project = createProject({
      name: trimmedName,
      bpm: parsedBpm,
    });

    router.replace(`/projects/${project.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Start a new loop</Text>
          <Text style={styles.subtitle}>
            Name the idea and set a starting tempo. Recording comes in the next phase.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Project name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sunday acoustic riff"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BPM</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#64748B"
              value={bpm}
              onChangeText={setBpm}
              keyboardType="number-pad"
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={handleCreateProject}>
            <Text style={styles.primaryButtonText}>Create workspace</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 28,
  },
  header: {
    gap: 10,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 18,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F9FAFB',
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 8,
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