# 🏗️ Multi-Tenant ERP System - Setup Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Database Setup](#database-setup)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [API Documentation](#api-documentation)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This is a hybrid multi-tenant ERP system where:
- **Enterprise Database**: Stores enterprise admins, super admins, clients, and modules
- **Client Databases**: Each tenant gets their own isolated database

**Tech Stack:**
- Backend: Node.js + Express + TypeScript
- ORM: Prisma (PostgreSQL)
- Frontend: Next.js 14 + TypeScript + TailwindCSS
- Auth: JWT
- Connection Pooling: PgBouncer (recommended)

---

## ✅ Prerequisites

- **Node.js**: v18+ ([Download](https://nodejs.org/))
- **PostgreSQL**: v14+ ([Download](https://www.postgresql.org/download/))
- **pnpm/npm/yarn**: Package manager
- **Git**: Version control

### Install Dependencies

```bash
# Install Node.js packages
cd server
npm install

cd ../my-frontend
npm install
```

---

## 💿 Database Setup

### 1. Install PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14

# Windows
# Download installer from postgresql.org
```

### 2. Create Databases

```bash
# Connect to PostgreSQL
psql postgres

# Create enterprise database
CREATE DATABASE enterprise_db;

# Create admin user (for provisioning)
CREATE USER db_admin WITH PASSWORD 'your_secure_password';
GRANT CREATE ON DATABASE TO db_admin;
ALTER USER db_admin CREATEDB;

# Exit psql
\q
```

### 3. Set up Environment Variables

Create `.env` file in `server/` directory:

```env
# Enterprise Database
ENTERPRISE_DATABASE_URL="postgresql://postgres:password@localhost:5432/enterprise_db"

# Admin connection (for creating client databases)
ADMIN_DATABASE_URL="postgresql://db_admin:your_secure_password@localhost:5432/postgres"

# Database Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_USERNAME="postgres"
DB_PASSWORD="password"

# JWT Secrets
ENTERPRISE_JWT_SECRET="your-super-secret-enterprise-key-change-this"
CLIENT_JWT_SECRET="your-super-secret-client-key-change-this"

# Environment
NODE_ENV="development"
LOG_LEVEL="debug"

# Optional: Database Encryption
DB_ENCRYPTION_ENABLED="false"
DB_ENCRYPTION_KEY="your-32-byte-hex-key"

# Server Configuration
PORT="3001"
FRONTEND_URL="http://localhost:3000"
```

### 4. Run Prisma Migrations

```bash
cd server

# Generate Prisma clients
npx prisma generate --schema=prisma/schema.enterprise.prisma
npx prisma generate --schema=prisma/schema.client.prisma

# Run enterprise database migrations
npx prisma migrate dev --name init --schema=prisma/schema.enterprise.prisma

# Optional: Seed enterprise database
npm run seed:enterprise
```

---

## ⚙️ Configuration

### PgBouncer Setup (Recommended for Production)

PgBouncer helps manage connection pooling efficiently.

#### Install PgBouncer

```bash
# macOS
brew install pgbouncer

# Ubuntu/Debian
sudo apt-get install pgbouncer
```

#### Configure PgBouncer

Edit `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
enterprise_db = host=localhost port=5432 dbname=enterprise_db
client_* = host=localhost port=5432

[pgbouncer]
pool_mode = transaction
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
```

#### Create User List

Edit `/etc/pgbouncer/userlist.txt`:

```
"postgres" "md5<your_hashed_password>"
```

Generate hashed password:

```bash
echo -n "passwordpostgres" | md5sum
```

#### Start PgBouncer

```bash
pgbouncer -d /etc/pgbouncer/pgbouncer.ini
```

#### Update Connection Strings

```env
# Use PgBouncer instead of direct connection
ENTERPRISE_DATABASE_URL="postgresql://postgres:password@localhost:6432/enterprise_db"
```

---

## 🚀 Running the Application

### Development Mode

#### 1. Start Backend Server

```bash
cd server
npm run dev
```

Server runs on `http://localhost:3001`

#### 2. Start Frontend

```bash
cd my-frontend
npm run dev
```

Frontend runs on `http://localhost:3000`

### Production Mode

```bash
# Backend
cd server
npm run build
npm start

# Frontend
cd my-frontend
npm run build
npm start
```

---

## 📚 API Documentation

### Authentication Endpoints

#### Enterprise Admin Login

```http
POST /api/enterprise/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "admin": {
    "id": "uuid",
    "email": "admin@company.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

#### Client User Login

```http
POST /api/client/auth/login
Content-Type: application/json
x-tenant-id: <client-uuid>

{
  "email": "user@tenant.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@tenant.com",
    "name": "John Doe",
    "roles": ["admin"]
  }
}
```

### Client Management Endpoints

#### Create New Client (Provision Database)

```http
POST /api/enterprise/clients
Authorization: Bearer <enterprise-admin-token>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme",
  "adminEmail": "admin@acme.com",
  "adminName": "Acme Admin",
  "businessType": "retail",
  "segment": "Business ERP",
  "tier": "PROFESSIONAL"
}

Response:
{
  "success": true,
  "client": {
    "id": "uuid",
    "name": "Acme Corporation",
    "slug": "acme",
    "dbName": "client_db_uuid",
    "status": "ACTIVE"
  },
  "credentials": {
    "adminEmail": "admin@acme.com",
    "temporaryPassword": "generated_password"
  }
}
```

#### List All Clients

```http
GET /api/enterprise/clients
Authorization: Bearer <enterprise-admin-token>

Response:
{
  "clients": [
    {
      "id": "uuid",
      "name": "Acme Corporation",
      "slug": "acme",
      "status": "ACTIVE",
      "tier": "PROFESSIONAL",
      "createdAt": "2025-10-25T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Tenant-Scoped Endpoints

#### Get Users (Tenant-Scoped)

```http
GET /api/client/users
Authorization: Bearer <client-user-token>
x-tenant-id: <client-uuid>

Response:
{
  "users": [
    {
      "id": "uuid",
      "email": "user@tenant.com",
      "name": "John Doe",
      "roles": ["admin"],
      "isActive": true
    }
  ]
}
```

#### Create Role

```http
POST /api/client/roles
Authorization: Bearer <client-user-token>
x-tenant-id: <client-uuid>
Content-Type: application/json

{
  "name": "Sales Manager",
  "slug": "sales-manager",
  "description": "Manages sales team and operations"
}
```

---

## 🧪 Testing

### Run Unit Tests

```bash
cd server
npm test
```

### Run Integration Tests

```bash
npm run test:integration
```

### Manual Testing

#### Test Client Provisioning

```bash
# Create test enterprise admin
npm run seed:enterprise

# Login as enterprise admin
curl -X POST http://localhost:3001/api/enterprise/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bisman.com",
    "password": "admin123"
  }'

# Create new client
curl -X POST http://localhost:3001/api/enterprise/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "slug": "test-company",
    "adminEmail": "admin@test.com",
    "adminName": "Test Admin"
  }'

# Login as client admin
curl -X POST http://localhost:3001/api/client/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <client-id>" \
  -d '{
    "email": "admin@test.com",
    "password": "<temporary-password>"
  }'
```

---

## 🚀 Deployment

### Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate --schema=prisma/schema.enterprise.prisma
RUN npx prisma generate --schema=prisma/schema.client.prisma
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: enterprise_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  pgbouncer:
    image: pgbouncer/pgbouncer
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: postgres
      DATABASES_PASSWORD: postgres
    ports:
      - "6432:6432"
    depends_on:
      - postgres

  backend:
    build: ./server
    environment:
      ENTERPRISE_DATABASE_URL: postgresql://postgres:postgres@pgbouncer:6432/enterprise_db
      ADMIN_DATABASE_URL: postgresql://postgres:postgres@postgres:5432/postgres
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - pgbouncer

  frontend:
    build: ./my-frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### 3. Deploy

```bash
docker-compose up -d
```

### Cloud Deployment (AWS Example)

#### 1. RDS Setup

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier bisman-erp-enterprise \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14 \
  --master-username postgres \
  --master-user-password <secure-password> \
  --allocated-storage 100

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier bisman-erp-enterprise \
  --query 'DBInstances[0].Endpoint.Address'
```

#### 2. ECS/EKS Deployment

```bash
# Build and push Docker image
docker build -t bisman-erp-backend ./server
docker tag bisman-erp-backend:latest <account-id>.dkr.ecr.region.amazonaws.com/bisman-erp:latest
docker push <account-id>.dkr.ecr.region.amazonaws.com/bisman-erp:latest

# Deploy to ECS
aws ecs update-service \
  --cluster bisman-erp-cluster \
  --service backend-service \
  --force-new-deployment
```

---

## 🔍 Troubleshooting

### Issue: Connection Refused

**Problem**: Cannot connect to PostgreSQL

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check pg_hba.conf allows local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line:
host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo service postgresql restart
```

### Issue: Prisma Client Not Generated

**Problem**: Module '.prisma/client-enterprise' not found

**Solution**:
```bash
cd server
npx prisma generate --schema=prisma/schema.enterprise.prisma
npx prisma generate --schema=prisma/schema.client.prisma
```

### Issue: Client Provisioning Fails

**Problem**: Error creating client database

**Solution**:
```bash
# Check admin user has CREATE DATABASE privilege
psql postgres -c "SELECT rolname, rolcreatedb FROM pg_roles WHERE rolname = 'db_admin';"

# Grant privilege if needed
psql postgres -c "ALTER USER db_admin CREATEDB;"

# Test provisioning
npm run provision-client -- --client-id=<uuid>
```

### Issue: JWT Token Invalid

**Problem**: 401 Unauthorized errors

**Solution**:
- Verify JWT secrets match in `.env`
- Check token expiration
- Ensure `Authorization: Bearer <token>` header is set
- Verify token type (enterprise vs client)

### Issue: Tenant Not Found

**Problem**: 404 Tenant not found error

**Solution**:
```bash
# Verify tenant exists
psql enterprise_db -c "SELECT id, name, status FROM clients WHERE id = '<uuid>';"

# Verify x-tenant-id header matches
curl -H "x-tenant-id: <correct-uuid>" ...
```

---

## 📖 Additional Resources

- [Architecture Documentation](./MULTI_TENANT_ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Migration Guide](./docs/MIGRATIONS.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 🤝 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@bisman-erp.com
- Documentation: https://docs.bisman-erp.com

---

## 📝 License

Proprietary - All Rights Reserved

---

**Last Updated**: October 25, 2025
