# Loopr E2E and Manual QA

This document captures the current automated and manual QA coverage for Loopr.

Loopr is a mobile-first multitrack idea-capture app. It is local-first: recorded tracks are saved on the device immediately, and backend/cloud sync is treated as best-effort.

## Automated Playwright E2E

Run the suite from the repo root:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
npm run e2e
```

The root Playwright config starts:

```text
ASP.NET Core test server: http://127.0.0.1:5102
Expo web server:     http://127.0.0.1:8082
```

The backend test server uses:

```text
ASPNETCORE_ENVIRONMENT=Test
PERSISTENCE_DRIVER=memory
AWS_REGION=us-west-2
S3_AUDIO_BUCKET_NAME=loopr-audio-local
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8082,http://localhost:8082
AWS_ACCESS_KEY_ID=loopr-test
AWS_SECRET_ACCESS_KEY=loopr-test
```

The dummy AWS credentials are only for signing presigned URLs during tests. They do not create real AWS resources.

## Covered by Playwright

- Backend project/session/track metadata creation and readback.
- Backend track listing.
- Backend presigned upload target response shape.
- Backend validation for malformed audio upload requests.
- Expo web project creation.
- Expo web project visibility after page reload.

## Intentionally skipped by Playwright

The native audio record/play/layer/reload flow is skipped in browser E2E.

Reason: Expo web recording uses browser `MediaRecorder` and creates `blob:` URLs. Those URLs can work during the same page session, but they are not durable local file URIs after a full browser reload. The app's native persistence and cleanup path also uses `expo-file-system`, whose web implementation does not provide the same durable file behavior as iOS. Stubbing this would make the test pass for the wrong reason.

## Manual Expo Go QA

Start the ASP.NET Core backend:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/backend-dotnet

PERSISTENCE_DRIVER=memory \
AWS_REGION=us-west-2 \
S3_AUDIO_BUCKET_NAME=loopr-audio-local \
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900 \
AWS_ACCESS_KEY_ID=loopr-local \
AWS_SECRET_ACCESS_KEY=loopr-local \
dotnet run --project src/Loopr.Api
```

Find the Mac local network IP:

```bash
ipconfig getifaddr en0
```

Start Expo for physical iPhone testing:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/mobile

EXPO_PUBLIC_LOOPR_API_BASE_URL=http://YOUR_MAC_IP:5101 npx expo start
```

Replace `YOUR_MAC_IP` with the IP from `ipconfig getifaddr en0`.

## Manual Checklist

- App opens in Expo Go without crashing.
- Project list loads from local storage first.
- Creating a project succeeds when the backend is running.
- Opening a freshly created backend project briefly reaches a backend session-ready state.
- Recording a track saves it locally immediately.
- Track playback works after recording.
- Recording a second track adds a second layer.
- Play all and stop all work with multiple tracks.
- Muting a track affects playback controls as expected.
- Renaming a track persists after leaving and reopening the workspace.
- Volume changes persist after leaving and reopening the workspace.
- Deleting a track removes it from the workspace.
- Force closing and reopening Expo Go keeps local projects and tracks visible.
- Restarting the memory backend may make old backend project/session IDs unavailable.
- When backend sync or upload fails, the app shows a non-blocking toast and local playback remains usable.

## What This Suite Does Not Prove

- It does not prove native iPhone microphone behavior.
- It does not prove native iOS local file persistence.
- It does not prove real S3 bucket writes.
- It does not prove Terraform-created AWS infrastructure.
- It does not test auth or user ownership because the MVP does not include those features.
