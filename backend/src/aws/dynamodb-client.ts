import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TranslateConfig } from '@aws-sdk/lib-dynamodb';

import { BackendEnv, env } from '../config/env';

type DynamoDbClientEnv = Pick<BackendEnv, 'AWS_REGION' | 'DYNAMODB_ENDPOINT'>;

export const dynamoDbTranslateConfig: TranslateConfig = {
  marshallOptions: {
    removeUndefinedValues: true,
  },
};

export function buildDynamoDbClientConfig(sourceEnv: DynamoDbClientEnv): DynamoDBClientConfig {
  const config: DynamoDBClientConfig = {
    region: sourceEnv.AWS_REGION,
  };

  if (sourceEnv.DYNAMODB_ENDPOINT) {
    config.endpoint = sourceEnv.DYNAMODB_ENDPOINT;
  }

  return config;
}

export function createDynamoDbDocumentClient(sourceEnv: DynamoDbClientEnv = env) {
  const client = new DynamoDBClient(buildDynamoDbClientConfig(sourceEnv));

  return DynamoDBDocumentClient.from(client, dynamoDbTranslateConfig);
}

export const dynamoDbDocumentClient = createDynamoDbDocumentClient();
