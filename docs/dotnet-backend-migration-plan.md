# Loopr ASP.NET Core Backend Migration Plan

This document records the backend migration from Node.js/Express to ASP.NET Core.

Loopr should remain a local-first multitrack audio capture app. The migration should preserve mobile behavior, Terraform-managed AWS infrastructure, DynamoDB metadata storage, and S3 audio upload coordination.

## Current Architecture

```text
mobile/
  Expo React Native + TypeScript
  AsyncStorage local-first project and track state
  expo-av recording/playback
  expo-file-system local audio file cleanup and upload file handling

backend-dotnet/
  ASP.NET Core + C#
  controller-based REST API
  in-memory or DynamoDB repository implementations
  S3 presigned upload URL coordination
  xUnit integration and repository tests

infra/terraform/
  DynamoDB metadata table
  S3 audio bucket
  backend environment outputs
```

The React Native app points to a configurable REST API base URL through `EXPO_PUBLIC_LOOPR_API_BASE_URL` and defaults to the ASP.NET Core local API on `http://localhost:5101`.

## Current Test Baseline

Current baseline after the ASP.NET Core cutover:

```text
backend-dotnet dotnet test: 68 tests passed
mobile npm test -- --runInBand: 12 suites passed, 41 tests passed
root npm run e2e: 4 tests passed, 1 browser-native audio reload flow skipped
```

The root Playwright suite exists and covers backend API contracts plus Expo web project creation. The browser-native audio recording flow remains intentionally skipped because Expo web uses non-durable `blob:` URLs and does not match iOS file persistence behavior.

## .NET Version Choice

The machine did not have `dotnet` on `PATH` before this branch.

Microsoft's official support table in August 2026 lists:

- .NET 10 as an active LTS release, supported until November 2028.
- .NET 8 as an LTS release in maintenance, supported until November 2026.

Loopr should target .NET 10 LTS for the new backend foundation. The initial local SDK used for scaffolding and validation is:

```text
.NET SDK 10.0.302
Microsoft.AspNetCore.App 10.0.10
Microsoft.NETCore.App 10.0.10
```

## Current Environment Configuration

The ASP.NET Core backend supports this local environment shape:

```text
ASPNETCORE_ENVIRONMENT=Development|Test|Production
PERSISTENCE_DRIVER=memory|dynamodb
AWS_REGION=us-west-2
DYNAMODB_METADATA_TABLE_NAME=loopr-metadata
DYNAMODB_ENDPOINT=
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8082,http://localhost:8082
S3_AUDIO_BUCKET_NAME=loopr-audio-local
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900
```

The backend also supports strongly typed ASP.NET Core configuration sections such as `Persistence`, `DynamoDb`, and `S3`.

## Current API Contract

### GET /health

Returns:

```json
{
  "status": "ok",
  "service": "loopr-api"
}
```

### GET /api/v1/projects

Returns:

```json
{
  "projects": []
}
```

Projects are sorted by `updatedAt` descending in the in-memory repository and through `gsi1sk` descending in DynamoDB.

### POST /api/v1/projects

Request:

```json
{
  "name": "Acoustic Loop",
  "bpm": 90
}
```

Validation:

- `name`: trimmed string, required, minimum length 1, maximum length 80.
- `bpm`: optional integer, minimum 40, maximum 240.

Defaults:

- `bpm`: `120` when omitted.
- `trackCount`: `0`.
- `id`: generated UUID.
- `createdAt` and `updatedAt`: ISO timestamp.

Success: `201`

```json
{
  "project": {
    "id": "generated-project-id",
    "name": "Acoustic Loop",
    "bpm": 90,
    "trackCount": 0,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Validation failure: `400`

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Request body failed validation.",
    "details": [
      {
        "path": "name",
        "message": "..."
      }
    ]
  }
}
```

### GET /api/v1/projects/:projectId

Success: `200`

```json
{
  "project": {
    "id": "generated-project-id",
    "name": "Acoustic Loop",
    "bpm": 90,
    "trackCount": 0,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Missing project: `404`

```json
{
  "error": {
    "code": "project_not_found",
    "message": "Project not found."
  }
}
```

### GET /api/v1/sessions

Returns:

```json
{
  "sessions": []
}
```

Sessions are sorted by `updatedAt` descending.

### POST /api/v1/sessions

Request:

```json
{
  "projectId": "existing-project-id",
  "name": "Verse Loop",
  "bpm": 90
}
```

Validation:

- `projectId`: trimmed string, required, minimum length 1.
- `name`: trimmed string, required, minimum length 1, maximum length 80.
- `bpm`: optional integer, minimum 40, maximum 240.

Behavior:

- Returns `404 project_not_found` if the referenced project does not exist.
- Defaults `bpm` to `120` when omitted.
- Defaults `trackCount` to `0`.
- Generates UUID and ISO timestamps.

Success: `201`

```json
{
  "session": {
    "id": "generated-session-id",
    "projectId": "existing-project-id",
    "name": "Verse Loop",
    "bpm": 90,
    "trackCount": 0,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### GET /api/v1/sessions/:sessionId

Success: `200`

Missing session: `404`

```json
{
  "error": {
    "code": "session_not_found",
    "message": "Session not found."
  }
}
```

### GET /api/v1/tracks

Returns:

```json
{
  "tracks": []
}
```

Tracks are sorted by `updatedAt` descending.

### POST /api/v1/tracks

Request:

```json
{
  "projectId": "existing-project-id",
  "sessionId": "existing-session-id",
  "name": "Guitar Layer",
  "durationMs": 12000,
  "volume": 0.75,
  "isMuted": false,
  "s3Bucket": "loopr-audio-local",
  "s3Key": "projects/existing-project-id/sessions/existing-session-id/tracks/track-1.m4a",
  "contentType": "audio/mp4"
}
```

Validation:

- `projectId`: trimmed string, required, minimum length 1.
- `sessionId`: trimmed string, required, minimum length 1.
- `name`: trimmed string, required, minimum length 1, maximum length 80.
- `durationMs`: integer, minimum 0.
- `volume`: optional number, minimum 0, maximum 1.
- `isMuted`: optional boolean.
- `s3Bucket`: trimmed string, required, minimum length 1.
- `s3Key`: trimmed string, required, minimum length 1.
- `contentType`: one of `audio/mp4`, `audio/m4a`, `audio/x-m4a`, `audio/wav`.

Behavior:

- Returns `404 project_not_found` if the project does not exist.
- Returns `404 session_not_found` if the session does not exist.
- Returns `400 session_project_mismatch` if the session belongs to a different project.
- Defaults `volume` to `1`.
- Defaults `isMuted` to `false`.
- Generates UUID and ISO timestamps.

Success: `201`

```json
{
  "track": {
    "id": "generated-track-id",
    "projectId": "existing-project-id",
    "sessionId": "existing-session-id",
    "name": "Guitar Layer",
    "durationMs": 12000,
    "volume": 0.75,
    "isMuted": false,
    "s3Bucket": "loopr-audio-local",
    "s3Key": "projects/existing-project-id/sessions/existing-session-id/tracks/track-1.m4a",
    "contentType": "audio/mp4",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### GET /api/v1/tracks/:trackId

Success: `200`

Missing track: `404`

```json
{
  "error": {
    "code": "track_not_found",
    "message": "Track not found."
  }
}
```

### POST /api/v1/audio/upload-url

Request:

```json
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "trackId": "track-1",
  "contentType": "audio/mp4"
}
```

Validation:

- `projectId`: trimmed string, required, minimum length 1.
- `sessionId`: trimmed string, required, minimum length 1.
- `trackId`: trimmed string, required, minimum length 1.
- `contentType`: one of `audio/mp4`, `audio/m4a`, `audio/x-m4a`, `audio/wav`.

Behavior:

- Builds the S3 object key server-side.
- Creates a presigned S3 PUT URL.
- Requires AWS signing credentials but does not create real AWS resources.

Success: `201`

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

### POST /api/v1/e2e/reset

This route exists only when `NODE_ENV=test`.

Behavior:

- Resets tracks, then sessions, then projects.
- Returns `204`.
- In DynamoDB repositories, `reset` is not supported.

## Current Error Behavior

Validation errors return:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Request body failed validation.",
    "details": []
  }
}
```

Unhandled errors return:

```json
{
  "error": {
    "code": "internal_server_error",
    "message": "Something went wrong."
  }
}
```

Unknown routes return:

```json
{
  "error": {
    "code": "not_found",
    "message": "Route GET /missing not found"
  }
}
```

The ASP.NET Core backend may add `traceId` to structured error responses, but mobile-compatible `error.code` and `error.message` fields should remain available.

## Current Repository Layer

The Node backend currently defines:

- `ProjectRepository`
- `SessionRepository`
- `TrackRepository`

Each repository supports:

- list all records
- get by id
- create
- reset for test/local memory repositories

Current implementations:

- `InMemoryProjectRepository`
- `InMemorySessionRepository`
- `InMemoryTrackRepository`
- `DynamoDbProjectRepository`
- `DynamoDbSessionRepository`
- `DynamoDbTrackRepository`

`PERSISTENCE_DRIVER=memory` selects singleton in-memory repositories. `PERSISTENCE_DRIVER=dynamodb` selects DynamoDB repositories backed by the configured metadata table.

The ASP.NET Core migration now has equivalent domain records, repository interfaces, configurable in-memory repositories, DynamoDB repository implementations, and reusable repository contract tests across both persistence drivers.

## DynamoDB Table Usage

Terraform defines one metadata table with:

```text
pk  (string hash key)
sk  (string range key)
gsi1pk
gsi1sk
gsi2pk
gsi2sk
```

Global secondary indexes:

```text
gsi1: gsi1pk + gsi1sk
gsi2: gsi2pk + gsi2sk
```

Key conventions:

```text
project:
  pk = PROJECT#{projectId}
  sk = METADATA
  gsi1pk = PROJECTS
  gsi1sk = UPDATED_AT#{updatedAt}#PROJECT#{projectId}

session:
  pk = PROJECT#{projectId}
  sk = SESSION#{sessionId}
  gsi2pk = SESSION#{sessionId}
  gsi2sk = METADATA

track:
  pk = PROJECT#{projectId}
  sk = SESSION#{sessionId}#TRACK#{trackId}
  gsi2pk = TRACK#{trackId}
  gsi2sk = METADATA
```

Entity types stored in the table:

```text
PROJECT
SESSION
TRACK
```

Current DynamoDB notes:

- Project listing uses `gsi1`.
- Session and track lookups by ID use `gsi2`.
- Session listing and track listing use scans filtered by `entityType`.
- Session-by-project and tracks-by-session helpers use `pk` plus `begins_with(sk, ...)`.
- Creates use conditional writes to avoid overwriting existing keys.
- DynamoDB repository `reset` methods intentionally throw.
- .NET tests use a fake metadata store and do not require real AWS credentials, DynamoDB Local, or Terraform-applied resources.

The ASP.NET Core DynamoDB implementation preserves this table schema unless a future branch explicitly documents a migration.

## S3 Audio Behavior

The current object key shape is:

```text
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

Object key segments are:

- trimmed
- rejected if empty
- URL encoded with `encodeURIComponent`

The default extension is `m4a`. Extensions are normalized by trimming, removing a leading `.`, lowercasing, and requiring alphanumeric characters.

Presigned uploads:

- use HTTP `PUT`
- include the configured `ContentType`
- use `S3_AUDIO_BUCKET_NAME`
- expire after `S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS`
- require AWS signing credentials
- do not expose AWS credentials to the mobile app

## Existing Automated Tests

Backend tests currently cover:

- health endpoint
- project routes and validation
- session routes and validation
- track routes and validation
- audio upload route validation and service error handling
- ASP.NET Core API E2E validation through Playwright request tests
- Expo web project-flow validation against ASP.NET Core
- environment parsing
- S3 client config
- S3 object key generation
- S3 upload URL service
- DynamoDB table definition
- DynamoDB client config
- DynamoDB key design
- in-memory/DynamoDB repository behavior through focused tests
- repository factory selection

Mobile tests currently cover:

- API client wrappers
- project/session sync behavior
- audio upload API wrapper
- local audio file upload helper
- recorded track cloud sync behavior
- AsyncStorage-backed project and track storage
- local audio file cleanup

## ASP.NET Core Architecture For PR 1

The first branch should add a new `backend-dotnet/` folder without replacing or deleting the Node backend.

Initial structure:

```text
backend-dotnet/
  Loopr.slnx
  global.json
  README.md
  Directory.Build.props
  src/
    Loopr.Api/
  tests/
    Loopr.Api.Tests/
```

PR 1 established:

- ASP.NET Core Web API targeting `net10.0`.
- Nullable reference types.
- Controller-based HTTP foundation for clearer request/response discussion.
- Dependency injection extension point.
- Strongly typed options for basic service configuration.
- `GET /health` parity with the original API contract.
- OpenAPI endpoint in development.
- Structured error response foundation with `code`, `message`, and `traceId`.
- Integration tests using xUnit and `WebApplicationFactory`.
- Local development documentation.

PR 1 did not:

- migrate project/session/track endpoints
- migrate DynamoDB repositories
- migrate S3 presigning
- change the React Native app
- change Terraform
- remove the Node backend

## Migration Risks

- JSON error shape differences could break mobile fallback logic or tests.
- ASP.NET Core validation defaults differ from Zod and will need explicit compatibility decisions.
- Date serialization must stay ISO-compatible with existing mobile expectations.
- DynamoDB attribute casing and key names must match existing Terraform and stored data.
- S3 presigned URL behavior differs between AWS SDKs and will need contract tests.
- The test-only reset route must not leak into production.
- The existing Node backend should remain available until the removal branch, but the default Playwright app suite should switch to ASP.NET Core with the mobile cutover.
- .NET is not globally installed on the current machine, so local setup docs must be explicit.

## Contract Compatibility Assessment

The existing API can remain contract-compatible for the planned migration. The ASP.NET Core backend can preserve:

- route paths
- status codes
- request fields
- response wrapper names such as `project`, `projects`, `session`, `sessions`, `track`, `tracks`, and `upload`
- validation bounds
- repository selection by configuration
- DynamoDB table schema
- S3 object key shape

The only planned compatible enhancement is adding `traceId` to structured error responses while keeping the existing `error.code` and `error.message` fields.

The ASP.NET Core backend now implements parity for:

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
POST /api/v1/e2e/reset
```

Remaining migration work:

```text
production deployment decision
real AWS resource creation only when explicitly chosen
```

## Expected Files For PR 1

Expected additions:

```text
backend-dotnet/Directory.Build.props
backend-dotnet/Loopr.slnx
backend-dotnet/global.json
backend-dotnet/README.md
backend-dotnet/src/Loopr.Api/...
backend-dotnet/tests/Loopr.Api.Tests/...
docs/dotnet-backend-migration-plan.md
```

Expected modifications:

```text
.gitignore
```

No mobile, Terraform, or Node backend behavior changes are expected in PR 1.

## ASP.NET Core Architecture For PR 2

The repository-layer branch should add:

- domain records for project, session, and track metadata
- repository interfaces for project, session, and track persistence
- in-memory repository implementations
- configuration-based repository selection with `memory` as the active driver
- support for the existing `PERSISTENCE_DRIVER` environment variable name
- reusable repository contract tests

PR 2 should not:

- add project/session/track HTTP endpoints
- add DynamoDB repositories
- add S3 presigning
- change the React Native app
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 3

The API parity branch should add:

- project route parity against repository abstractions
- session route parity with project existence checks
- track metadata route parity with project/session existence checks
- request DTO validation matching current Zod bounds
- response envelopes matching the current mobile API client expectations
- structured error codes for not-found, validation, and session/project mismatch cases
- integration tests for list, create, get, defaults, validation, and missing-resource behavior

PR 3 should not:

- add S3 presigned upload generation
- add DynamoDB repositories
- point the React Native app at ASP.NET Core
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 4

The DynamoDB persistence branch should add:

- AWS SDK for .NET DynamoDB client configuration
- typed DynamoDB options with the existing `AWS_REGION`, `DYNAMODB_METADATA_TABLE_NAME`, and `DYNAMODB_ENDPOINT` environment variable names
- DynamoDB repositories for project, session, and track metadata
- the existing table key shape, `gsi1`, and `gsi2` access patterns
- repository contract coverage for memory and DynamoDB implementations
- fake DynamoDB metadata store tests that avoid live AWS resources

PR 4 should not:

- run `terraform apply`
- create AWS resources
- add S3 presigned upload generation
- point the React Native app at ASP.NET Core
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 5

The S3 upload URL parity branch should add:

- AWS SDK for .NET S3 client configuration
- typed S3 options with the existing `AWS_REGION`, `S3_AUDIO_BUCKET_NAME`, and `S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS` environment variable names
- S3 object key generation matching the existing `projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a` shape
- `POST /api/v1/audio/upload-url` parity
- injectable S3 signing behavior so tests do not require AWS credentials
- integration coverage for upload URL success, validation failures, unsupported content types, and signing errors

PR 5 should not:

- run `terraform apply`
- create AWS resources
- upload audio bytes
- point the React Native app at ASP.NET Core
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 6

The test reset branch should add:

- `POST /api/v1/e2e/reset` when `ASPNETCORE_ENVIRONMENT=Test`
- reset ordering that matches the current backend: tracks, sessions, then projects
- integration coverage proving the route clears in-memory state in Test
- integration coverage proving the route is not available outside Test

PR 6 should not:

- expose reset behavior in Development or Production
- run `terraform apply`
- create AWS resources
- point the React Native app at ASP.NET Core
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 7

The API E2E validation branch should add:

- a separate Playwright config for ASP.NET Core API-only checks
- a root script that starts `backend-dotnet` in Test with memory persistence
- API E2E coverage for project/session/track metadata, presigned upload URL coordination, validation errors, and reset cleanup
- GitHub Actions coverage for the ASP.NET Core API E2E suite without changing the existing Node/Expo E2E suite

PR 7 should not:

- point the React Native app at ASP.NET Core
- replace the migration-era Playwright suite
- run `terraform apply`
- create AWS resources
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 8

The mobile validation branch should add:

- ASP.NET Core CORS support for local Expo web validation
- configurable `CORS_ALLOWED_ORIGINS` support for LAN or alternate local ports
- a separate Playwright config that runs the existing Expo web project-flow spec against ASP.NET Core
- CI coverage for the Expo web plus ASP.NET Core validation path

PR 8 should not:

- change the mobile app's default API target
- test native audio recording through Expo web
- run `terraform apply`
- create AWS resources
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 9

The Docker support branch should add:

- a multi-stage Dockerfile for the ASP.NET Core API
- a production runtime image that runs the published app without SDK tooling
- a non-root runtime user where supported by the base image
- a container health check for `GET /health`
- a root Compose service for local memory-backed API validation
- documentation for build, run, health-check, and teardown commands

PR 9 should not:

- change the mobile app's default API target
- run `terraform apply`
- create AWS resources
- change Terraform
- remove the Node backend

## ASP.NET Core Architecture For PR 10

The mobile integration branch should add:

- mobile default API configuration pointing to the ASP.NET Core local development port
- updated mobile API client tests for the new default
- manual Expo Go QA documentation for ASP.NET Core local startup
- migration documentation showing that Node removal is still a later branch

PR 10 should not:

- remove the Node backend
- change the mobile local-first fallback behavior
- run `terraform apply`
- create AWS resources
- add auth or other non-MVP scope

## ASP.NET Core Architecture For PR 11

The backend removal branch should add:

- deletion of the legacy Node.js/Express backend implementation
- removal of migration-only Playwright configs and scripts
- CI cleanup so only the ASP.NET Core backend is installed and exercised
- documentation updates showing ASP.NET Core as the current backend
- preservation of mobile local-first behavior and Terraform infrastructure

PR 11 should not:

- change the mobile product scope
- change Terraform resources
- run `terraform apply`
- create AWS resources
- add a replacement technology for the removed backend
