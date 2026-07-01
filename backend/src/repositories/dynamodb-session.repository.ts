import {
  GetCommand,
  PutCommand,
  QueryCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';

import { BackendEnv } from '../config/env';
import { LoopSession } from '../models/session';
import {
  buildSessionLookupKeys,
  buildSessionPrimaryKey,
  buildSessionsByProjectKey,
  DYNAMODB_ENTITY_TYPES,
} from './dynamodb-key-design';
import { SessionRepository } from './session.repository';

type DynamoDbSessionItem = LoopSession & {
  pk: string;
  sk: string;
  entityType: typeof DYNAMODB_ENTITY_TYPES.session;
  sessionId: string;
  gsi2pk: string;
  gsi2sk: string;
};

type DynamoDbSessionRepositoryEnv = Pick<BackendEnv, 'DYNAMODB_METADATA_TABLE_NAME'>;

export class DynamoDbSessionRepository implements SessionRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly env: DynamoDbSessionRepositoryEnv
  ) {}

  async listSessions() {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        IndexName: 'gsi2',
        KeyConditionExpression: 'gsi2sk = :gsi2sk',
        ExpressionAttributeValues: {
          ':gsi2sk': 'METADATA',
        },
      })
    );

    return (response.Items ?? []).map((item) => this.toSession(item as DynamoDbSessionItem));
  }

  async listSessionsByProject(projectId: string) {
    const keys = buildSessionsByProjectKey(projectId);

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

    return (response.Items ?? []).map((item) => this.toSession(item as DynamoDbSessionItem));
  }

  async getSessionById(sessionId: string) {
    const lookupKeys = buildSessionLookupKeys(sessionId);

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

    return this.toSession(item as DynamoDbSessionItem);
  }

  async createSession(session: LoopSession) {
    await this.client.send(
      new PutCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        Item: this.toItem(session),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      })
    );

    return session;
  }

  async reset() {
    throw new Error('DynamoDB session repository reset is not supported.');
  }

  private toItem(session: LoopSession): DynamoDbSessionItem {
    return {
      ...buildSessionPrimaryKey(session.projectId, session.id),
      ...buildSessionLookupKeys(session.id),
      ...session,
      entityType: DYNAMODB_ENTITY_TYPES.session,
      sessionId: session.id,
    };
  }

  private toSession(item: DynamoDbSessionItem): LoopSession {
    return {
      id: item.sessionId,
      projectId: item.projectId,
      name: item.name,
      bpm: item.bpm,
      trackCount: item.trackCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
