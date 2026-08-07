# Loopr ASP.NET Core Backend

This folder contains the ASP.NET Core backend migration for Loopr.

The Node.js/Express backend in `backend/` is still the active backend until the ASP.NET Core service reaches endpoint parity and the mobile app is intentionally moved over.

## Current Status

This first checkpoint provides:

- .NET 10 ASP.NET Core Web API project
- controller-based HTTP foundation
- dependency injection setup
- strongly typed Loopr API options
- `GET /health` compatibility with the current Node backend
- structured error response foundation
- OpenAPI document in development
- xUnit integration tests with `WebApplicationFactory`

It does not yet include:

- project/session/track REST endpoints
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

## Configuration

Current ASP.NET Core configuration:

```json
{
  "Loopr": {
    "ServiceName": "loopr-api"
  }
}
```

Environment variable equivalent:

```bash
Loopr__ServiceName=loopr-api
```

Future branches should add typed options for persistence and AWS settings while preserving the existing Node environment names where practical:

```text
PERSISTENCE_DRIVER
AWS_REGION
DYNAMODB_METADATA_TABLE_NAME
DYNAMODB_ENDPOINT
S3_AUDIO_BUCKET_NAME
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS
```

## Migration Boundary

Do not point the React Native app at this backend yet. The current ASP.NET Core service only proves the foundation and health contract.

The next migration branch should add domain models, repository interfaces, in-memory repositories, and repository contract tests without touching DynamoDB or S3 yet.
