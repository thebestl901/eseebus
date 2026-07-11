#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

chmod +x scripts/git-ensure-author.sh scripts/githooks/pre-push

git config --local user.name "TheBestopq"
git config --local user.email "thebestl901@users.noreply.github.com"
git config --local core.hooksPath scripts/githooks

echo "Local git author set to TheBestopq"
echo "pre-push hook enabled via core.hooksPath=scripts/githooks"
