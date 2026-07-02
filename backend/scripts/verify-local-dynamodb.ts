import { config } from 'dotenv';

import { createDynamoDbDocumentClient } from '../src/aws/dynamodb-client';
import { loadEnv } from '../src/config/env';
import { DynamoDbProjectRepository } from '../src/repositories/dynamodb-project.repository';
import { DynamoDbSessionRepository } from '../src/repositories/dynamodb-session.repository';
import { DynamoDbTrackRepository } from '../src/repositories/dynamodb-track.repository';
import { ProjectService } from '../src/services/project.service';
import { SessionService } from '../src/services/session.service';
import { TrackService } from '../src/services/track.service';

config({ path: '.env.dynamodb-local' });
config();

const localEnv = loadEnv({
  ...process.env,
  PERSISTENCE_DRIVER: 'dynamodb',
  AWS_REGION: process.env.AWS_REGION ?? 'us-west-2',
  DYNAMODB_METADATA_TABLE_NAME: process.env.DYNAMODB_METADATA_TABLE_NAME ?? 'loopr-local-metadata',
  DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8001',
});

const client = createDynamoDbDocumentClient(localEnv);

const projectService = new ProjectService(new DynamoDbProjectRepository(client, localEnv));

const sessionService = new SessionService(new DynamoDbSessionRepository(client, localEnv));

const trackRepository = new DynamoDbTrackRepository(client, localEnv);

const trackService = new TrackService(trackRepository);

async function verifyLocalDynamoDb() {
  if (!localEnv.DYNAMODB_ENDPOINT) {
    throw new Error('DYNAMODB_ENDPOINT is required for local verification.');
  }

  const timestamp = Date.now();
  const projectName = `Local DynamoDB Project ${timestamp}`;
  const sessionName = `Local DynamoDB Session ${timestamp}`;
  const trackName = `Local DynamoDB Track ${timestamp}`;

  const project = await projectService.createProject({
    name: projectName,
    bpm: 92,
  });

  const fetchedProject = await projectService.getProjectById(project.id);

  if (!fetchedProject) {
    throw new Error('Expected created project to be fetchable by ID.');
  }

  const projects = await projectService.listProjects();

  const session = await sessionService.createSession({
    projectId: project.id,
    name: sessionName,
    bpm: 92,
  });

  const fetchedSession = await sessionService.getSessionById(session.id);

  if (!fetchedSession) {
    throw new Error('Expected created session to be fetchable by ID.');
  }

  const sessions = await sessionService.listSessions();

  const track = await trackService.createTrack({
    projectId: project.id,
    sessionId: session.id,
    name: trackName,
    durationMs: 12000,
    volume: 0.8,
    isMuted: false,
    s3Bucket: localEnv.S3_AUDIO_BUCKET_NAME,
    s3Key: `projects/${project.id}/sessions/${session.id}/tracks/local-verification-track.m4a`,
    contentType: 'audio/mp4',
  });

  const fetchedTrack = await trackService.getTrackById(track.id);

  if (!fetchedTrack) {
    throw new Error('Expected created track to be fetchable by ID.');
  }

  const tracks = await trackService.listTracks();
  const sessionTracks = await trackRepository.listTracksBySession(project.id, session.id);

  if (!sessionTracks.some((sessionTrack) => sessionTrack.id === track.id)) {
    throw new Error('Expected created track to be queryable by project/session.');
  }

  console.log('Verified DynamoDB Local repository flow.');
  console.log(
    JSON.stringify(
      {
        tableName: localEnv.DYNAMODB_METADATA_TABLE_NAME,
        endpoint: localEnv.DYNAMODB_ENDPOINT,
        project,
        fetchedProject,
        projectCount: projects.length,
        session,
        fetchedSession,
        sessionCount: sessions.length,
        track,
        fetchedTrack,
        trackCount: tracks.length,
        sessionTrackCount: sessionTracks.length,
      },
      null,
      2
    )
  );
}

verifyLocalDynamoDb().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
