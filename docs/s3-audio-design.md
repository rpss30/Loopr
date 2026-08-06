# Loopr S3 Audio Design

This document describes the S3 object storage design for Loopr audio files.

Loopr is designed to store recorded audio bytes in S3 and project, session, and track metadata separately in the backend metadata layer.

The app should remain focused on a simple mobile-first MVP:

```text
create project → record tracks → play tracks → layer simple ideas → save/sync sessions
```

Loopr should not be positioned as a professional low-latency live looper pedal.

## Goal

The goal of the S3 audio flow is to let the mobile app upload recorded audio files without sending large file bytes through the backend server.

The backend should coordinate uploads by:

- validating the upload request
- building the expected S3 object key
- generating a presigned S3 PUT URL
- returning the bucket, key, content type, method, and expiry to the client

S3 stores the audio file bytes.

DynamoDB stores metadata such as:

- project ID
- session ID
- track ID
- track name
- duration
- volume
- mute state
- S3 bucket
- S3 object key
- content type
- created and updated timestamps

## Object key shape

Track audio objects use this structure:

```text
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

Example:

```text
projects/project-1/sessions/session-1/tracks/track-1.m4a
```

All tracks for one session share this prefix:

```text
projects/project-1/sessions/session-1/tracks
```

Object key segments are trimmed and URL-encoded before being joined into the final key.

The default audio extension is currently:

```text
m4a
```

## Backend route

Current route:

```text
POST /api/v1/audio/upload-url
```

Request shape:

```json
{
  "projectId": "project-1",
  "sessionId": "session-1",
  "trackId": "track-1",
  "contentType": "audio/mp4"
}
```

Supported content types:

```text
audio/mp4
audio/m4a
audio/x-m4a
audio/wav
```

Successful response shape:

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

The route returns `201` when the backend successfully generates the upload URL.

## Upload flow

The current MVP upload flow is:

```text
mobile records local audio
mobile saves the local track immediately
mobile creates or selects project/session context
mobile asks backend for a presigned upload URL
backend validates the request body
backend builds the S3 object key
backend generates a presigned S3 PUT URL
mobile uploads the recorded local file directly to S3
mobile saves backend track metadata with the S3 bucket/key reference after upload succeeds
if upload or metadata sync fails, mobile keeps local recording/playback usable
```

The mobile app keeps local playback as the source of truth. Cloud sync failure is non-blocking.

## Backend environment variables

The backend uses these S3-related variables:

```bash
AWS_REGION=us-west-2
S3_AUDIO_BUCKET_NAME=loopr-audio-local
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900
```

`AWS_REGION` configures the S3 client.

`S3_AUDIO_BUCKET_NAME` is the target bucket for audio uploads.

`S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS` controls how long each upload URL remains valid. The backend currently caps this value at `3600` seconds.

## Terraform status

Terraform config exists for the audio bucket under:

```text
infra/terraform
```

The Terraform audio bucket config includes:

- S3 bucket resource
- public access block
- ownership controls
- AES256 server-side encryption
- versioning
- optional CORS config
- backend environment output containing `S3_AUDIO_BUCKET_NAME`

Terraform has only been formatted and validated. No real AWS resources have been created yet.

Do not run `terraform apply` unless that is an explicit project decision.

## Current limitations

- The configured S3 bucket may not exist yet.
- Terraform has been validated, but no real AWS resources have been created yet.
- Mobile upload integration depends on a working S3-compatible upload target.
- The backend does not yet verify project/session/track ownership before signing uploads.
- There is no authentication or user ownership model yet.
- There are no download/stream URLs yet.
- Uploaded objects are not cleaned up yet.

## Next recommended backend step

Only add a local S3-compatible dev flow, such as LocalStack, if the project needs automated byte-upload verification without real AWS resources. Do not create AWS resources or run `terraform apply` unless that is an explicit project decision.
