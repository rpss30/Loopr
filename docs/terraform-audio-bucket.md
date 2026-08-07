# Terraform Audio Bucket

This document describes the Terraform design for Loopr's S3 audio bucket.

This configuration has been validated only. It does not apply Terraform or create real AWS resources by default.

## Purpose

Loopr can coordinate recorded audio uploads through backend-generated presigned S3 URLs while keeping local playback as the mobile fallback path. DynamoDB stores the metadata references for uploaded tracks.

The audio bucket is intended to store objects using this key shape:

```text
projects/{projectId}/sessions/{sessionId}/tracks/{trackId}.m4a
```

## Resources

Terraform defines:

```bash
aws_s3_bucket.audio
aws_s3_bucket_public_access_block.audio
aws_s3_bucket_ownership_controls.audio
aws_s3_bucket_server_side_encryption_configuration.audio
aws_s3_bucket_versioning.audio
aws_s3_bucket_cors_configuration.audio
```

## Security defaults

The bucket defaults are intentionally conservative:

```bash
public access blocked
bucket owner enforced object ownership
AES256 server-side encryption
versioning enabled by default
CORS disabled by default
force destroy disabled by default
```

## Naming

By default, the bucket name is:

```bash
loopr-dev-audio
```

S3 bucket names are globally unique, so real deployments may need to override this with:

```bash
audio_bucket_name = "your-unique-loopr-dev-audio-bucket"
```

## Backend environment output

Terraform outputs a `backend_env` map that includes:

```bash
PERSISTENCE_DRIVER=dynamodb
AWS_REGION
DYNAMODB_METADATA_TABLE_NAME
S3_AUDIO_BUCKET_NAME
```

The ASP.NET Core backend reads `S3_AUDIO_BUCKET_NAME` when generating presigned upload targets.

## Current limitations

- Terraform is validated only.
- No `terraform apply` has been run from this project by default.
- No real S3 bucket is created until infrastructure is applied intentionally.
- Presigned URL generation and mobile upload coordination exist, but real uploads require a configured S3-compatible target.
