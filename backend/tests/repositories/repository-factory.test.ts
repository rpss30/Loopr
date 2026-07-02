import { describe, expect, it } from 'vitest';

import { DynamoDbProjectRepository } from '../../src/repositories/dynamodb-project.repository';
import { DynamoDbSessionRepository } from '../../src/repositories/dynamodb-session.repository';
import { DynamoDbTrackRepository } from '../../src/repositories/dynamodb-track.repository';
import { InMemoryProjectRepository } from '../../src/repositories/in-memory-project.repository';
import { InMemorySessionRepository } from '../../src/repositories/in-memory-session.repository';
import { InMemoryTrackRepository } from '../../src/repositories/in-memory-track.repository';
import {
  createRepositories,
  createTestMemoryRepositories,
} from '../../src/repositories/repository-factory';

const tableEnv = {
  DYNAMODB_METADATA_TABLE_NAME: 'loopr-test-metadata',
};

describe('repository factory', () => {
  it('creates shared in-memory repositories for memory persistence', () => {
    const repositories = createRepositories({
      PERSISTENCE_DRIVER: 'memory',
      ...tableEnv,
    });

    expect(repositories.projectRepository).toBeInstanceOf(InMemoryProjectRepository);
    expect(repositories.sessionRepository).toBeInstanceOf(InMemorySessionRepository);
    expect(repositories.trackRepository).toBeInstanceOf(InMemoryTrackRepository);
  });

  it('creates DynamoDB repositories for DynamoDB persistence', () => {
    const client = {
      send: async () => ({}),
    };

    const repositories = createRepositories(
      {
        PERSISTENCE_DRIVER: 'dynamodb',
        ...tableEnv,
      },
      client as never
    );

    expect(repositories.projectRepository).toBeInstanceOf(DynamoDbProjectRepository);
    expect(repositories.sessionRepository).toBeInstanceOf(DynamoDbSessionRepository);
    expect(repositories.trackRepository).toBeInstanceOf(DynamoDbTrackRepository);
  });

  it('creates isolated memory repositories for tests', () => {
    const first = createTestMemoryRepositories();
    const second = createTestMemoryRepositories();

    expect(first.projectRepository).toBeInstanceOf(InMemoryProjectRepository);
    expect(first.sessionRepository).toBeInstanceOf(InMemorySessionRepository);
    expect(first.trackRepository).toBeInstanceOf(InMemoryTrackRepository);
    expect(first.projectRepository).not.toBe(second.projectRepository);
    expect(first.sessionRepository).not.toBe(second.sessionRepository);
    expect(first.trackRepository).not.toBe(second.trackRepository);
  });
});
