# Loopr S3 Audio Design

This document describes the planned S3 object storage design for Loopr audio files.

This branch adds backend design helpers, route shape, validation, and documentation. It does not upload mobile audio yet and does not create an S3 bucket yet.

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

All tracks for one session share this prefix:

```bash
projects/project-1/sessions/session-1/tracks
```

## Backend route shape

Planned route:

```bash
POST /api/v1/audio/upload-url
```

Current request shape:

```bash
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "trackId": "track-1",
  "contentType": "audio/mp4"
}
```

Supported content types currently accepted by validation:

```bash
audio/mp4
audio/m4a
audio/x-m4a
audio/wav
```

Current response shape:

```bash
{
  "error": {
    "code": "presigned_upload_not_implemented",
    "message": "Presigned S3 upload URLs will be added in a future branch."
  },
  "upload": {
    "s3Bucket": "loopr-audio-local",
    "s3Key": "projects/project-1/sessions/session-1/tracks/track-1.m4a",
    "contentType": "audio/mp4"
  }
}
```

The route intentionally returns `501` for now because real presigned S3 URLs are not implemented yet.

## Future upload flow

The planned production flow is:

```bash
mobile records local audio
mobile asks backend for upload URL
backend validates project/session/track ownership
backend builds S3 object key
backend generates presigned S3 PUT URL
mobile uploads local audio file directly to S3
backend stores track metadata and S3 reference in DynamoDB
mobile can later stream/download audio from cloud-backed metadata
```

## Backend environment variable

The backend now includes:

```bash
S3_AUDIO_BUCKET_NAME=loopr-audio-local
```

This is currently used only for route shape and tests. A later branch should connect it to real S3 presigned URL generation.

## Current MVP assumption

The mobile app currently records local audio files through Expo. The first cloud upload path should assume short recorded clips and use `.m4a` as the default extension.

Loopr should still be positioned as a mobile loop-building workspace for capturing and layering ideas, not a professional low-latency live looper pedal.

## Future AWS work

Future branches should add:

```bash
S3 audio bucket Terraform
S3 bucket security policy
S3 CORS policy for mobile uploads if needed
AWS SDK S3 client factory
presigned PUT URL generation
track metadata model with S3 references
mobile upload integration after local/cloud backend is stable
```bash

## Current limitations
- No S3 bucket exists yet.
- No presigned URLs are generated yet.
- No mobile upload is implemented yet.
- No auth/user ownership is implemented yet.
- Audio remains local-only in the mobile app for now.
