import { CreateTableCommand, DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { config } from 'dotenv';

import { buildDynamoDbClientConfig } from '../src/aws/dynamodb-client';
import { buildMetadataTableDefinition } from '../src/aws/dynamodb-table-definition';
import { loadEnv } from '../src/config/env';

config({ path: '.env.dynamodb-local' });
config();

const localEnv = loadEnv({
  ...process.env,
  PERSISTENCE_DRIVER: 'dynamodb',
  AWS_REGION: process.env.AWS_REGION ?? 'us-west-2',
  DYNAMODB_METADATA_TABLE_NAME: process.env.DYNAMODB_METADATA_TABLE_NAME ?? 'loopr-local-metadata',
  DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
});

const client = new DynamoDBClient({
  ...buildDynamoDbClientConfig(localEnv),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  },
});

async function setupLocalDynamoDb() {
  if (!localEnv.DYNAMODB_ENDPOINT) {
    throw new Error('DYNAMODB_ENDPOINT is required for local DynamoDB setup.');
  }

  const tableDefinition = buildMetadataTableDefinition(localEnv);

  try {
    await client.send(new CreateTableCommand(tableDefinition));
    console.log(`Created table ${localEnv.DYNAMODB_METADATA_TABLE_NAME}.`);
  } catch (error) {
    if (error instanceof Error && error.name === 'ResourceInUseException') {
      console.log(`Table ${localEnv.DYNAMODB_METADATA_TABLE_NAME} already exists.`);
    } else {
      throw error;
    }
  }

  const table = await client.send(
    new DescribeTableCommand({
      TableName: localEnv.DYNAMODB_METADATA_TABLE_NAME,
    })
  );

  console.log(
    `Table ${localEnv.DYNAMODB_METADATA_TABLE_NAME} status: ${table.Table?.TableStatus}.`
  );
}

setupLocalDynamoDb().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
