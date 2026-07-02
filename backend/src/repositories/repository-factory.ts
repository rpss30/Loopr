import { type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { dynamoDbDocumentClient } from '../aws/dynamodb-client';
import { BackendEnv, env } from '../config/env';
import { DynamoDbProjectRepository } from './dynamodb-project.repository';
import { DynamoDbSessionRepository } from './dynamodb-session.repository';
import { DynamoDbTrackRepository } from './dynamodb-track.repository';
import {
  InMemoryProjectRepository,
  projectRepository as inMemoryProjectRepository,
} from './in-memory-project.repository';
import {
  InMemorySessionRepository,
  sessionRepository as inMemorySessionRepository,
} from './in-memory-session.repository';
import {
  InMemoryTrackRepository,
  trackRepository as inMemoryTrackRepository,
} from './in-memory-track.repository';
import { ProjectRepository } from './project.repository';
import { SessionRepository } from './session.repository';
import { TrackRepository } from './track.repository';

export type AppRepositories = {
  projectRepository: ProjectRepository;
  sessionRepository: SessionRepository;
  trackRepository: TrackRepository;
};

type RepositoryFactoryEnv = Pick<BackendEnv, 'PERSISTENCE_DRIVER' | 'DYNAMODB_METADATA_TABLE_NAME'>;

export function createRepositories(
  sourceEnv: RepositoryFactoryEnv,
  client: DynamoDBDocumentClient = dynamoDbDocumentClient
): AppRepositories {
  if (sourceEnv.PERSISTENCE_DRIVER === 'dynamodb') {
    return {
      projectRepository: new DynamoDbProjectRepository(client, sourceEnv),
      sessionRepository: new DynamoDbSessionRepository(client, sourceEnv),
      trackRepository: new DynamoDbTrackRepository(client, sourceEnv),
    };
  }

  return {
    projectRepository: inMemoryProjectRepository,
    sessionRepository: inMemorySessionRepository,
    trackRepository: inMemoryTrackRepository,
  };
}

export function createTestMemoryRepositories(): AppRepositories {
  return {
    projectRepository: new InMemoryProjectRepository(),
    sessionRepository: new InMemorySessionRepository(),
    trackRepository: new InMemoryTrackRepository(),
  };
}

export const repositories = createRepositories(env);
