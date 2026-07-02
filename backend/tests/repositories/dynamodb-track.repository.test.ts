import { PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoopTrackMetadata } from '../../src/models/track';
import { DynamoDbTrackRepository } from '../../src/repositories/dynamodb-track.repository';

const tableEnv = {
  DYNAMODB_METADATA_TABLE_NAME: 'loopr-test-metadata',
};

const track: LoopTrackMetadata = {
  id: 'track-1',
  projectId: 'project-1',
  sessionId: 'session-1',
  name: 'Guitar Layer',
  durationMs: 12000,
  volume: 0.75,
  isMuted: false,
  s3Bucket: 'loopr-audio-local',
  s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
  contentType: 'audio/mp4',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function createMockClient() {
  return {
    send: vi.fn(),
  };
}

function createTrackItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    pk: 'PROJECT#project-1',
    sk: 'SESSION#session-1#TRACK#track-1',
    gsi2pk: 'TRACK#track-1',
    gsi2sk: 'METADATA',
    id: 'track-1',
    trackId: 'track-1',
    projectId: 'project-1',
    sessionId: 'session-1',
    entityType: 'TRACK',
    name: 'Guitar Layer',
    durationMs: 12000,
    volume: 0.75,
    isMuted: false,
    s3Bucket: 'loopr-audio-local',
    s3Key: 'projects/project-1/sessions/session-1/tracks/track-1.m4a',
    contentType: 'audio/mp4',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('DynamoDbTrackRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a track item with DynamoDB keys and indexes', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({});

    const repository = new DynamoDbTrackRepository(client as never, tableEnv);

    const result = await repository.createTrack(track);

    expect(result).toEqual(track);
    expect(client.send).toHaveBeenCalledTimes(1);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      Item: createTrackItem(),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    });
  });

  it('gets a track by id using the track lookup index', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [createTrackItem()],
    });

    const repository = new DynamoDbTrackRepository(client as never, tableEnv);

    const result = await repository.getTrackById('track-1');

    expect(result).toEqual(track);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(QueryCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :gsi2pk AND gsi2sk = :gsi2sk',
      ExpressionAttributeValues: {
        ':gsi2pk': 'TRACK#track-1',
        ':gsi2sk': 'METADATA',
      },
      Limit: 1,
    });
  });

  it('returns null when a track does not exist', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [],
    });

    const repository = new DynamoDbTrackRepository(client as never, tableEnv);

    const result = await repository.getTrackById('missing-track');

    expect(result).toBeNull();
  });

  it('lists tracks by scanning track metadata items', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [createTrackItem()],
    });

    const repository = new DynamoDbTrackRepository(client as never, tableEnv);

    const result = await repository.listTracks();

    expect(result).toEqual([track]);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(ScanCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      FilterExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'TRACK',
      },
    });
  });

  it('lists tracks by session using the project partition', async () => {
    const client = createMockClient();
    client.send.mockResolvedValueOnce({
      Items: [createTrackItem()],
    });

    const repository = new DynamoDbTrackRepository(client as never, tableEnv);

    const result = await repository.listTracksBySession('project-1', 'session-1');

    expect(result).toEqual([track]);

    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(QueryCommand);
    expect(command.input).toEqual({
      TableName: 'loopr-test-metadata',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': 'PROJECT#project-1',
        ':skPrefix': 'SESSION#session-1#TRACK#',
      },
    });
  });

  it('does not support reset', async () => {
    const client = createMockClient();

    const repository = new DynamoDbTrackRepository(client as never, tableEnv);

    await expect(repository.reset()).rejects.toThrow(
      'DynamoDB track repository reset is not supported.'
    );
  });
});
