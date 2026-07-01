# Loopr Backend

This is the backend API for Loopr, a mobile loop-building workspace for musicians.

The backend is currently a TypeScript Express API skeleton. It provides health checks, structured routes, request validation, tests, and temporary in-memory services. Persistence will be added later with AWS services such as DynamoDB and S3.

## Current stack

- Node.js
- TypeScript
- Express
- Zod for request validation
- Vitest for tests
- Supertest for API route tests
- Prettier for formatting

## Local development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The API runs on port 3001 by default.

Health check:

```bash
curl http://localhost:3001/health
```

Expected response:

```bash
{
  "status": "ok",
  "service": "loopr-api"
}
```

Scripts:

```bash
npm run dev
npm test
npm run typecheck
npm run build
npm run format
npm run format:check
```

Current API surface:

```bash
GET  /health
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:sessionId
```

## Environment variables

Copy the example environment file if you want local overrides:

```bash
cp .env.example .env
```

Current variables:

```bash
NODE_ENV=development
PORT=3001
PERSISTENCE_DRIVER=memory
AWS_REGION=us-west-2
DYNAMODB_METADATA_TABLE_NAME=loopr-metadata
```

`PERSISTENCE_DRIVER=memory` is the default local mode.

`PERSISTENCE_DRIVER=dynamodb` selects the DynamoDB repository implementations, but it requires AWS credentials and a DynamoDB table matching the planned metadata design. Terraform and deployed AWS resources are intentionally not included yet.

Current limitations:

- Data is stored in memory only.
- Data resets whenever the server restarts.
- No authentication yet.
- No DynamoDB/S3 integration yet.
- No deployed environment yet.

These limitations are intentional for this branch. The goal is to establish a clean backend structure before adding cloud persistence.

## DynamoDB Local setup

Start DynamoDB Local from the repo root:

```bash
docker compose up -d dynamodb-local
```

Create the local metadata table:

```bash
cp .env.dynamodb-local.example .env.dynamodb-local
npm run dynamodb:setup:local
```

Run the backend against DynamoDB Local:

```bash
cp .env.dynamodb-local.example .env
npm run dev
```

When finished, stop DynamoDB Local from the repo root:

```bash
docker compose down
```

## DynamoDB Local verification

Loopr can run against DynamoDB Local for backend repository verification.

From the repo root, start DynamoDB Local:

```bash
docker compose up -d dynamodb-local
```

From `backend`, create the local metadata table:

```bash
cp .env.dynamodb-local.example .env.dynamodb-local
npm run dynamodb:setup:local
```

Verify the DynamoDB-backed repositories end-to-end:

```bash
npm run dynamodb:verify:local
```

Expected output includes:

```bash
Verified DynamoDB Local repository flow.
```

To run the backend against DynamoDB Local:

```bash
cp .env.dynamodb-local.example .env
npm run dev
```

When finished, stop DynamoDB Local from the repo root:

```bash
docker compose down
```

DynamoDB Local is currently mapped to:

```bash
http://127.0.0.1:8001
```

The container uses in-memory storage, so local table data resets when the container is stopped.

## Audio upload route shape

The backend includes a placeholder route for future S3 audio uploads:

```text
POST /api/v1/audio/upload-url
```

Example request:

```bash
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "trackId": "track-1",
  "contentType": "audio/mp4"
}
```

Current response returns the future upload target shape, but does not generate a real presigned URL yet:

```bash
{
  "error": {
    "code": "presigned_upload_not_implemented",
    "message": "Presigned S3 upload URLs will be added in a future branch."
  },
  "upload": {
    "s3Bucket": "loopr-audio-local",
    "s3Key": "projects/project-1/sessions/session-1/tracks/track-1.m4a",
    "contentType": "audio/mp4"
  }
}
```

The intended future flow is:

- Mobile requests an upload URL from the backend.
- Backend validates project/session/track metadata.
- Backend generates a presigned S3 upload URL.
- Mobile uploads the recorded audio file directly to S3.
- Backend stores track metadata and the S3 object reference in DynamoDB.

This route intentionally returns 501 until real S3 presigned URL generation is implemented.
