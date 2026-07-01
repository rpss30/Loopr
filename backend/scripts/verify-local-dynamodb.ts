import { config } from 'dotenv';

import { createDynamoDbDocumentClient } from '../src/aws/dynamodb-client';
import { loadEnv } from '../src/config/env';
import { DynamoDbProjectRepository } from '../src/repositories/dynamodb-project.repository';
import { DynamoDbSessionRepository } from '../src/repositories/dynamodb-session.repository';
import { ProjectService } from '../src/services/project.service';
import { SessionService } from '../src/services/session.service';

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

async function verifyLocalDynamoDb() {
  if (!localEnv.DYNAMODB_ENDPOINT) {
    throw new Error('DYNAMODB_ENDPOINT is required for local verification.');
  }

  const projectName = `Local DynamoDB Project ${Date.now()}`;
  const sessionName = `Local DynamoDB Session ${Date.now()}`;

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
