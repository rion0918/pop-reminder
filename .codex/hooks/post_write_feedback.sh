#!/usr/bin/env bash

set +e

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$repo_root" ]; then
  cd "$repo_root" || exit 0
fi

MVH_FEEDBACK_EXIT_ZERO=1 node scripts/mvh-feedback.mjs

exit 0
