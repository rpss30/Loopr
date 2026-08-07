# Loopr Terraform

Terraform configuration for Loopr AWS infrastructure.

This folder defines the DynamoDB metadata table used by the backend for project, session, and track metadata, plus the S3 bucket intended for recorded audio objects. Backend deployment infrastructure is not included yet.

## Current resources

- DynamoDB metadata table
- S3 audio bucket
- Primary key:
  - `pk`
  - `sk`
- Global secondary indexes:
  - `gsi1` for listing projects
  - `gsi2` for looking up sessions and tracks

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

## Backend Environment Outputs

The Terraform output `backend_env` provides the backend variables needed for DynamoDB metadata persistence and S3 upload coordination:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION=<region>
DYNAMODB_METADATA_TABLE_NAME=<table-name>
S3_AUDIO_BUCKET_NAME=<bucket-name>
```

The backend currently defaults to in-memory persistence locally. DynamoDB mode and real S3 uploads should only be used after the infrastructure exists and AWS credentials are configured.

## Current limitations

- No remote Terraform backend yet.
- No SQS/Lambda infrastructure yet.
- No backend deployment infrastructure yet.
- No infrastructure deployment pipeline yet.

## Audio Bucket

Terraform defines the S3 bucket for Loopr audio files.

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

This configuration has only been formatted and validated. Do not run `terraform apply` until creating real AWS resources is an intentional project decision.
