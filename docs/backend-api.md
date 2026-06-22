# Loopr Backend API Notes

Loopr's backend API is currently a local TypeScript Express service. It is designed as a cloud-ready API skeleton that will later connect to AWS persistence and storage.

## Base URL

Local development:

```bash
http://localhost:3001
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
    "message": "Human readable message."
  }
}
```

Validation errors may also include `details`.

## Current implementation note

The backend currently uses in-memory services. This is temporary. Future branches will replace these services with cloud-backed persistence using DynamoDB for metadata and S3 for audio objects.
