import {
  GetCommand,
  PutCommand,
  QueryCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';

import { BackendEnv } from '../config/env';
import { LoopProject } from '../models/project';
import {
  buildProjectListKeys,
  buildProjectPrimaryKey,
  DYNAMODB_ENTITY_TYPES,
} from './dynamodb-key-design';
import { ProjectRepository } from './project.repository';

type DynamoDbProjectItem = LoopProject & {
  pk: string;
  sk: string;
  entityType: typeof DYNAMODB_ENTITY_TYPES.project;
  projectId: string;
  gsi1pk: string;
  gsi1sk: string;
};

type DynamoDbProjectRepositoryEnv = Pick<BackendEnv, 'DYNAMODB_METADATA_TABLE_NAME'>;

export class DynamoDbProjectRepository implements ProjectRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly env: DynamoDbProjectRepositoryEnv
  ) {}

  async listProjects() {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': 'PROJECTS',
        },
        ScanIndexForward: false,
      })
    );

    return (response.Items ?? []).map((item) => this.toProject(item as DynamoDbProjectItem));
  }

  async getProjectById(projectId: string) {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        Key: buildProjectPrimaryKey(projectId),
      })
    );

    if (!response.Item) {
      return null;
    }

    return this.toProject(response.Item as DynamoDbProjectItem);
  }

  async createProject(project: LoopProject) {
    await this.client.send(
      new PutCommand({
        TableName: this.env.DYNAMODB_METADATA_TABLE_NAME,
        Item: this.toItem(project),
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    );

    return project;
  }

  async reset() {
    throw new Error('DynamoDB project repository reset is not supported.');
  }

  private toItem(project: LoopProject): DynamoDbProjectItem {
    return {
      ...buildProjectPrimaryKey(project.id),
      ...buildProjectListKeys(project.updatedAt, project.id),
      ...project,
      entityType: DYNAMODB_ENTITY_TYPES.project,
      projectId: project.id,
    };
  }

  private toProject(item: DynamoDbProjectItem): LoopProject {
    return {
      id: item.projectId,
      name: item.name,
      bpm: item.bpm,
      trackCount: item.trackCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
