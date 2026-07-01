locals {
  name_prefix         = "${var.project_name}-${var.environment}"
  metadata_table_name = coalesce(var.metadata_table_name, "${local.name_prefix}-metadata")

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "metadata" {
  name         = local.metadata_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

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