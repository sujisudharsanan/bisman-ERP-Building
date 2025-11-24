#!/usr/bin/env bash
set -euo pipefail

export ANALYZE=1
export NEXT_TELEMETRY_DISABLED=1

echo "[analyze] Building with bundle analyzer"

npm run build

OUTPUT_DIR=.next/analyze
mkdir -p "$OUTPUT_DIR"
# Next bundle analyzer places static HTML reports in .next folder; copy or point user there.
echo "Bundle analysis complete. Open .next/analyze or the generated report in your browser." > "$OUTPUT_DIR/README.txt"
