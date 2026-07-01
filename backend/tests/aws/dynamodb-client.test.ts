import { describe, expect, it } from 'vitest';

import { buildDynamoDbClientConfig, dynamoDbTranslateConfig } from '../../src/aws/dynamodb-client';

describe('DynamoDB client factory', () => {
  it('builds DynamoDB client config from backend env', () => {
    const config = buildDynamoDbClientConfig({
      AWS_REGION: 'ca-central-1',
    });

    expect(config).toEqual({
      region: 'ca-central-1',
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
