# Loopr ASP.NET Core Backend

This folder contains the ASP.NET Core backend migration for Loopr.

The ASP.NET Core API is now the default local backend target for the mobile app. The Node.js/Express backend in `backend/` remains temporarily until the migration is complete and the old backend can be removed safely.

## Current Status

The current ASP.NET Core backend provides:

- .NET 10 ASP.NET Core Web API project
- controller-based HTTP foundation
- dependency injection setup
- strongly typed Loopr API options
- `GET /health` compatibility with the current Node backend
- structured error response foundation
- OpenAPI document in development
- xUnit integration tests with `WebApplicationFactory`
- domain records for project, session, and track metadata
- repository interfaces for project, session, and track persistence
- configurable in-memory repository implementations
- DynamoDB repository implementations for project, session, and track metadata
- repository contract tests shared by memory and DynamoDB implementations
- project REST endpoint parity
- session REST endpoint parity
- track metadata REST endpoint parity
- S3 presigned upload URL parity
- multi-stage Docker production image
- mobile default local API target

It does not yet include:

- native/device cutover validation
- Node backend removal

## Requirements

Use .NET 10 LTS.

Check your local SDK:

```bash
dotnet --list-sdks
```

This branch was validated with:

```text
.NET SDK 10.0.302
```

If `dotnet` is not installed, install the .NET 10 SDK from Microsoft before running the commands below.

## Local Development

From the repo root:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/backend-dotnet
dotnet restore Loopr.slnx
dotnet build Loopr.slnx
dotnet test Loopr.slnx
```

Run the API:

```bash
dotnet run --project src/Loopr.Api
```

The development launch profile listens on:

```text
http://localhost:5101
```

Health check:

```bash
curl http://localhost:5101/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "loopr-api"
}
```

OpenAPI document in development:

```bash
curl http://localhost:5101/openapi/v1.json
```

Run the ASP.NET Core API E2E checks from the repo root:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
npm run e2e:dotnet
```

This starts `backend-dotnet` on `http://127.0.0.1:5102` with `ASPNETCORE_ENVIRONMENT=Test`, memory persistence, and fake AWS credentials for local presigned URL generation. It does not contact real AWS services.

Run the Expo web project-flow validation against ASP.NET Core:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
npm run e2e:dotnet-mobile
```

This starts `backend-dotnet` on `http://127.0.0.1:5102` and Expo web on `http://127.0.0.1:8083`. It validates project creation and persistence through the mobile app shell without changing the app's default backend target.

## Docker

Build the ASP.NET Core API production image from the repo root:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
docker build -f backend-dotnet/Dockerfile -t loopr-dotnet-api:local .
```

Run the containerized API with local memory persistence:

```bash
docker run --rm \
  -p 127.0.0.1:5103:8080 \
  -e PERSISTENCE_DRIVER=memory \
  -e AWS_REGION=us-west-2 \
  -e S3_AUDIO_BUCKET_NAME=loopr-audio-local \
  -e S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900 \
  -e AWS_ACCESS_KEY_ID=loopr-local \
  -e AWS_SECRET_ACCESS_KEY=loopr-local \
  loopr-dotnet-api:local
```

Health check:

```bash
curl http://localhost:5103/health
```

You can also run the same service through Compose:

```bash
docker compose up --build dotnet-api
```

When finished:

```bash
docker compose down
```

The Docker and Compose defaults do not create AWS resources. They use memory persistence and local-only placeholder AWS credentials so presigned URL generation can be tested without contacting S3.

Run the container verification script from the repo root:

```bash
npm run dotnet:docker:verify
```

The script builds the image, starts it on `http://127.0.0.1:5104`, verifies `/health`, creates a project through the API, checks presigned upload URL generation, and removes the container on exit.

## Current API Surface

```text
GET  /health

GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/{projectId}

GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/{sessionId}

GET  /api/v1/tracks
POST /api/v1/tracks
GET  /api/v1/tracks/{trackId}

POST /api/v1/audio/upload-url
```

The REST endpoints use in-memory repositories by default and preserve the current Node backend response envelopes, validation bounds, default BPM behavior, track metadata defaults, S3 upload URL envelope, and structured error codes.

The test environment also exposes:

```text
POST /api/v1/e2e/reset
```

This route is only mapped when `ASPNETCORE_ENVIRONMENT=Test`.

## Configuration

Current ASP.NET Core configuration:

```json
{
  "Loopr": {
    "ServiceName": "loopr-api"
  },
  "Persistence": {
    "Driver": "memory"
  },
  "DynamoDb": {
    "Region": "us-west-2",
    "MetadataTableName": "loopr-metadata",
    "Endpoint": null
  },
  "S3": {
    "Region": "us-west-2",
    "AudioBucketName": "loopr-audio-local",
    "PresignedUploadExpiresSeconds": 900
  }
}
```

Environment variable equivalent:

```bash
Loopr__ServiceName=loopr-api
Persistence__Driver=memory
DynamoDb__Region=us-west-2
DynamoDb__MetadataTableName=loopr-metadata
DynamoDb__Endpoint=
S3__Region=us-west-2
S3__AudioBucketName=loopr-audio-local
S3__PresignedUploadExpiresSeconds=900
```

The current repository layer also accepts existing Node backend environment variable names:

```bash
PERSISTENCE_DRIVER=memory
AWS_REGION=us-west-2
DYNAMODB_METADATA_TABLE_NAME=loopr-metadata
DYNAMODB_ENDPOINT=
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8082,http://localhost:8082
S3_AUDIO_BUCKET_NAME=loopr-audio-local
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900
```

Use the default `memory` driver for normal local development. Use `dynamodb` only when a metadata table is available through AWS credentials or a local DynamoDB endpoint:

```bash
PERSISTENCE_DRIVER=dynamodb
DYNAMODB_METADATA_TABLE_NAME=loopr-local-metadata
DYNAMODB_ENDPOINT=http://127.0.0.1:8001
dotnet run --project src/Loopr.Api
```

The DynamoDB repositories preserve the existing Terraform table shape and intentionally do not support `ResetAsync`.

## Migration Boundary

Expo web project creation has been validated against ASP.NET Core, and the mobile app now defaults to the ASP.NET Core local API port. Native/device cutover validation still needs manual QA before removing the Node backend.

The next migration branch should remove the Node backend only after native/device validation confirms the ASP.NET Core backend preserves the mobile flows.
