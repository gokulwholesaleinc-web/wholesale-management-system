#!/bin/bash

echo "=== Git Configuration Cleanup & Fix ==="
echo

# Step 1: Remove all lock files
echo "Step 1: Removing lock files..."
rm -f .git/config.lock
rm -f .git/index.lock
rm -f .git/HEAD.lock
rm -f .git/refs/heads/main.lock
echo "Lock files removed"
echo

# Step 2: Show current config
echo "Step 2: Current Git configuration:"
cat .git/config
echo

# Step 3: Create corrected config
echo "Step 3: Creating corrected Git configuration..."
cat > .git/config << EOF
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
[remote "origin"]
	url = https://github.com/gokulwholesaleinc-web/wholesale-management-system.git
	fetch = +refs/heads/*:refs/remotes/origin/*
EOF

echo "Git configuration updated"
echo

# Step 4: Verify fix
echo "Step 4: Verifying configuration:"
git remote -v
echo

echo "Step 5: Now you can push with:"
echo "git add ."
echo "git commit -m 'Fixed order display bugs and improved data handling'"
echo "git push -u origin main"