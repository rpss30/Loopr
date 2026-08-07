# Loopr Backend API Notes

Loopr's backend API is an ASP.NET Core service for local-first mobile sync. It can run with in-memory repositories for local development or DynamoDB repositories for metadata persistence.

## Base URL

Local development:

```bash
http://localhost:5101
```

## Health

```bash
GET /health
```

Returns API health information.

Example response:

```bash
{
  "status": "ok",
  "service": "loopr-api"
}
```

## Projects

Projects represent a musician's loop workspace.

```bash
GET /api/v1/projects
```

Lists projects currently stored by the backend.

Example response:

```bash
{
  "projects": []
}
```

```bash
POST /api/v1/projects
```

Creates a project.

Example request:

```bash
{
  "name": "Acoustic Project",
  "bpm": 90
}
```

`bpm` is optional and defaults to `120`.

Example response:

```bash
{
  "project": {
    "id": "generated-project-id",
    "name": "Acoustic Project",
    "bpm": 90,
    "trackCount": 0,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

```bash
GET /api/v1/projects/:projectId
```

Returns one project by ID.

If the project does not exist, the API returns:

```bash
{
  "error": {
    "code": "project_not_found",
    "message": "Project not found."
  }
}
```

## Sessions

Sessions represent saved loop sessions associated with a project.

```bash
GET /api/v1/sessions
```

Lists sessions currently stored by the backend.

Example response:

```bash
{
  "sessions": []
}
```

```bash
POST /api/v1/sessions
```

Creates a session for an existing project.

Example request:

```bash
{
  "projectId": "existing-project-id",
  "name": "Verse Loop",
  "bpm": 90
}
```

`bpm` is optional and defaults to `120`.

Example response:

```bash
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

If the referenced project does not exist, the API returns:

```bash
{
  "error": {
    "code": "project_not_found",
    "message": "Project not found."
  }
}
```

```bash
GET /api/v1/sessions/:sessionId
```

Returns one session by ID.

If the session does not exist, the API returns:

```bash
{
  "error": {
    "code": "session_not_found",
    "message": "Session not found."
  }
}
```

## Error format

Errors use this structure:

```bash
{
  "error": {
    "code": "machine_readable_error_code",
    "message": "Human readable message.",
    "traceId": "request-trace-id"
  }
}
```

Validation errors may also include `details`.

## Tracks

Tracks represent recorded audio layers attached to a project session.

```bash
GET /api/v1/tracks
```

Lists tracks currently stored by the backend.

```bash
POST /api/v1/tracks
```

Creates track metadata after the mobile app uploads recorded audio bytes to the presigned upload target.

Example request:

```bash
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

```bash
GET /api/v1/tracks/:trackId
```

Returns one track by ID.

## Audio Uploads

```bash
POST /api/v1/audio/upload-url
```

Returns a presigned S3 PUT upload target for a recorded audio file.

Example request:

```bash
{
  "projectId": "existing-project-id",
  "sessionId": "existing-session-id",
  "trackId": "local-track-id",
  "contentType": "audio/mp4"
}
```

The route returns the upload URL, HTTP method, S3 bucket, S3 key, content type, and expiry. Generating the URL requires AWS signing credentials, but does not create real AWS resources.

## Current Implementation Note

The backend uses in-memory repositories by default. `PERSISTENCE_DRIVER=dynamodb` selects DynamoDB-backed metadata repositories for projects, sessions, and tracks. S3 support currently means presigned upload coordination; real bucket writes require a configured S3-compatible target.
