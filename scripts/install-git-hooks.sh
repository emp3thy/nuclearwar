#!/bin/sh
# Install this repo's tracked git hooks into .git/hooks without disturbing
# hooks other tools manage there (e.g. graphify's post-commit/post-checkout).
# Run once per clone:  sh scripts/install-git-hooks.sh

set -e

repo_root=$(git rev-parse --show-toplevel)
src="$repo_root/scripts/git-hooks"
dst="$repo_root/.git/hooks"

for hook in "$src"/*; do
  name=$(basename "$hook")
  cp "$hook" "$dst/$name"
  chmod +x "$dst/$name"
  echo "installed: .git/hooks/$name"
done

echo "Done. Direct pushes to main will now be blocked locally."
