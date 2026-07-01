# Loopr Backend

This is the backend API for Loopr, a mobile loop-building workspace for musicians.

The backend is currently a TypeScript Express API skeleton. It provides health checks, structured routes, request validation, tests, and temporary in-memory services. Persistence will be added later with AWS services such as DynamoDB and S3.

## Current stack

- Node.js
- TypeScript
- Express
- Zod for request validation
- Vitest for tests
- Supertest for API route tests
- Prettier for formatting

## Local development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The API runs on port 3001 by default.

Health check:

```bash
curl http://localhost:3001/health
```

Expected response:

```bash
{
  "status": "ok",
  "service": "loopr-api"
}
```

Scripts:

```bash
npm run dev
npm test
npm run typecheck
npm run build
npm run format
npm run format:check
```

Current API surface:

```bash
GET  /health
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:sessionId
```

## Environment variables

Copy the example environment file if you want local overrides:

```bash
cp .env.example .env
```

Current variables:

```bash
NODE_ENV=development
PORT=3001
PERSISTENCE_DRIVER=memory
AWS_REGION=us-west-2
DYNAMODB_METADATA_TABLE_NAME=loopr-metadata
```

`PERSISTENCE_DRIVER=memory` is the default local mode.

`PERSISTENCE_DRIVER=dynamodb` selects the DynamoDB repository implementations, but it requires AWS credentials and a DynamoDB table matching the planned metadata design. Terraform and deployed AWS resources are intentionally not included yet.

Current limitations:

- Data is stored in memory only.
- Data resets whenever the server restarts.
- No authentication yet.
- No DynamoDB/S3 integration yet.
- No deployed environment yet.

These limitations are intentional for this branch. The goal is to establish a clean backend structure before adding cloud persistence.
