# DynamoDB Local Verification

This document explains how Loopr verifies its DynamoDB repository implementations locally.

## Purpose

The backend has DynamoDB repository implementations for project and session metadata. This local workflow verifies those repositories against DynamoDB Local instead of only mocked unit tests.

This gives us confidence before using real AWS infrastructure.

## Local services

DynamoDB Local is defined in the root `docker-compose.yml`.

It runs on container port `8000` and is exposed locally at:

```text
http://127.0.0.1:8001
```

The container runs in memory, so data resets when it stops.

## Start DynamoDB Local

From the repo root:

```bash
docker compose up -d dynamodb-local
docker compose ps
```

Expected port mapping:

```bash
127.0.0.1:8001->8000/tcp
```

## Configure backend local env

From `backend`:

```bash
cp .env.dynamodb-local.example .env.dynamodb-local
```

The local env uses:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION=us-west-2
DYNAMODB_METADATA_TABLE_NAME=loopr-local-metadata
DYNAMODB_ENDPOINT=http://127.0.0.1:8001
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

The AWS access key and secret are dummy local-only values used for request signing with DynamoDB Local.

## Create local metadata table

From backend:

```bash
npm run dynamodb:setup:local
```

Expected first run:

```bash
Created table loopr-local-metadata.
Table loopr-local-metadata status: ACTIVE.
```

Expected later runs:

```bash
Table loopr-local-metadata already exists.
Table loopr-local-metadata status: ACTIVE.
```

## Verify repository flow

From `backend`:

```bash
npm run dynamodb:verify:local
```

Expected output includes:

```bash
Verified DynamoDB Local repository flow.
```

The verification script creates a project and session using the same service/repository path that the backend uses for DynamoDB persistence.

It verifies:

```bash
create project
get project by id
list projects
create session
get session by id
list sessions
```

## Run backend against DynamoDB Local

From `backend`:

```bash
cp .env.dynamodb-local.example .env
npm run dev
```

Then test:

```bash
curl http://localhost:3001/health

curl -X POST http://localhost:3001/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"DynamoDB Local Project","bpm":90}'

curl http://localhost:3001/api/v1/projects
```

## Stop local services

From repo root:

```bash
docker compose down
```

## Current limitations
- DynamoDB Local is not a deployed AWS environment.
- Data is in memory and resets when the container stops.
- Terraform resources are not applied in this branch.
- No S3 audio bucket exists yet.
- No backend deployment exists yet.
