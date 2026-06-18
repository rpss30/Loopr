import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProjectProvider } from '../features/projects/project-store';

export default function RootLayout() {
  return (
    <ProjectProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#111827',
          },
          headerTintColor: '#F9FAFB',
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: '#0F172A',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Loopr',
          }}
        />
        <Stack.Screen
          name="create-project"
          options={{
            title: 'Create Project',
          }}
        />
        <Stack.Screen
          name="projects/[projectId]"
          options={{
            title: 'Loop Workspace',
          }}
        />
      </Stack>

      <StatusBar style="light" />
    </ProjectProvider>
  );
}