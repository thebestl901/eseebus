#!/usr/bin/env bash
set -euo pipefail

AUTHOR_NAME="TheBestopq"
AUTHOR_EMAIL="thebestl901@users.noreply.github.com"
OLD_NAME="KC Y"

env_filter='
if [ "$GIT_AUTHOR_NAME" = "'"$OLD_NAME"'" ]; then
  export GIT_AUTHOR_NAME="'"$AUTHOR_NAME"'"
  export GIT_AUTHOR_EMAIL="'"$AUTHOR_EMAIL"'"
fi
if [ "$GIT_COMMITTER_NAME" = "'"$OLD_NAME"'" ]; then
  export GIT_COMMITTER_NAME="'"$AUTHOR_NAME"'"
  export GIT_COMMITTER_EMAIL="'"$AUTHOR_EMAIL"'"
fi
'

has_kc_y_commits() {
  local range="$1"
  git log "$range" --author="$OLD_NAME" -1 --format=%H >/dev/null 2>&1
}

rewrite_ref() {
  local ref="$1"
  echo "Rewriting author on $ref: $OLD_NAME -> $AUTHOR_NAME"
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter "$env_filter" "$ref" >/dev/null
}

case "${1:-}" in
  --all-branches)
  found=0
  for ref in $(git for-each-ref --format='%(refname)' refs/heads/); do
    if git log "$ref" --author="$OLD_NAME" -1 --format=%H >/dev/null 2>&1; then
      found=1
      rewrite_ref "$ref"
    fi
  done
  if [ "$found" -eq 1 ]; then
    git for-each-ref --format='%(refname)' refs/original/ | xargs -n1 git update-ref -d 2>/dev/null || true
    git reflog expire --expire=now --all
    git gc --prune=now --quiet
    echo "All local branches updated."
  else
    echo "No $OLD_NAME commits found on local branches."
  fi
  ;;
  --ref)
    rewrite_ref "${2:?ref required}"
    ;;
  --check-range)
    has_kc_y_commits "${2:?range required}"
    ;;
  *)
    echo "Usage: $0 --all-branches | --ref <ref> | --check-range <range>" >&2
    exit 1
    ;;
esac
