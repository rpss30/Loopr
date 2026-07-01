# Terraform Metadata Table Notes

This document explains the first Terraform infrastructure added for Loopr.

## Purpose

Loopr needs a cloud metadata store for backend data such as:

- Projects
- Saved loop sessions
- Future track metadata
- Future S3 audio object references

This branch adds Terraform for the DynamoDB metadata table only. It does not deploy the backend, upload audio to S3, or add queues/Lambda yet.

## Table

Default table name for dev:

```text
loopr-dev-metadata
```

The table name can be overridden with:

```bash
metadata_table_name = "custom-table-name"
```

## Keys

The table uses a single-table design.

Primary key:

```bash
pk
sk
```

Project item shape:

```bash
pk = PROJECT#projectId
sk = METADATA
```

Session item shape:

```bash
pk = PROJECT#projectId
sk = SESSION#sessionId
```

This lets the backend query sessions that belong to a project.

## Indexes

### GSI1

Used for listing projects.

```bash
gsi1pk = PROJECTS
gsi1sk = UPDATED_AT#timestamp#PROJECT#projectId
```

### GSI2

Used for session lookup by session ID.

```bash
gsi2pk = SESSION#sessionId
gsi2sk = METADATA
```

## Backend connection

Terraform exposes a `backend_env` output with values the backend can use later:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION=<region>
DYNAMODB_METADATA_TABLE_NAME=<table-name>
```

The backend already has a `PERSISTENCE_DRIVER` setting and DynamoDB repository implementations. This Terraform branch prepares the matching AWS table, but does not deploy or run the backend against AWS yet.

## Validation commands

From `infra/terraform`:

```bash
terraform fmt -recursive
terraform init -backend=false
terraform validate
```

## Apply status

Do not apply by default.

The project should first commit the infrastructure code, review it in a PR, and then decide when to create real AWS resources.
