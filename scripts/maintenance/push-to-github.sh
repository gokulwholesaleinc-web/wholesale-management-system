#!/bin/bash

# Script to push code to GitHub
echo "🚀 Pushing Gokul Wholesale e-commerce platform to GitHub..."

# Check if we have the GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not found"
    exit 1
fi

# Check git status
echo "📊 Git status:"
git status

# Check current remote
echo "🔗 Current remotes:"
git remote -v

# Add/update the correct remote
echo "🔧 Setting up GitHub remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://$GITHUB_TOKEN@github.com/gokulwholesaleinc-web/wholesale-management-system.git

# Verify remote is set
echo "✅ Updated remotes:"
git remote -v

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

echo "🎉 Push complete!"