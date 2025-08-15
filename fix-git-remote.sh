#!/bin/bash

echo "=== Git Remote Fix Script ==="
echo "Current Git configuration:"
echo

# Show current remotes
echo "Current remotes:"
git remote -v
echo

# Show current config
echo "Current Git config:"
cat .git/config
echo

echo "=== Manual Fix Instructions ==="
echo "Run these commands to fix the Git configuration:"
echo
echo "1. Remove the incorrect remote:"
echo "   git remote remove orgin"
echo
echo "2. Add the correct remote:"
echo "   git remote add origin https://github.com/gokulwholesaleinc-web/wholesale-management-system.git"
echo
echo "3. Verify the fix:"
echo "   git remote -v"
echo
echo "4. Push to the repository:"
echo "   git add ."
echo "   git commit -m 'Fixed order display bugs and improved data handling'"
echo "   git push -u origin main"
echo
echo "=== Alternative: Direct Config Edit ==="
echo "If the above doesn't work, manually edit .git/config:"
echo "Change [remote \"orgin\"] to [remote \"origin\"]"
echo "Change the URL to: https://github.com/gokulwholesaleinc-web/wholesale-management-system.git"