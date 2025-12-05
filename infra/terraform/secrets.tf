# =============================================================================
# AWS Secrets Manager
# =============================================================================

# Database Credentials Secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}/${var.environment}/db-credentials"
  description = "Database credentials for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.primary.address
    port     = aws_db_instance.primary.port
    dbname   = var.db_name
    replica_host = aws_db_instance.replica.address
  })
}

# Redis Auth Token Secret
resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "${var.project_name}/${var.environment}/redis-credentials"
  description = "Redis auth token for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    host       = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
  })
}

# Application Secrets (placeholder - populate manually or via CI/CD)
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project_name}/${var.environment}/app-secrets"
  description = "Application secrets for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-${var.environment}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    JWT_SECRET           = "REPLACE_WITH_SECURE_VALUE"
    ACCESS_TOKEN_SECRET  = "REPLACE_WITH_SECURE_VALUE"
    REFRESH_TOKEN_SECRET = "REPLACE_WITH_SECURE_VALUE"
    STRIPE_SECRET_KEY    = "REPLACE_WITH_STRIPE_KEY"
    STRIPE_WEBHOOK_SECRET = "REPLACE_WITH_WEBHOOK_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string] # Don't overwrite manual updates
  }
}

# Secret Rotation (optional - for RDS)
resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }

  depends_on = [aws_lambda_permission.secret_rotation]
}

# Lambda for secret rotation (simplified - use AWS provided template in production)
resource "aws_lambda_function" "secret_rotation" {
  function_name = "${var.project_name}-${var.environment}-secret-rotation"
  role          = aws_iam_role.secret_rotation.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30

  # Use AWS provided rotation template
  filename = data.archive_file.secret_rotation.output_path

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.aws_region}.amazonaws.com"
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-secret-rotation"
  }
}

# Placeholder for rotation lambda code
data "archive_file" "secret_rotation" {
  type        = "zip"
  output_path = "${path.module}/lambda/secret_rotation.zip"

  source {
    content  = <<EOF
import json
def lambda_handler(event, context):
    # Placeholder - use AWS SecretsManager rotation template
    return {'statusCode': 200, 'body': json.dumps('OK')}
EOF
    filename = "lambda_function.py"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "secret_rotation" {
  name = "${var.project_name}-${var.environment}-secret-rotation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "secret_rotation" {
  name = "${var.project_name}-${var.environment}-secret-rotation-policy"
  role = aws_iam_role.secret_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_lambda_permission" "secret_rotation" {
  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}

# Security group for Lambda
resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-${var.environment}-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-lambda-sg"
  }
}
