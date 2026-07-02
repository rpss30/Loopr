# Loopr Track Metadata Design

This document describes the first backend track metadata API for Loopr.

Loopr audio files are stored separately from metadata. S3 stores the recorded audio bytes, while the backend metadata layer stores information needed to list, identify, and play tracks later.

This branch intentionally keeps track metadata simple and in-memory first. DynamoDB-backed track metadata can come in a follow-up branch.

## MVP goal

Track metadata gives uploaded audio something real to attach to.

The MVP flow is moving toward:

```text
create project → create session → request upload URL → upload audio → save track metadata
```

## Current API

The backend currently exposes:

```text
GET  /api/v1/tracks
POST /api/v1/tracks
GET  /api/v1/tracks/:trackId
```

## Track metadata shape

Current fields:

```text
id
projectId
sessionId
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

## Create track request

```json
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "name": "Guitar Layer",
  "durationMs": 12000,
  "volume": 0.75,
  "isMuted": false,
  "s3Bucket": "loopr-audio-local",
  "s3Key": "projects/project-1/sessions/session-1/tracks/track-1.m4a",
  "contentType": "audio/mp4"
}
```

`volume` and `isMuted` are optional.

Defaults:

```text
volume: 1
isMuted: false
```

## Validation rules

The create route validates:

- `projectId` is present
- `sessionId` is present
- `name` is present and no longer than 80 characters
- `durationMs` is a non-negative integer
- `volume`, when provided, is between 0 and 1
- `isMuted`, when provided, is boolean
- `s3Bucket` is present
- `s3Key` is present
- `contentType` is supported

Supported content types:

```text
audio/mp4
audio/m4a
audio/x-m4a
audio/wav
```

The route also checks that:

- the project exists
- the session exists
- the session belongs to the provided project

## Current storage

Track metadata currently uses an in-memory repository.

This means:

- data is useful for API shape and local tests
- data resets when the backend process restarts
- it is not ready for durable sync yet

This is intentional for the first track metadata checkpoint.

## Current limitations

- No DynamoDB track repository yet.
- Track metadata is not connected to the presigned upload route yet.
- The backend does not confirm that the S3 object was actually uploaded.
- Project/session track counts are not updated yet.
- No mobile integration yet.
- No auth or user ownership yet.

## Recommended next backend step

Add DynamoDB key design and repository support for tracks.

The likely DynamoDB item shape should keep tracks under project/session hierarchy, for example:

```text
PK: PROJECT#{projectId}
SK: SESSION#{sessionId}#TRACK#{trackId}
```

A follow-up can also add query helpers for listing tracks by session.
