# Loopr ASP.NET Core Backend

This folder contains the ASP.NET Core backend migration for Loopr.

The Node.js/Express backend in `backend/` is still the active backend until the ASP.NET Core service reaches endpoint parity and the mobile app is intentionally moved over.

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
- repository contract tests that can be reused for future DynamoDB implementations
- project REST endpoint parity
- session REST endpoint parity
- track metadata REST endpoint parity

It does not yet include:

- DynamoDB repositories
- S3 presigned upload generation
- mobile integration
- Docker production image
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
```

The REST endpoints use in-memory repositories by default and preserve the current Node backend response envelopes, validation bounds, default BPM behavior, track metadata defaults, and structured error codes.

## Configuration

Current ASP.NET Core configuration:

```json
{
  "Loopr": {
    "ServiceName": "loopr-api"
  },
  "Persistence": {
    "Driver": "memory"
  }
}
```

Environment variable equivalent:

```bash
Loopr__ServiceName=loopr-api
Persistence__Driver=memory
```

The current repository layer also accepts the existing Node backend environment variable name:

```bash
PERSISTENCE_DRIVER=memory
```

`dynamodb` is reserved for a future branch and intentionally fails fast in this ASP.NET Core implementation until DynamoDB repositories are added.

Future branches should add typed options for AWS settings while preserving the existing Node environment names where practical:

```text
AWS_REGION
DYNAMODB_METADATA_TABLE_NAME
DYNAMODB_ENDPOINT
S3_AUDIO_BUCKET_NAME
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS
```

## Migration Boundary

Do not point the React Native app at this backend yet. The current ASP.NET Core service does not include S3 presigned upload URLs, DynamoDB persistence, or mobile E2E validation yet.

The next migration branch should add DynamoDB persistence behind the repository abstractions without changing the mobile app yet.
