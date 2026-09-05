#!/usr/bin/env bash
# Usage: ./scripts/set-liff-id.sh <LIFF_ID>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <LIFF_ID>" >&2
  exit 1
fi

LIFF_ID="$1"
if [[ "$LIFF_ID" == *xxxx* ]]; then
  echo "Refusing placeholder LIFF ID" >&2
  exit 1
fi

gh secret set VITE_LIFF_ID --body "$LIFF_ID" --repo curry-udon/guitar-chord-quiz-line
printf 'VITE_LIFF_ID=%s\n' "$LIFF_ID" > .env
gh workflow run Deploy --repo curry-udon/guitar-chord-quiz-line
echo "Secret set and Deploy triggered."
echo "Open later: https://liff.line.me/${LIFF_ID}"
