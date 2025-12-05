# =============================================================================
# RDS PostgreSQL with Read Replica
# =============================================================================

# Random password for database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-db-subnet"
  description = "Database subnet group for ${var.project_name}"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

# DB Parameter Group for PgBouncer compatibility
resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-pg-params"
  family = "postgres15"

  # Parameters optimized for connection pooling
  parameter {
    name  = "max_connections"
    value = "500"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}" # 25% of memory
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4096}" # 75% of memory
  }

  parameter {
    name  = "work_mem"
    value = "65536" # 64MB
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288" # 512MB
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1s
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  # SSL settings
  parameter {
    name  = "ssl"
    value = "1"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-pg-params"
  }
}

# Primary RDS Instance
resource "aws_db_instance" "primary" {
  identifier = "${var.project_name}-${var.environment}-primary"

  # Engine
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  parameter_group_name = aws_db_parameter_group.main.name

  # Storage
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = true

  # Backup
  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"
  delete_automated_backups  = false
  copy_tags_to_snapshot     = true
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"
  skip_final_snapshot       = false

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

  # Security
  iam_database_authentication_enabled = true
  deletion_protection                 = true

  tags = {
    Name = "${var.project_name}-${var.environment}-primary"
    Role = "primary"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Read Replica
resource "aws_db_instance" "replica" {
  identifier = "${var.project_name}-${var.environment}-replica"

  # Source
  replicate_source_db = aws_db_instance.primary.identifier

  # Engine (inherited from source)
  instance_class       = var.db_instance_class
  parameter_group_name = aws_db_parameter_group.main.name

  # Storage (inherited from source)
  storage_encrypted = true

  # Network
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  availability_zone      = var.availability_zones[1] # Different AZ from primary

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn

  # No backups for replica (uses source backups)
  backup_retention_period = 0
  skip_final_snapshot     = true

  tags = {
    Name = "${var.project_name}-${var.environment}-replica"
    Role = "replica"
  }
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
