import { PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoopSession } from '../../src/models/session';
import { DynamoDbSessionRepository } from '../../src/repositories/dynamodb-session.repository';

const tableEnv = {
  DYNAMODB_METADATA_TABLE_NAME: 'loopr-test-metadata',
};

const session: LoopSession = {
  id: 'session-1',
  projectId: 'project-1',
  name: 'Verse Loop',
  bpm: 90,
  trackCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function createMockClient() {
  return {
    send: vi.fn(),
  };
}

function createSessionItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    pk: 'PROJECT#project-1',
    sk: 'SESSION#session-1',
    gsi2pk: 'SESSION#session-1',
    gsi2sk: 'METADATA',
    id: 'session-1',
    sessionId: 'session-1',
    projectId: 'project-1',
    entityType: 'SESSION',
    name: 'Verse Loop',
    bpm: 90,
    trackCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('DynamoDbSessionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a session item with DynamoDB keys and indexes', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({});

    const repository = new DynamoDbSessionRepository(client as never, tableEnv);

    const result = await repository.createSession(session);

    expect(result).toEqual(session);
    expect(client.send).toHaveBeenCalledTimes(1);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      Item: createSessionItem(),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    });
  });

  it('gets a session by id using the session lookup index', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [createSessionItem()],
    });

    const repository = new DynamoDbSessionRepository(client as never, tableEnv);

    const result = await repository.getSessionById('session-1');

    expect(result).toEqual(session);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(QueryCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :gsi2pk AND gsi2sk = :gsi2sk',
      ExpressionAttributeValues: {
        ':gsi2pk': 'SESSION#session-1',
        ':gsi2sk': 'METADATA',
      },
      Limit: 1,
    });
  });

  it('returns null when a session does not exist', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [],
    });

    const repository = new DynamoDbSessionRepository(client as never, tableEnv);

    const result = await repository.getSessionById('missing-session');

    expect(result).toBeNull();
  });

  it('lists sessions by scanning session metadata items', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [createSessionItem()],
    });

    const repository = new DynamoDbSessionRepository(client as never, tableEnv);

    const result = await repository.listSessions();

    expect(result).toEqual([session]);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(ScanCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      FilterExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'SESSION',
      },
    });
  });

  it('lists sessions by project using the project partition', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [createSessionItem()],
    });

    const repository = new DynamoDbSessionRepository(client as never, tableEnv);

    const result = await repository.listSessionsByProject('project-1');

    expect(result).toEqual([session]);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(QueryCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': 'PROJECT#project-1',
        ':skPrefix': 'SESSION#',
      },
    });
  });

  it('does not support reset', async () => {
    const client = createMockClient();

    const repository = new DynamoDbSessionRepository(client as never, tableEnv);

    await expect(repository.reset()).rejects.toThrow(
      'DynamoDB session repository reset is not supported.'
    );
  });
});
