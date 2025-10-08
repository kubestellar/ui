#!/usr/bin/env bash

# scripts/add-locale-warning.sh
# Appends a native speaker warning comment to all open issues labeled 'locale-sync'
# that do not already have the warning. Handles pagination, safe JSON, and logging.

set -euo pipefail

# Repository info (from environment or GitHub event)
REPO_OWNER=${REPO_OWNER:-$(jq -r .repository.owner.login "$GITHUB_EVENT_PATH")}
REPO_NAME=${REPO_NAME:-$(jq -r .repository.name "$GITHUB_EVENT_PATH")}
GITHUB_TOKEN=${GITHUB_TOKEN:-$1}

# Warning message
WARNING_BODY='⚠️ **Native speakers only:** Please assign yourself to this issue if you are fluent in the language. This ensures high-quality translations and avoids AI-generated content.'

# Pagination setup
PER_PAGE=100
PAGE=1

echo "Starting to add locale warnings for $REPO_OWNER/$REPO_NAME..."

while : ; do
  # Fetch issues labeled 'locale-sync', open state, paginated
  issues=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues?state=open&labels=locale-sync&per_page=$PER_PAGE&page=$PAGE")

  # Exit loop if no issues returned
  issue_numbers=$(echo "$issues" | jq -r '.[].number')
  if [ -z "$issue_numbers" ]; then
    echo "No more issues found. Exiting."
    break
  fi

  for issue_number in $issue_numbers; do
    # Fetch comments for the issue
    comments=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues/$issue_number/comments")

    # Add warning if not already present
    if ! echo "$comments" | jq -r '.[].body' | grep -Fq "$WARNING_BODY"; then
      curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg body "$WARNING_BODY" '{body: $body}')" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues/$issue_number/comments"
      echo "Added warning to issue #$issue_number"
    else
      echo "Warning already present on issue #$issue_number"
    fi
  done

  # Increment page for next batch
  ((PAGE++))
done

echo "Locale warning script completed successfully."