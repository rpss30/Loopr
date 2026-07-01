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
