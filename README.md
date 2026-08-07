# Loopr

Loopr is a mobile-first multitrack audio idea-capture app for musicians. It lets a user create loop projects, record short tracks, play them back, layer simple ideas, and keep local playback usable even when backend sync is unavailable.

The project is intentionally scoped as an idea-capture MVP, not a professional low-latency live looper pedal or DAW replacement.

## Stack

- React Native, Expo, and TypeScript for the mobile app
- C# and ASP.NET Core for the backend API
- DynamoDB for project, session, and track metadata
- S3 presigned PUT URLs for audio upload coordination
- Terraform for AWS infrastructure definitions
- Jest, xUnit, and Playwright for automated testing
- Docker for the ASP.NET Core backend image

## Repository

```text
loopr/
  mobile/          Expo React Native app
  backend-dotnet/  ASP.NET Core API
  infra/terraform/ DynamoDB and S3 infrastructure definitions
  docs/            API, infrastructure, QA, and migration notes
  e2e/             Playwright API and Expo web checks
```

The previous Node.js/Express backend was migrated to ASP.NET Core and removed after API parity, automated E2E validation, Docker validation, and manual Expo Go validation.

## Current Behavior

- Create and list projects
- Open a project workspace
- Record local audio tracks with `expo-av`
- Store local project and track state with AsyncStorage
- Keep recorded audio files on device with `expo-file-system`
- Play individual tracks
- Play and stop a session
- Mute, rename, delete, and adjust volume for tracks
- Rename and delete projects
- Create backend project/session/track metadata through ASP.NET Core
- Request presigned S3 upload targets from the backend
- Upload local audio bytes to the provided URL before saving backend track metadata
- Preserve local recording and playback when backend sync fails

## Architecture

```text
React Native / Expo app
  |
  | REST API
  v
ASP.NET Core backend
  |
  | repository interfaces
  v
in-memory persistence for local dev/tests
or
DynamoDB metadata table

S3 stores recorded audio bytes when a configured bucket or S3-compatible target is available.
Terraform defines the DynamoDB table and S3 bucket, but real AWS resources have not been created from this repo by default.
```

## Local Development

Install root E2E dependencies:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
npm install
```

Install mobile dependencies:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/mobile
npm install
```

Run the ASP.NET Core backend:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/backend-dotnet

PATH="$HOME/.dotnet:$PATH" \
PERSISTENCE_DRIVER=memory \
AWS_REGION=us-west-2 \
S3_AUDIO_BUCKET_NAME=loopr-audio-local \
S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900 \
AWS_ACCESS_KEY_ID=loopr-local \
AWS_SECRET_ACCESS_KEY=loopr-local \
dotnet run --project src/Loopr.Api --urls http://0.0.0.0:5101
```

Check backend health:

```bash
curl http://localhost:5101/health
```

Run Expo:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/mobile
npx expo start
```

For physical iPhone testing through Expo Go, use your Mac's local network IP:

```bash
ipconfig getifaddr en0

cd /Users/rishavpreetsingh/Documents/Projects/loopr/mobile
EXPO_PUBLIC_LOOPR_API_BASE_URL=http://YOUR_MAC_IP:5101 npx expo start -c
```

## Checks

Mobile:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/mobile
npm run format
npm run format:check
npm run lint
npm test
npx tsc --noEmit
```

Backend:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/backend-dotnet
PATH="$HOME/.dotnet:$PATH" dotnet format Loopr.slnx --verify-no-changes
PATH="$HOME/.dotnet:$PATH" dotnet build Loopr.slnx
PATH="$HOME/.dotnet:$PATH" dotnet test Loopr.slnx
PATH="$HOME/.dotnet:$PATH" dotnet list Loopr.slnx package --vulnerable --include-transitive
```

E2E:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
PATH="$HOME/.dotnet:$PATH" npm run e2e
```

Docker:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr
npm run dotnet:docker:verify
```

Terraform validation only:

```bash
cd /Users/rishavpreetsingh/Documents/Projects/loopr/infra/terraform
terraform fmt -recursive
terraform init -backend=false
terraform validate
```

Do not run `terraform apply` unless creating real AWS resources is an intentional decision.

## Known Limits

- The default local backend uses memory persistence, so backend projects and sessions reset when the API restarts.
- Local audio recording and playback remain the source of truth on the device.
- Real S3 uploads require a configured S3-compatible target or AWS bucket.
- Terraform has been validated, but no real AWS resources have been created by default.
- No auth, payments, realtime collaboration, waveform editing, transcription, pitch detection, or AI chord detection.
- Browser E2E intentionally skips the native audio reload flow because Expo web uses non-durable `blob:` URLs that do not match iOS file persistence.

## Documentation

- [Mobile app](mobile/README.md)
- [ASP.NET Core backend](backend-dotnet/README.md)
- [Backend API](docs/backend-api.md)
- [E2E and manual QA](docs/e2e-and-manual-qa.md)
- [S3 audio design](docs/s3-audio-design.md)
- [Track metadata design](docs/track-metadata-design.md)
- [DynamoDB Local notes](docs/dynamodb-local.md)
- [Terraform](infra/terraform/README.md)
