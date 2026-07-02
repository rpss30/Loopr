locals {
  name_prefix         = "${var.project_name}-${var.environment}"
  metadata_table_name = coalesce(var.metadata_table_name, "${local.name_prefix}-metadata")
  audio_bucket_name   = coalesce(var.audio_bucket_name, "${local.name_prefix}-audio")

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "metadata" {
  name                        = local.metadata_table_name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "pk"
  range_key                   = "sk"
  deletion_protection_enabled = var.enable_deletion_protection

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  attribute {
    name = "gsi2pk"
    type = "S"
  }

  attribute {
    name = "gsi2sk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    projection_type = "ALL"

    key_schema {
      attribute_name = "gsi1pk"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "gsi1sk"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "gsi2"
    projection_type = "ALL"

    key_schema {
      attribute_name = "gsi2pk"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "gsi2sk"
      key_type       = "RANGE"
    }
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = {
    Name = local.metadata_table_name
  }
}

resource "aws_s3_bucket" "audio" {
  bucket        = local.audio_bucket_name
  force_destroy = var.audio_bucket_force_destroy

  tags = {
    Name = local.audio_bucket_name
  }
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket = aws_s3_bucket.audio.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "audio" {
  bucket = aws_s3_bucket.audio.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "audio" {
  bucket = aws_s3_bucket.audio.id

  versioning_configuration {
    status = var.enable_audio_bucket_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_cors_configuration" "audio" {
  count  = length(var.audio_cors_allowed_origins) > 0 ? 1 : 0
  bucket = aws_s3_bucket.audio.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = var.audio_cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
