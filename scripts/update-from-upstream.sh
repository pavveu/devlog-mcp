#!/bin/bash
# Update from upstream MCP TypeScript SDK
# This script helps merge updates from the original SDK

set -e

echo "🔄 Fetching latest changes from upstream SDK..."
git fetch upstream

# Create a new branch for the update
BRANCH_NAME="update-sdk-$(date +%Y%m%d)"
echo "📝 Creating update branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Attempt to merge
echo "🔀 Merging upstream changes..."
if git merge upstream/main --no-ff -m "Merge upstream SDK updates $(date +%Y-%m-%d)"; then
    echo "✅ Merge successful!"
    echo ""
    echo "Next steps:"
    echo "1. Review the changes: git log --oneline -10"
    echo "2. Test the build: npm run build && npm test"
    echo "3. If everything works: git checkout main && git merge $BRANCH_NAME"
else
    echo "❌ Merge conflicts detected!"
    echo ""
    echo "Please resolve conflicts manually, then:"
    echo "1. git add <resolved files>"
    echo "2. git commit"
    echo "3. Test thoroughly"
    echo "4. Merge to main when ready"
fi

echo ""
echo "📊 Changed files:"
git diff --name-only main