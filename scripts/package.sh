#!/usr/bin/env bash
# Zip the repo for submission. Never include .venv or .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/ledger-submission.zip}"
STAGING="$(mktemp -d "${TMPDIR:-/tmp}/ledger-pack.XXXXXX")"

cleanup() {
  rm -rf "$STAGING"
}
trap cleanup EXIT

cd "$ROOT"

rsync -a \
  --exclude '.git/' \
  --exclude '.venv/' \
  --exclude '**/.venv/' \
  --exclude 'node_modules/' \
  --exclude '**/node_modules/' \
  --exclude 'dist/' \
  --exclude '**/dist/' \
  --exclude '__pycache__/' \
  --exclude '**/__pycache__/' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude '**/.env' \
  --exclude '__MACOSX/' \
  --exclude '**/__MACOSX/' \
  --exclude '*.tsbuildinfo' \
  --exclude '**/*.tsbuildinfo' \
  --exclude 'ledger-submission.zip' \
  --exclude '.DS_Store' \
  ./ "$STAGING/ledger/"

# Hard fail if exclusions were missed — never ship secrets or a local venv.
if find "$STAGING" \( -path '*/.venv/*' -o -name '.venv' -o -name '.env' -o -path '*/.env' \) | grep -q .; then
  echo "error: staging tree still contains .venv or .env — aborting" >&2
  find "$STAGING" \( -path '*/.venv/*' -o -name '.venv' -o -name '.env' -o -path '*/.env' \) >&2
  exit 1
fi

rm -f "$OUT"
(
  cd "$STAGING"
  zip -rq "$OUT" ledger
)

# Verify the zip itself
if unzip -Z1 "$OUT" | grep -E '(^|/)(\.venv(/|$)|\.env$)' >/dev/null; then
  echo "error: zip still lists .venv or .env — deleting and aborting" >&2
  rm -f "$OUT"
  exit 1
fi

echo "Wrote $OUT ($(du -h "$OUT" | awk '{print $1}'))"
