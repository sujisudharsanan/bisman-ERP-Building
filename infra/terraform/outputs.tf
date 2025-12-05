# =============================================================================
# Terraform Outputs
# =============================================================================

# VPC
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

# RDS
output "db_primary_endpoint" {
  description = "Primary database endpoint"
  value       = aws_db_instance.primary.endpoint
  sensitive   = true
}

output "db_replica_endpoint" {
  description = "Replica database endpoint"
  value       = aws_db_instance.replica.endpoint
  sensitive   = true
}

output "db_primary_address" {
  description = "Primary database address (hostname only)"
  value       = aws_db_instance.primary.address
}

output "db_replica_address" {
  description = "Replica database address (hostname only)"
  value       = aws_db_instance.replica.address
}

# Redis
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

# ALB
output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID (for Route 53)"
  value       = aws_lb.main.zone_id
}

# ECS
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

# Secrets
output "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "redis_credentials_secret_arn" {
  description = "ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

output "app_secrets_arn" {
  description = "ARN of the application secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

# Connection Strings (for local development reference)
output "database_url" {
  description = "Database URL for application (via PgBouncer)"
  value       = "postgresql://${var.db_username}:PASSWORD@localhost:6432/${var.db_name}?pgbouncer=true"
  sensitive   = true
}

output "database_url_replica" {
  description = "Database URL for read replica"
  value       = "postgresql://${var.db_username}:PASSWORD@${aws_db_instance.replica.address}:5432/${var.db_name}?sslmode=require"
  sensitive   = true
}

output "redis_url" {
  description = "Redis URL for application"
  value       = "rediss://:AUTH_TOKEN@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  sensitive   = true
}

# CloudWatch Log Groups
output "app_log_group" {
  description = "CloudWatch log group for application"
  value       = aws_cloudwatch_log_group.app.name
}

output "pgbouncer_log_group" {
  description = "CloudWatch log group for PgBouncer"
  value       = aws_cloudwatch_log_group.pgbouncer.name
}

# Useful commands
output "useful_commands" {
  description = "Useful commands for managing the infrastructure"
  value = {
    ecs_exec    = "aws ecs execute-command --cluster ${aws_ecs_cluster.main.name} --task TASK_ID --container app --interactive --command /bin/sh"
    get_db_pass = "aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.db_credentials.name} --query SecretString --output text | jq -r .password"
    view_logs   = "aws logs tail ${aws_cloudwatch_log_group.app.name} --follow"
  }
}
