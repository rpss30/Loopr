output "metadata_table_name" {
  description = "Name of the DynamoDB metadata table."
  value       = aws_dynamodb_table.metadata.name
}

output "metadata_table_arn" {
  description = "ARN of the DynamoDB metadata table."
  value       = aws_dynamodb_table.metadata.arn
}

output "aws_region" {
  description = "AWS region used by this Terraform configuration."
  value       = var.aws_region
}

output "backend_env" {
  description = "Environment variables needed by the backend for DynamoDB persistence."
  value = {
    PERSISTENCE_DRIVER           = "dynamodb"
    AWS_REGION                   = var.aws_region
    DYNAMODB_METADATA_TABLE_NAME = aws_dynamodb_table.metadata.name
  }
}
