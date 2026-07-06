#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/create-feature.sh feature-name"
  exit 1
fi

FEATURE="$1"
mkdir -p "apps/web/src/features/$FEATURE"
touch "apps/web/src/features/$FEATURE/index.ts"
echo "Created apps/web/src/features/$FEATURE"
