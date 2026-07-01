import { describe, expect, it } from 'vitest';

import { buildDynamoDbClientConfig, dynamoDbTranslateConfig } from '../../src/aws/dynamodb-client';

describe('DynamoDB client factory', () => {
  it('builds DynamoDB client config from backend env', () => {
    const config = buildDynamoDbClientConfig({
      AWS_REGION: 'ca-central-1',
      DYNAMODB_ENDPOINT: undefined,
    });

    expect(config).toEqual({
      region: 'ca-central-1',
    });
  });

  it('adds a local endpoint when configured', () => {
    const config = buildDynamoDbClientConfig({
      AWS_REGION: 'us-west-2',
      DYNAMODB_ENDPOINT: 'http://localhost:8000',
    });

    expect(config).toEqual({
      region: 'us-west-2',
      endpoint: 'http://localhost:8000',
    });
  });

  it('configures document client marshalling for app objects', () => {
    expect(dynamoDbTranslateConfig).toEqual({
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  });
});
