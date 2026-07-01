import { describe, expect, it } from 'vitest';

import { buildMetadataTableDefinition } from '../../src/aws/dynamodb-table-definition';

describe('DynamoDB table definition', () => {
  it('builds the metadata table definition used by local setup', () => {
    const definition = buildMetadataTableDefinition({
      DYNAMODB_METADATA_TABLE_NAME: 'loopr-local-metadata',
    });

    expect(definition).toEqual({
      TableName: 'loopr-local-metadata',
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        {
          AttributeName: 'pk',
          AttributeType: 'S',
        },
        {
          AttributeName: 'sk',
          AttributeType: 'S',
        },
        {
          AttributeName: 'gsi1pk',
          AttributeType: 'S',
        },
        {
          AttributeName: 'gsi1sk',
          AttributeType: 'S',
        },
        {
          AttributeName: 'gsi2pk',
          AttributeType: 'S',
        },
        {
          AttributeName: 'gsi2sk',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'sk',
          KeyType: 'RANGE',
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'gsi1',
          KeySchema: [
            {
              AttributeName: 'gsi1pk',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'gsi1sk',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
        {
          IndexName: 'gsi2',
          KeySchema: [
            {
              AttributeName: 'gsi2pk',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'gsi2sk',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
    });
  });
});
