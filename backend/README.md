# Loopr Backend

This is the backend API for Loopr, a mobile-first loop-building workspace for musicians.

The backend is a TypeScript Express API for projects, sessions, and audio upload coordination. The mobile app still works local-first, but the backend now has the first cloud-storage building block: generating presigned S3 upload URLs for recorded audio files.

## Current stack

- Node.js
- TypeScript
- Express
- Zod for request validation
- Vitest for tests
- Supertest for API route tests
- AWS SDK v3 for DynamoDB and S3 integration
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

The API runs on port `3001` by default.

Health check:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
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

## Current API surface

```text
GET  /health

GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId

GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:sessionId

POST /api/v1/audio/upload-url
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
DYNAMODB_ENDPOINT=
S3_AUDIO_BUCKET_NAME=loopr-audio-local
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900
```

`PERSISTENCE_DRIVER=memory` is the default local mode.

`PERSISTENCE_DRIVER=dynamodb` selects the DynamoDB repository implementations. For local verification, use DynamoDB Local. For real AWS usage, it requires AWS credentials and a DynamoDB table matching the metadata design.

`S3_AUDIO_BUCKET_NAME` controls which bucket presigned audio upload URLs target.

`S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS` controls how long generated upload URLs remain valid. The current maximum is `3600` seconds.

## DynamoDB Local setup

Start DynamoDB Local from the repo root:

```bash
docker compose up -d dynamodb-local
```

Create the local metadata table from `backend`:

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

```text
Verified DynamoDB Local repository flow.
```

DynamoDB Local is currently mapped to:

```text
http://127.0.0.1:8001
```

The container uses in-memory storage, so local table data resets when the container is stopped.

## Audio upload URL route

The backend can generate presigned S3 PUT upload URLs for recorded audio files.

```text
POST /api/v1/audio/upload-url
```

Example request:

```json
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "trackId": "track-1",
  "contentType": "audio/mp4"
}
```

Supported content types:

```text
audio/mp4
audio/m4a
audio/x-m4a
audio/wav
```

Example successful response:

```json
{
  "upload": {
    "uploadUrl": "https://example-presigned-s3-url",
    "method": "PUT",
    "s3Bucket": "loopr-audio-local",
    "s3Key": "projects/project-1/sessions/session-1/tracks/track-1.m4a",
    "contentType": "audio/mp4",
    "expiresInSeconds": 900
  }
}
```

The mobile upload flow will be:

```text
mobile records local audio
mobile asks backend for an upload URL
backend builds the S3 object key
backend returns a presigned S3 PUT URL
mobile uploads the local audio file directly to S3
backend stores track metadata and the S3 object reference
```

Current object key shape:

```text
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

Example:

```text
projects/project-1/sessions/session-1/tracks/track-1.m4a
```

## Current limitations

- The configured S3 bucket must already exist for real uploads to succeed.
- Terraform has been validated, but no real AWS resources have been created yet.
- Mobile does not upload recorded audio to S3 yet.
- Track metadata is not stored yet.
- There is no authentication or user ownership model yet.
- The app is not deployed yet.

These limitations are intentional. The current goal is to build toward a simple demo flow: create project, record tracks, play tracks, save/sync sessions, upload audio, and store track metadata.
