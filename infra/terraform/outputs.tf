output "metadata_table_name" {
  description = "DynamoDB metadata table name."
  value       = aws_dynamodb_table.metadata.name
}

output "metadata_table_arn" {
  description = "DynamoDB metadata table ARN."
  value       = aws_dynamodb_table.metadata.arn
}

output "audio_bucket_name" {
  description = "S3 bucket name for audio objects."
  value       = aws_s3_bucket.audio.bucket
}

output "audio_bucket_arn" {
  description = "S3 bucket ARN for audio objects."
  value       = aws_s3_bucket.audio.arn
}

output "aws_region" {
  description = "AWS region for Loopr resources."
  value       = var.aws_region
}

output "backend_env" {
  description = "Backend environment values for deployed infrastructure."
  value = {
    PERSISTENCE_DRIVER           = "dynamodb"
    AWS_REGION                   = var.aws_region
    DYNAMODB_METADATA_TABLE_NAME = aws_dynamodb_table.metadata.name
    S3_AUDIO_BUCKET_NAME         = aws_s3_bucket.audio.bucket
  }
}
