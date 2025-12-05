# =============================================================================
# Terraform Variables
# =============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "bisman-erp"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "bisman_prod"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "bisman_admin"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Max allocated storage for autoscaling"
  type        = number
  default     = 500
}

# Redis
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_clusters" {
  description = "Number of Redis cache clusters"
  type        = number
  default     = 2
}

# ECS
variable "app_image" {
  description = "Docker image for the application"
  type        = string
}

variable "app_cpu" {
  description = "Fargate CPU units"
  type        = number
  default     = 1024
}

variable "app_memory" {
  description = "Fargate memory in MB"
  type        = number
  default     = 2048
}

variable "app_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "bisman-erp"
    ManagedBy   = "terraform"
  }
}
