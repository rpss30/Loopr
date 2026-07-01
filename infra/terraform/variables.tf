variable "project_name" {
  description = "Project name used for resource naming and tags."
  type        = string
  default     = "loopr"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for Loopr infrastructure."
  type        = string
  default     = "us-west-2"
}

variable "metadata_table_name" {
  description = "DynamoDB table name for Loopr metadata."
  type        = string
  default     = null
}

variable "enable_point_in_time_recovery" {
  description = "Whether to enable DynamoDB point-in-time recovery."
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Whether to enable DynamoDB deletion protection."
  type        = bool
  default     = false
}
