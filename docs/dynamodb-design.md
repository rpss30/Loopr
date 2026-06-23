# Loopr DynamoDB Metadata Design

This document describes the planned DynamoDB metadata model for Loopr.

The current backend uses in-memory repositories. This design prepares the backend for a later DynamoDB-backed implementation without adding AWS SDK or Terraform in this branch.

## Goals

Loopr needs to store metadata for:

- Projects
- Saved loop sessions
- Track metadata later
- Audio object references later

Audio files themselves should not be stored in DynamoDB. Future audio files should be stored in S3, with DynamoDB storing metadata such as project ID, session ID, track ID, duration, volume, mute state, and S3 object key.

## Current access patterns

The current backend supports:

```bash
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:sessionId
```

The planned DynamoDB model should support:

```bash
list projects
get project by id
create project
list sessions
list sessions by project
get session by id
create session for a project
```

## Proposed single-table design

Table name:
```bash
loopr-metadata
```


Primary key:
```bash
pk
sk
```


Global secondary indexes planned:
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


## Future track item

Track metadata can be added under either a project or session partition.

Possible shape:
```bash
pk = SESSION#sessionId
sk = TRACK#trackId
```


Example metadata fields:
```bash
trackId
sessionId
projectId
name
durationMs
volume
muted
solo
orderIndex
s3Bucket
s3Key
createdAt
updatedAt
```


## Future S3 audio design

Audio files should be stored in S3.

Possible object key shape:
```bash
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

DynamoDB should store the S3 reference, not the audio file.

## Current limitations

This is a design-only branch.

- No AWS SDK integration yet.
- No DynamoDB table is created yet.
- No Terraform is added yet.
- No deployed environment exists yet.
- No authentication or user partitioning exists yet.

A future branch should introduce DynamoDB repository implementations behind the existing repository interfaces.
