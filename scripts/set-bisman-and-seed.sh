#!/usr/bin/env bash
# scripts/set-bisman-and-seed.sh
# Usage: bash scripts/set-bisman-and-seed.sh
# Safety: backs up modified files to .db-url-backups/<timestamp>/

set -euo pipefail

# --- Config (edit only if you really must) ---
TARGET_DSN='postgresql://erp_admin:StrongPassword123@localhost:5432/BISMAN'
SEED_EMAIL='Suji@gmail.com'
SEED_PASSWORD='Password@123'
SEED_ROLE='ADMIN'

# --- Helpers ---
REPO_ROOT="$(pwd)"
BACKUP_DIR="${REPO_ROOT}/.db-url-backups/$(date +%Y%m%dT%H%M%S)"
mkdir -p "${BACKUP_DIR}"

echo
echo "Target DSN: ${TARGET_DSN}"
echo "Backup directory: ${BACKUP_DIR}"
echo

# 1) Create/overwrite repo root .env to ensure the canonical DSN is present
cat > "${REPO_ROOT}/.env" <<EOF
# Repo-root .env (overwritten by this script)
NODE_ENV=development
PORT=3000
JWT_SECRET=local_dev_jwt_secret
EOF

echo "Wrote ${REPO_ROOT}/.env"

# Use a portable approach (macOS bash may be bash 3.x without mapfile/readarray)
TMP_FILE="$(mktemp -t dburl-files.XXXX)"
FILES_WITH_DBURL=()
while IFS= read -r line || [ -n "$line" ]; do
  FILES_WITH_DBURL+=("$line")
done < "$TMP_FILE"
rm -f "$TMP_FILE"

if [ "${#FILES_WITH_DBURL[@]}" -eq 0 ]; then
else
  # compute absolute path of repo root .env once (portable)
  REPO_ENV_ABS="$(cd "$(dirname "${REPO_ROOT}/.env")" && pwd)/$(basename "${REPO_ROOT}/.env")"

  for f in "${FILES_WITH_DBURL[@]}"; do
    # normalize path (portable absolute path)
    file="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
    # skip the .env we just intentionally wrote
    if [ "$file" = "$REPO_ENV_ABS" ]; then
      echo " - Skipping repo root .env (we just set it): ${f}"
      continue
    fi

    dest="${BACKUP_DIR}/$(echo "$f" | sed 's|/|__|g')"
    mkdir -p "$(dirname "$dest")"
    cp -p "$f" "$dest"
    echo " - Backed up $f -> $dest"

    # Use perl for robust in-place editing and compatibility on macOS

    fi

    echo "   cleaned: $f"
  done
fi

echo
# show the env value (hidden password echo is intentional per your request)

# Run the provided script to list tables
if [ -f "my-backend/scripts/list-tables.js" ]; then
  echo
  echo "--- Running list-tables.js ---"
  node my-backend/scripts/list-tables.js || {
    echo "ERROR: list-tables.js failed. Check that Postgres is running and the DSN is correct."
    exit 1
  }
else
  echo "ERROR: my-backend/scripts/list-tables.js not found. Cannot verify DB connection."
  exit 1
fi

# Small pause
sleep 1

echo
echo "4) Running create-admin.js seeder to upsert admin user..."
if [ -f "my-backend/scripts/create-admin.js" ]; then
  # Pass args: email password role
  node my-backend/scripts/create-admin.js "${SEED_EMAIL}" "${SEED_PASSWORD}" "${SEED_ROLE}" || {
    exit 1
  }
else
  echo "ERROR: my-backend/scripts/create-admin.js not found. Seeder not run."
  exit 1
fi

echo
echo "Done. Seeder ran (or reported its own status)."
echo
echo "Notes / next steps:"
echo
