# 🧹 Cleanup Scripts - Usage Guide

## Available Cleanup Scripts

Two cleanup scripts have been created to help maintain a clean BISMAN ERP project.

---

## 1. cleanup-duplicates.sh

**Purpose**: Quick cleanup of backup and temporary files

**What it does**:
- Removes backup directories
- Removes `.backup` files
- Removes `.bak` files
- Removes old backup pages
- Cleans empty directories

**Usage**:
```bash
./cleanup-duplicates.sh
```

**When to use**:
- After development sessions
- Before committing code
- Weekly maintenance

---

## 2. cleanup-comprehensive.sh

**Purpose**: Full cleanup including documentation organization

**What it does**:
- Removes temporary files
- Removes old fix scripts
- Archives old documentation to `docs/archive/`
- Removes old database dumps (>30 days)
- Cleans empty directories

**Usage**:
```bash
./cleanup-comprehensive.sh
```

**When to use**:
- Monthly project maintenance
- Before major releases
- When root directory gets cluttered
- Before deployment

---

## Documentation Patterns Archived

The comprehensive script automatically archives these documentation types:

- `*_FIX.md` - Bug fix documentation
- `*_COMPLETE.md` - Completed task docs
- `*_SUMMARY.md` - Old summaries
- `*_REPORT.md` - Audit reports
- `*_CHECKLIST.md` - Deployment checklists
- `*_VERIFICATION.md` - Verification guides
- `BEFORE_AFTER*.md` - Comparison docs
- `*_STATUS.md` - Status reports
- `*COMPARISON*.md` - Comparison docs

---

## Maintenance Schedule

### Daily
- No cleanup needed (scripts don't remove active work)

### Weekly
```bash
./cleanup-duplicates.sh
```
- Removes accumulated backup files
- Cleans temporary files

### Monthly
```bash
./cleanup-comprehensive.sh
```
- Full documentation organization
- Archive old docs
- Clean database dumps

### Before Deployment
```bash
./cleanup-duplicates.sh
./cleanup-comprehensive.sh
```
- Ensure clean codebase
- Organized documentation
- No unnecessary files in deployment

---

## Safe to Use

Both scripts are **safe to run** because they:
- ✅ Only remove backup/temporary files
- ✅ Archive (not delete) documentation
- ✅ Preserve all active code
- ✅ Keep essential documentation
- ✅ Skip node_modules and .git directories

---

## What Won't Be Removed

These files are **always preserved**:
- Active source code (.tsx, .ts, .js, .jsx)
- Package files (package.json, package-lock.json)
- Configuration files (tsconfig.json, next.config.js)
- Essential documentation (README.md, DEPLOYMENT.md)
- Current implementation guides
- node_modules (never touched)
- .git directory (never touched)

---

## Archived Files Location

All archived documentation is moved to:
```
docs/archive/
```

You can always:
- View archived files
- Restore if needed
- Reference for historical context

---

## Manual Cleanup

If you need to manually clean specific files:

```bash
# Remove specific backup
rm path/to/file.backup

# Remove temporary directory
rm -rf path/to/temp-dir

# Move doc to archive
mv DOCUMENT.md docs/archive/
```

---

## Git Integration

After running cleanup scripts:

```bash
# Check what was removed
git status

# Review changes
git diff

# Commit cleanup
git add .
git commit -m "chore: cleanup duplicate and temporary files"
```

---

## Troubleshooting

**Script permission denied?**
```bash
chmod +x cleanup-duplicates.sh
chmod +x cleanup-comprehensive.sh
```

**Need to restore archived docs?**
```bash
mv docs/archive/DOCUMENT.md ./
```

**Want to see what will be removed?**
- Open script in editor
- Review the patterns
- All removals are logged during execution

---

## Best Practices

1. **Before Cleanup**: Commit any important work
2. **Run Regularly**: Don't let clutter accumulate
3. **Review Output**: Check what was removed
4. **Archive Important**: Move important docs before archiving
5. **Git Commit**: Commit cleanup changes separately

---

*Keep your BISMAN ERP project clean and organized!* ✨
