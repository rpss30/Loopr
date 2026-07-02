import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';

import { BackendEnv } from '../config/env';
import { LoopTrackMetadata } from '../models/track';
import {
  buildTrackLookupKeys,
  buildTrackPrimaryKey,
  buildTracksBySessionKey,
  DYNAMODB_ENTITY_TYPES,
} from './dynamodb-key-design';
import { TrackRepository } from './track.repository';

type DynamoDbTrackItem = LoopTrackMetadata & {
  pk: string;
  sk: string;
  entityType: typeof DYNAMODB_ENTITY_TYPES.track;
  trackId: string;
  gsi2pk: string;
  gsi2sk: string;
};

type DynamoDbTrackRepositoryEnv = Pick<BackendEnv, 'DYNAMODB_METADATA_TABLE_NAME'>;

export class DynamoDbTrackRepository implements TrackRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly env: DynamoDbTrackRepositoryEnv
  ) {}

  async listTracks() {
    const response = await this.client.send(
      new ScanCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': DYNAMODB_ENTITY_TYPES.track,
        },
      })
    );

    return (response.Items ?? [])
      .map((item) => this.toTrack(item as DynamoDbTrackItem))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listTracksBySession(projectId: string, sessionId: string) {
    const keys = buildTracksBySessionKey(projectId, sessionId);

    const response = await this.client.send(
      new QueryCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': keys.pk,
          ':skPrefix': keys.skPrefix,
        },
      })
    );

    return (response.Items ?? [])
      .map((item) => this.toTrack(item as DynamoDbTrackItem))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTrackById(trackId: string) {
    const lookupKeys = buildTrackLookupKeys(trackId);

    const response = await this.client.send(
      new QueryCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        IndexName: 'gsi2',
        KeyConditionExpression: 'gsi2pk = :gsi2pk AND gsi2sk = :gsi2sk',
        ExpressionAttributeValues: {
          ':gsi2pk': lookupKeys.gsi2pk,
          ':gsi2sk': lookupKeys.gsi2sk,
        },
        Limit: 1,
      })
    );

    const item = response.Items?.[0];

    if (!item) {
      return null;
    }

    return this.toTrack(item as DynamoDbTrackItem);
  }

  async createTrack(track: LoopTrackMetadata) {
    await this.client.send(
      new PutCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        Item: this.toItem(track),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      })
    );

    return track;
  }

  async reset() {
    throw new Error('DynamoDB track repository reset is not supported.');
  }

  private toItem(track: LoopTrackMetadata): DynamoDbTrackItem {
    return {
      ...buildTrackPrimaryKey(track.projectId, track.sessionId, track.id),
      ...buildTrackLookupKeys(track.id),
      ...track,
      entityType: DYNAMODB_ENTITY_TYPES.track,
      trackId: track.id,
    };
  }

  private toTrack(item: DynamoDbTrackItem): LoopTrackMetadata {
    return {
      id: item.trackId,
      projectId: item.projectId,
      sessionId: item.sessionId,
      name: item.name,
      durationMs: item.durationMs,
      volume: item.volume,
      isMuted: item.isMuted,
      s3Bucket: item.s3Bucket,
      s3Key: item.s3Key,
      contentType: item.contentType,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
