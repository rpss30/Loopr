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
```

The API client files are:

```text
config/api.ts
services/api-client.ts
services/projects-api.ts
```

## Current limitations

- Backend API client exists, but the UI is not connected to it yet.
- Projects and tracks are still stored locally with AsyncStorage.
- Recorded audio files are still stored locally on the device.
- Mobile does not upload audio to S3 yet.
- Mobile does not save backend track metadata yet.
- No auth/user ownership yet.

## Recommended next step

Connect the project list/create project flow to the local backend behind a small, reversible integration.

The app should keep the local-first demo working while backend sync is added incrementally.
