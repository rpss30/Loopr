import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoopProject } from '../../src/models/project';
import { DynamoDbProjectRepository } from '../../src/repositories/dynamodb-project.repository';

const tableEnv = {
  DYNAMODB_METADATA_TABLE_NAME: 'loopr-test-metadata',
};

const project: LoopProject = {
  id: 'project-1',
  name: 'Acoustic Project',
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

describe('DynamoDbProjectRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a project item with DynamoDB keys and indexes', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({});

    const repository = new DynamoDbProjectRepository(client as never, tableEnv);

    const result = await repository.createProject(project);

    expect(result).toEqual(project);
    expect(client.send).toHaveBeenCalledTimes(1);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      Item: {
        pk: 'PROJECT#project-1',
        sk: 'METADATA',
        gsi1pk: 'PROJECTS',
        gsi1sk: 'UPDATED_AT#2026-01-02T00:00:00.000Z#PROJECT#project-1',
        id: 'project-1',
        projectId: 'project-1',
        entityType: 'PROJECT',
        name: 'Acoustic Project',
        bpm: 90,
        trackCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    });
  });

  it('gets a project by id', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Item: {
        pk: 'PROJECT#project-1',
        sk: 'METADATA',
        gsi1pk: 'PROJECTS',
        gsi1sk: 'UPDATED_AT#2026-01-02T00:00:00.000Z#PROJECT#project-1',
        projectId: 'project-1',
        entityType: 'PROJECT',
        name: 'Acoustic Project',
        bpm: 90,
        trackCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    });

    const repository = new DynamoDbProjectRepository(client as never, tableEnv);

    const result = await repository.getProjectById('project-1');

    expect(result).toEqual(project);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(GetCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      Key: {
        pk: 'PROJECT#project-1',
        sk: 'METADATA',
      },
    });
  });

  it('returns null when a project does not exist', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({});

    const repository = new DynamoDbProjectRepository(client as never, tableEnv);

    const result = await repository.getProjectById('missing-project');

    expect(result).toBeNull();
  });

  it('lists projects from the project list index', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [
        {
          pk: 'PROJECT#project-1',
          sk: 'METADATA',
          gsi1pk: 'PROJECTS',
          gsi1sk: 'UPDATED_AT#2026-01-02T00:00:00.000Z#PROJECT#project-1',
          projectId: 'project-1',
          entityType: 'PROJECT',
          name: 'Acoustic Project',
          bpm: 90,
          trackCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });

    const repository = new DynamoDbProjectRepository(client as never, tableEnv);

    const result = await repository.listProjects();

    expect(result).toEqual([project]);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(QueryCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'PROJECTS',
      },
      ScanIndexForward: false,
    });
  });

  it('does not support reset', async () => {
    const client = createMockClient();

    const repository = new DynamoDbProjectRepository(client as never, tableEnv);

    await expect(repository.reset()).rejects.toThrow(
      'DynamoDB project repository reset is not supported.'
    );
  });
});
