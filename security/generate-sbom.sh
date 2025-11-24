#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:-bisman-fullstack:latest}"
OUT="sbom-${IMAGE//[:]/_}.json"

if ! command -v syft >/dev/null 2>&1; then
  echo "syft not installed. Install via: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin" >&2
  exit 1
fi

echo "[sbom] Generating SBOM for image: $IMAGE"
syft "$IMAGE" -o json > "$OUT"

echo "[sbom] Written: $OUT"
