# DynamoDB Local Verification

This document explains how Loopr verifies its DynamoDB repository implementations locally.

## Purpose

The backend has DynamoDB repository implementations for project, session, and track metadata. The standard test suite verifies those repositories with an in-memory fake metadata store so tests do not require DynamoDB Local or AWS credentials.

DynamoDB Local remains useful for manual experiments before using real AWS infrastructure.

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

## Backend local env

The ASP.NET Core backend can point at DynamoDB Local with:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION=us-west-2
DYNAMODB_METADATA_TABLE_NAME=loopr-local-metadata
DYNAMODB_ENDPOINT=http://127.0.0.1:8001
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

The AWS access key and secret are dummy local-only values used for request signing with DynamoDB Local. The local table must match the Terraform metadata table shape before the API can use `PERSISTENCE_DRIVER=dynamodb`.

## Run backend against DynamoDB Local

From `backend-dotnet`:

```bash
PERSISTENCE_DRIVER=dynamodb \
AWS_REGION=us-west-2 \
DYNAMODB_METADATA_TABLE_NAME=loopr-local-metadata \
DYNAMODB_ENDPOINT=http://127.0.0.1:8001 \
AWS_ACCESS_KEY_ID=local \
AWS_SECRET_ACCESS_KEY=local \
dotnet run --project src/Loopr.Api
```

Then test:

```bash
curl http://localhost:5101/health

curl -X POST http://localhost:5101/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"DynamoDB Local Project","bpm":90}'

curl http://localhost:5101/api/v1/projects
```

## Stop local services

From repo root:

```bash
docker compose down
```

## Current limitations
- DynamoDB Local is not a deployed AWS environment.
- Data is in memory and resets when the container stops.
- Terraform resources are not applied by this workflow.
- No real S3 audio bucket is created by this workflow.
- No backend deployment exists yet.
