#!/bin/bash

# generate-commit.sh - Generate conventional commit messages
# Usage: ./generate-commit.sh [commit-type]
# Example: ./generate-commit.sh feat
#          ./generate-commit.sh  # auto-detect

set -e

# Configuration
COMMIT_TYPE="${1}"
MAX_DESC_LENGTH=50

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if there are staged changes
STAGED_COUNT=$(git diff --cached --name-only | wc -l)
if [ "$STAGED_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Error: No staged changes found${NC}"
    echo "   Stage changes first: git add <files>"
    exit 1
fi

echo -e "${BLUE}📝 Analyzing staged changes...${NC}"
echo ""

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

echo -e "${BLUE}📄 Staged files:${NC}"
echo "$STAGED_FILES" | sed 's/^/   • /'
echo ""

# Detect commit type if not specified
if [ -z "$COMMIT_TYPE" ]; then
    echo -e "${BLUE}🔍 Detecting commit type...${NC}"
    
    HAS_FEATURE=false
    HAS_FIX=false
    HAS_REFACTOR=false
    HAS_TEST=false
    HAS_DOCS=false
    HAS_PERF=false
    
    # Analyze file patterns and changes
    while IFS= read -r FILE; do
        FILE_LOWER=$(echo "$FILE" | tr '[:upper:]' '[:lower:]')
        
        # Check file extensions
        if [[ $FILE_LOWER == *.test.* ]] || [[ $FILE_LOWER == *.spec.* ]]; then
            HAS_TEST=true
        elif [[ $FILE_LOWER == *.md ]] || [[ $FILE_LOWER == *.txt ]] || [[ $FILE =~ ^docs/ ]]; then
            HAS_DOCS=true
        fi
        
        # Analyze diff for clues
        DIFF=$(git diff --cached "$FILE" 2>/dev/null || true)
        DIFF_LOWER=$(echo "$DIFF" | tr '[:upper:]' '[:lower:]')
        
        if echo "$DIFF_LOWER" | grep -qE '(perf|performance|optimize|speed|cache)'; then
            HAS_PERF=true
        fi
        if echo "$DIFF_LOWER" | grep -qE '(fix|bug|issue|error|crash)'; then
            HAS_FIX=true
        fi
        if echo "$DIFF_LOWER" | grep -qE '(refactor|restructure|clean|improve)'; then
            HAS_REFACTOR=true
        fi
        if echo "$DIFF_LOWER" | grep -qE '(feature|add|new|implement)'; then
            HAS_FEATURE=true
        fi
    done <<< "$STAGED_FILES"
    
    # Prioritize commit type
    if [ "$HAS_FIX" = true ]; then
        COMMIT_TYPE="fix"
    elif [ "$HAS_FEATURE" = true ]; then
        COMMIT_TYPE="feat"
    elif [ "$HAS_PERF" = true ]; then
        COMMIT_TYPE="perf"
    elif [ "$HAS_REFACTOR" = true ]; then
        COMMIT_TYPE="refactor"
    elif [ "$HAS_TEST" = true ]; then
        COMMIT_TYPE="test"
    elif [ "$HAS_DOCS" = true ]; then
        COMMIT_TYPE="docs"
    else
        COMMIT_TYPE="chore"
    fi
    
    echo -e "   Detected type: ${GREEN}${COMMIT_TYPE}${NC}"
fi

# Validate commit type
VALID_TYPES="feat|fix|refactor|test|docs|perf|ci|chore|style"
if ! echo "$VALID_TYPES" | grep -q "$COMMIT_TYPE"; then
    echo -e "${RED}❌ Invalid commit type: $COMMIT_TYPE${NC}"
    echo "   Valid types: feat, fix, refactor, test, docs, perf, ci, chore, style"
    exit 1
fi

echo ""
echo -e "${BLUE}💡 Generating commit message...${NC}"
echo ""

# Infer scope from files
SCOPE=""
FIRST_DIR=$(echo "$STAGED_FILES" | head -1 | cut -d'/' -f1)

# Common scope mapping
case "$FIRST_DIR" in
    src)
        FIRST_SUBDIR=$(echo "$STAGED_FILES" | head -1 | cut -d'/' -f2)
        case "$FIRST_SUBDIR" in
            components|hooks|utils|services|api|auth|db) SCOPE="$FIRST_SUBDIR" ;;
        esac
        ;;
    tests|test|spec) SCOPE="test" ;;
    docs) SCOPE="docs" ;;
    config) SCOPE="config" ;;
    .github) SCOPE="ci" ;;
esac

# Generate description based on type
case "$COMMIT_TYPE" in
    feat)
        DESC="add new feature for staged changes"
        ;;
    fix)
        DESC="resolve issue and improve stability"
        ;;
    refactor)
        DESC="restructure code for better maintainability"
        ;;
    test)
        DESC="add and improve test coverage"
        ;;
    docs)
        DESC="update documentation"
        ;;
    perf)
        DESC="optimize performance and efficiency"
        ;;
    ci)
        DESC="update CI/CD configuration"
        ;;
    chore)
        DESC="update dependencies and maintenance tasks"
        ;;
    style)
        DESC="apply code formatting and style fixes"
        ;;
esac

# Truncate description if needed
if [ ${#DESC} -gt $MAX_DESC_LENGTH ]; then
    DESC="${DESC:0:$((MAX_DESC_LENGTH-3))}..."
fi

# Build full commit message
if [ -z "$SCOPE" ]; then
    COMMIT_MSG="${COMMIT_TYPE}: ${DESC}"
else
    COMMIT_MSG="${COMMIT_TYPE}(${SCOPE}): ${DESC}"
fi

echo -e "${GREEN}✅ Suggested commit message:${NC}"
echo ""
echo -e "  ${GREEN}${COMMIT_MSG}${NC}"
echo ""

# Show change statistics
echo -e "${BLUE}📊 Change Statistics:${NC}"
FILE_COUNT=$(echo "$STAGED_FILES" | wc -l)
INSERTIONS=$(git diff --cached --numstat | awk '{sum+=$1} END {print sum+0}')
DELETIONS=$(git diff --cached --numstat | awk '{sum+=$2} END {print sum+0}')

echo "   • Files changed: $FILE_COUNT"
echo "   • Insertions: +$INSERTIONS"
echo "   • Deletions: -$DELETIONS"
echo ""

# Show detailed file changes
echo -e "${BLUE}🔄 Detailed changes:${NC}"
git diff --cached --stat | head -n -1 | sed 's/^/   /'
echo ""

echo -e "${YELLOW}💾 To commit with this message:${NC}"
echo ""
echo "   git commit -m \"$COMMIT_MSG\""
echo ""
echo -e "${YELLOW}📝 To edit before committing:${NC}"
echo ""
echo "   git commit"
echo ""
