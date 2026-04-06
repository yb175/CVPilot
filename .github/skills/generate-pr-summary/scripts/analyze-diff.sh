#!/bin/bash

# analyze-diff.sh - Generate PR summary from git changes
# Usage: ./analyze-diff.sh [base-branch]
# Example: ./analyze-diff.sh main
#          ./analyze-diff.sh  # auto-detect

set -e

# Configuration
MAX_BULLET_POINTS=5
MAX_WORDS_PER_POINT=15

# Detect base branch
BASE_BRANCH="${1}"

if [ -z "$BASE_BRANCH" ]; then
  # Try upstream/main first, fallback to origin/main
  if git rev-parse upstream/main >/dev/null 2>&1; then
    BASE_BRANCH="upstream/main"
  elif git rev-parse origin/main >/dev/null 2>&1; then
    BASE_BRANCH="origin/main"
  else
    echo "❌ Error: Could not find base branch. Please specify: $0 <branch-name>"
    echo "   Available remote branches:"
    git branch -r | head -10
    exit 1
  fi
fi

# Fetch latest updates
echo "📡 Fetching latest from remotes..."
git fetch upstream 2>/dev/null || git fetch origin 2>/dev/null || true

# Verify branch exists
if ! git rev-parse "$BASE_BRANCH" >/dev/null 2>&1; then
  echo "❌ Error: Branch '$BASE_BRANCH' not found"
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🔍 Analyzing changes from $BASE_BRANCH..."
echo "   Current branch: $CURRENT_BRANCH"
echo ""

# Generate diff with meaningful context
# --no-color: remove ANSI colors
# --ignore-all-space: ignore whitespace changes
# -U1: minimal context (1 line)
DIFF=$(git diff "$BASE_BRANCH"..HEAD \
  --no-color \
  --ignore-all-space \
  --no-prefix \
  -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.json' '*.md')

if [ -z "$DIFF" ]; then
  echo "⚠️  No meaningful changes found between $BASE_BRANCH and $CURRENT_BRANCH"
  exit 0
fi

# Extract file changes and categorize them
echo "📝 Detected file changes:"
echo ""

# Get list of changed files
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"..HEAD | sort -u)
echo "$CHANGED_FILES" | while read -r file; do
  # Determine change type
  if git show "$BASE_BRANCH:$file" >/dev/null 2>&1; then
    if git show HEAD:"$file" >/dev/null 2>&1; then
      echo "   • Modified: $file"
    fi
  else
    echo "   • Added: $file"
  fi
done

echo ""
echo "💡 Summary categories detected:"
echo "   Looking for intent patterns in changes..."
echo ""

# Analyze commit messages for intent
COMMIT_MESSAGES=$(git log "$BASE_BRANCH"..HEAD --oneline --no-decorate | cut -d' ' -f2- | sort -u)

# Categorize by common patterns
has_feature=false
has_bugfix=false
has_refactor=false
has_test=false
has_config=false
has_docs=false

while IFS= read -r msg; do
  msg_lower=$(echo "$msg" | tr '[:upper:]' '[:lower:]')
  
  [[ $msg_lower =~ (feat|add|new|implement|create|feature) ]] && has_feature=true
  [[ $msg_lower =~ (fix|bug|bugfix|resolve|issue|patch) ]] && has_bugfix=true
  [[ $msg_lower =~ (refactor|restructure|clean|improve|optimize) ]] && has_refactor=true
  [[ $msg_lower =~ (test|spec|unit|e2e|testing) ]] && has_test=true
  [[ $msg_lower =~ (config|setup|build|tsconfig|package|dependencies) ]] && has_config=true
  [[ $msg_lower =~ (doc|readme|docs|document|comment) ]] && has_docs=true
done <<< "$COMMIT_MESSAGES"

# Generate bullet points based on detected intents
echo "Summary:"
POINT_COUNT=0

[ "$has_feature" = true ] && [ $POINT_COUNT -lt $MAX_BULLET_POINTS ] && \
  echo "- Added new features and functionality" && ((POINT_COUNT++))

[ "$has_bugfix" = true ] && [ $POINT_COUNT -lt $MAX_BULLET_POINTS ] && \
  echo "- Fixed bugs and resolved issues" && ((POINT_COUNT++))

[ "$has_refactor" = true ] && [ $POINT_COUNT -lt $MAX_BULLET_POINTS ] && \
  echo "- Refactored code for maintainability and performance" && ((POINT_COUNT++))

[ "$has_test" = true ] && [ $POINT_COUNT -lt $MAX_BULLET_POINTS ] && \
  echo "- Added and improved tests" && ((POINT_COUNT++))

[ "$has_config" = true ] && [ $POINT_COUNT -lt $MAX_BULLET_POINTS ] && \
  echo "- Updated configuration and dependencies" && ((POINT_COUNT++))

[ "$has_docs" = true ] && [ $POINT_COUNT -lt $MAX_BULLET_POINTS ] && \
  echo "- Updated documentation" && ((POINT_COUNT++))

[ $POINT_COUNT -eq 0 ] && echo "- Code changes and improvements"

echo ""
echo "✅ Summary generated! Copy the 'Summary:' section to your PR description."
echo ""
echo "📊 Statistics:"
COMMIT_COUNT=$(git log "$BASE_BRANCH"..HEAD --oneline | wc -l)
echo "   • Commits: $COMMIT_COUNT"
echo "   • Files changed: $(echo "$CHANGED_FILES" | wc -l)"
echo "   • Lines added: $(git diff "$BASE_BRANCH"..HEAD --stat | tail -1 | awk '{print $4}')"
