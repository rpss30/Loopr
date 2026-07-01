# Loopr S3 Audio Design

This document describes the planned S3 object storage design for Loopr audio files.

This branch only adds design helpers and documentation. It does not upload mobile audio yet and does not create an S3 bucket yet.

## Goal

Loopr should eventually store recorded audio files in S3 while storing metadata in DynamoDB.

DynamoDB should store metadata such as:

- project ID
- session ID
- track ID
- track name
- duration
- volume
- mute state
- S3 bucket
- S3 object key
- created and updated timestamps

S3 should store the actual audio file bytes.

## Object key shape

Track audio objects should use this structure:

```text
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

Example:

```bash
projects/project-1/sessions/session-1/tracks/track-1.m4a
```

## Why this shape

This key structure keeps audio files grouped by project and session. It makes future cleanup, debugging, and object browsing easier.

For example, all tracks for one session share this prefix:

```bash
projects/project-1/sessions/session-1/tracks
```

## Current MVP assumption

The mobile app currently records local audio files through Expo. The first cloud upload path should assume short recorded clips and use `.m4a` as the default extension.

This is not intended to be a professional live looper or low-latency pedal system. The cloud path is for saving and syncing captured loop ideas.

## Future upload flow

Planned backend route:

```bash
POST /api/v1/audio/upload-url
```

Possible request:

```bash
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "trackId": "track-1",
  "contentType": "audio/mp4"
}
```

Possible response:

```bash
{
  "uploadUrl": "presigned-upload-url",
  "s3Bucket": "loopr-audio-dev",
  "s3Key": "projects/project-1/sessions/session-1/tracks/track-1.m4a"
}
```

The mobile app would then upload the local audio file directly to S3 using the presigned URL.

## Current limitations
- No S3 bucket exists yet.
- No presigned URLs are generated yet.
- No mobile upload is implemented yet.
- No auth/user ownership is implemented yet.
- Audio remains local-only in the mobile app for now.
