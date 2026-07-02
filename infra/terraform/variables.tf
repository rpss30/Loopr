variable "project_name" {
  description = "Project name used for resource naming and tags."
  type        = string
  default     = "loopr"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.environment))
    error_message = "Environment must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "aws_region" {
  description = "AWS region for Loopr infrastructure."
  type        = string
  default     = "us-west-2"
}

variable "metadata_table_name" {
  description = "Optional DynamoDB metadata table name. Defaults to project-environment-metadata."
  type        = string
  default     = null
}

variable "enable_point_in_time_recovery" {
  description = "Whether to enable point-in-time recovery for the DynamoDB metadata table."
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Whether to enable deletion protection for the DynamoDB metadata table."
  type        = bool
  default     = false
}

variable "audio_bucket_name" {
  description = "Optional S3 bucket name for audio objects. Defaults to project-environment-audio."
  type        = string
  default     = null

  validation {
    condition = (
      var.audio_bucket_name == null ||
      can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.audio_bucket_name))
    )
    error_message = "Audio bucket name must look like a valid S3 bucket name."
  }
}

variable "enable_audio_bucket_versioning" {
  description = "Whether to enable versioning for the S3 audio bucket."
  type        = bool
  default     = true
}

variable "audio_bucket_force_destroy" {
  description = "Whether Terraform can delete the audio bucket even when it contains objects. Keep false unless intentionally destroying dev data."
  type        = bool
  default     = false
}

variable "audio_cors_allowed_origins" {
  description = "Allowed CORS origins for future direct audio uploads. Keep empty until needed."
  type        = list(string)
  default     = []
}
