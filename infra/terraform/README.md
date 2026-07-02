# Loopr Terraform

Terraform configuration for Loopr AWS infrastructure.

This folder currently defines the DynamoDB metadata table used by the backend for project and session metadata. Audio storage, queues, Lambda functions, backend deployment, and CI/CD infrastructure will be added later.

## Current resources

- DynamoDB metadata table
- Primary key:
  - `pk`
  - `sk`
- Global secondary indexes:
  - `gsi1` for listing projects
  - `gsi2` for looking up sessions

## Local setup

Install Terraform, then initialize the config:

```bash
terraform init -backend=false
```

Format and validate:

```bash
terraform fmt -recursive
terraform validate
```

Do not run `terraform apply` unless you are ready to create AWS resources.

## Dev variables

Copy the example file if you want local variable overrides:

```bash
cp environments/dev.tfvars.example environments/dev.tfvars
```

`*.tfvars` files are ignored because they may contain environment-specific values.

Example plan command:

```bash
terraform plan -var-file=environments/dev.tfvars
```

## Backend environment outputs

The Terraform output `backend_env` provides the backend variables needed for DynamoDB persistence:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION=<region>
DYNAMODB_METADATA_TABLE_NAME=<table-name>
```

The backend currently defaults to in-memory persistence locally. DynamoDB mode should only be used after the table exists and AWS credentials are configured.

## Current limitations
- No remote Terraform backend yet.
- No S3 audio bucket yet.
- No SQS/Lambda infrastructure yet.
- No backend deployment infrastructure yet.
- No CI/CD pipeline yet.

## Audio bucket

Terraform also defines the future S3 bucket for Loopr audio files.

The bucket is intended to store recorded track audio using this object key shape:

```text
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

The default bucket name is:

```bash
loopr-dev-audio
```

S3 bucket names are globally unique, so real AWS deployments may need to override it in a local tfvars file:

```bash
audio_bucket_name = "your-unique-loopr-dev-audio-bucket"
```

The audio bucket uses conservative defaults:

```bash
public access blocked
bucket owner enforced object ownership
AES256 server-side encryption
versioning enabled by default
CORS disabled by default
force destroy disabled by default
```

The `backend_env` Terraform output includes:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION
DYNAMODB_METADATA_TABLE_NAME
S3_AUDIO_BUCKET_NAME
```

This branch only validates Terraform configuration. Do not run `terraform apply` until we are ready to create real AWS resources.
