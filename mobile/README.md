# Loopr Mobile

Loopr Mobile is the Expo React Native app for Loopr, a mobile-first multitrack loop-building app for musicians to capture short ideas, layer recorded tracks, control playback, and save loop sessions.

The mobile app is currently local-first. It supports project creation, local recording, track playback, simple track controls, and AsyncStorage persistence.

## Current MVP scope

The mobile MVP is focused on:

```text
create project → record tracks → play tracks → layer simple ideas → save/sync sessions
```

Loopr is not intended to be a professional low-latency live looper pedal.

## Local development

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

Useful commands:

```bash
npm run format
npm run format:check
npm run lint
npm test
npx tsc --noEmit
```

## Backend API configuration

The mobile app now includes a small backend API client layer.

Default API base URL:

```text
http://localhost:3001
```

For physical iPhone testing through Expo Go, `localhost` points to the phone, not your Mac. Use your Mac's local network IP address instead.

Example:

```bash
EXPO_PUBLIC_LOOPR_API_BASE_URL=http://192.168.1.10:3001 npx expo start
```

Replace `192.168.1.10` with your Mac's local IP address.

The current client layer supports:

```text
GET  /health
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:sessionId
POST /api/v1/audio/upload-url
GET  /api/v1/tracks
POST /api/v1/tracks
GET  /api/v1/tracks/:trackId
```

The project list/create project flow now uses the backend client when available.

Current behavior:

```text
load local projects immediately
try to fetch backend projects
show backend projects when available
merge backend projects with local-only projects
fall back to local/starter projects when backend is unavailable
try to create projects through backend
fall back to local project creation when backend create fails
when opening a workspace, try to ensure a simple backend session exists
after recording, try to prepare cloud upload target and track metadata
keep recording and playback local-first when backend sync fails

Development note: The default memory backend forgets projects and sessions when restarted. Local mobile projects can remain on the device even when the restarted backend no longer knows them.
```

The API client files are:

```text
config/api.ts
services/api-client.ts
services/projects-api.ts
services/sessions-api.ts
services/audio-upload-api.ts
services/tracks-api.ts
```

## Current limitations

- Project list/create project is connected to the backend with local fallback.
- Projects are still cached locally with AsyncStorage.
- Recorded audio files are still stored locally on the device.
- Mobile prepares S3 upload targets and backend track metadata when backend sync is available.
- Mobile does not PUT audio bytes to S3 yet.
- No auth/user ownership yet.

## Recommended next step

Upload recorded audio bytes to the presigned URL after local recording, then keep local playback as the fallback.

The app should keep the local-first demo working while backend sync is added in small, reversible steps.
