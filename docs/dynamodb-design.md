# Loopr DynamoDB Metadata Design

This document describes the DynamoDB metadata model for Loopr.

The ASP.NET Core backend can run with either in-memory repositories for local development or DynamoDB repositories for metadata persistence. Terraform defines the matching table shape, but real AWS resources are not created unless `terraform apply` is run intentionally.

## Goals

Loopr needs to store metadata for:

- Projects
- Saved loop sessions
- Track metadata
- Audio object references

Audio files themselves should not be stored in DynamoDB. Recorded audio can be uploaded to S3 through presigned URLs, with DynamoDB storing metadata such as project ID, session ID, track ID, duration, volume, mute state, and S3 object key. Mobile local playback remains the fallback path.

## Current access patterns

The current backend supports:

```bash
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:sessionId
GET  /api/v1/tracks
POST /api/v1/tracks
GET  /api/v1/tracks/:trackId
POST /api/v1/audio/upload-url
```

The table supports:

```bash
list projects
get project by id
create project
list sessions
list sessions by project
get session by id
create session for a project
list tracks
list tracks by session
get track by id
create track metadata
```

## Single-table design

Table name:

```bash
loopr-metadata
```

Primary key:

```bash
pk
sk
```

Global secondary indexes:

```bash
gsi1pk
gsi1sk
gsi2pk
gsi2sk
```

## Project item

A project item stores workspace-level metadata.

Example item:

```bash
{
  "pk": "PROJECT#project-1",
  "sk": "METADATA",
  "entityType": "PROJECT",
  "projectId": "project-1",
  "name": "Acoustic Project",
  "bpm": 90,
  "trackCount": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "gsi1pk": "PROJECTS",
  "gsi1sk": "UPDATED_AT#2026-01-01T00:00:00.000Z#PROJECT#project-1"
}
```

Primary access:

```bash
get project by id:
  pk = PROJECT#projectId
  sk = METADATA
```

Project list access:

```bash
query GSI1:
  gsi1pk = PROJECTS
  scan/index order by gsi1sk
```

## Session item

A session item stores saved loop session metadata and belongs to a project.

Example item:

```bash
{
  "pk": "PROJECT#project-1",
  "sk": "SESSION#session-1",
  "entityType": "SESSION",
  "sessionId": "session-1",
  "projectId": "project-1",
  "name": "Verse Loop",
  "bpm": 90,
  "trackCount": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "gsi2pk": "SESSION#session-1",
  "gsi2sk": "METADATA"
}
```

Sessions by project access:

```bash
query table:
  pk = PROJECT#projectId
  sk begins_with SESSION#
```

Session lookup by ID access:

```bash
query GSI2:
  gsi2pk = SESSION#sessionId
  gsi2sk = METADATA
```

## Track item

Track metadata is stored under the project partition and grouped by session in the sort key.

Key shape:

```bash
pk = PROJECT#projectId
sk = SESSION#sessionId#TRACK#trackId
gsi2pk = TRACK#trackId
gsi2sk = METADATA
```

Example metadata fields:

```bash
trackId
sessionId
projectId
name
durationMs
volume
isMuted
s3Bucket
s3Key
contentType
createdAt
updatedAt
```

Tracks by session access:

```bash
query table:
  pk = PROJECT#projectId
  sk begins_with SESSION#sessionId#TRACK#
```

Track lookup by ID access:

```bash
query GSI2:
  gsi2pk = TRACK#trackId
  gsi2sk = METADATA
```

## S3 audio references

Audio files should be stored in S3.

Object key shape:

```bash
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

DynamoDB should store the S3 reference, not the audio file.

## Current limitations

- Local development defaults to in-memory persistence.
- DynamoDB mode requires either DynamoDB Local or an existing AWS table.
- Terraform has been validated, but real AWS resources have not been created by default.
- No authentication or user partitioning exists yet.
