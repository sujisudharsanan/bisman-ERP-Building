# Scripts Directory

This directory contains utility scripts for the BISMAN ERP project.

## 📁 Available Scripts

### 🔄 Database Backup & Restore

#### `backup-db.sh`
Automated PostgreSQL database backup script with retention policy.

**Features:**
- Creates timestamped backup files
- 30-day retention policy (configurable)
- Backup integrity verification
- Detailed logging
- Error handling

**Usage:**
```bash
# Manual backup
export DATABASE_URL="your_database_url"
./scripts/backup-db.sh

# Or with custom settings
BACKUP_DIR=./my-backups RETENTION_DAYS=60 ./scripts/backup-db.sh
```

**Automated Backups (Cron):**
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/bisman-erp && ./scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

#### `restore-db.sh`
Database restoration script with safety checks.

**Features:**
- Pre-restore backup creation
- Backup integrity verification
- Safety prompts
- Database connection verification

**Usage:**
```bash
# List available backups
find ./backups -name "db-backup-*.dump"

# Restore from backup
export DATABASE_URL="your_database_url"
./scripts/restore-db.sh backups/db-backup-20251013_140530.dump
```

**⚠️ WARNING:** This script will overwrite the current database!

---

## 🚀 Quick Start

### Prerequisites
- PostgreSQL client tools (`pg_dump`, `pg_restore`)
- DATABASE_URL environment variable set

### Installation
```bash
# Install PostgreSQL client (if not already installed)
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Make scripts executable
chmod +x scripts/*.sh
```

### Configuration
```bash
# Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/bisman_erp

# Or export temporarily
export DATABASE_URL="your_connection_string"
```

---

## 📋 Backup Strategy

### Retention Policy
- **Daily backups:** Retained for 30 days
- **Pre-restore backups:** Created before any restoration
- **Manual backups:** Retained indefinitely (not auto-deleted)

### Backup Location
```
project-root/
├── backups/
│   ├── db-backup-20251013_140530.dump
│   ├── db-backup-20251012_020000.dump
│   └── backup.log
```

### Backup Schedule (Recommended)
- **Development:** Manual backups before major changes
- **Staging:** Daily at 2 AM
- **Production:** 
  - Daily backups at 2 AM
  - Weekly backups retained for 90 days
  - Monthly backups retained for 1 year

---

## 🔧 Troubleshooting

### "DATABASE_URL environment variable is not set"
```bash
# Solution: Export DATABASE_URL or add to .env
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### "pg_dump: command not found"
```bash
# Solution: Install PostgreSQL client tools
brew install postgresql  # macOS
```

### "Backup verification failed"
```bash
# Solution: Check disk space and permissions
df -h                    # Check disk space
ls -la backups/         # Check permissions
```

### Restore Issues
```bash
# If restore fails, you can rollback using pre-restore backup:
./scripts/restore-db.sh backups/pre-restore-TIMESTAMP.dump
```

---

## 📊 Monitoring

### Check Backup Status
```bash
# List all backups
ls -lh backups/*.dump

# Check backup sizes
du -sh backups/

# View backup log
tail -f backups/backup.log
```

### Verify Backup Integrity
```bash
# Manually verify a backup
pg_restore --list backups/db-backup-TIMESTAMP.dump
```

---

## 🔐 Security Best Practices

1. **Encrypt backups in production:**
   ```bash
   # Example: Encrypt backup with GPG
   gpg --symmetric --cipher-algo AES256 backup.dump
   ```

2. **Store backups off-site:**
   - Use cloud storage (S3, Google Cloud Storage)
   - Use backup services (Render backups, Neon backups)

3. **Restrict access:**
   ```bash
   chmod 600 scripts/*.sh
   chmod 700 backups/
   ```

4. **Rotate DATABASE_URL credentials regularly**

---

## 📖 Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)

---

## 🤝 Contributing

When adding new scripts:
1. Follow bash best practices
2. Add error handling (`set -e`)
3. Include usage documentation
4. Add logging
5. Test thoroughly before committing

---

**Last Updated:** October 13, 2025  
**Maintainer:** BISMAN ERP Development Team
