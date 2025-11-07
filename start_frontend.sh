#!/bin/bash
# Script to start the frontend server on port 3001

cd "$(dirname "$0")/frontend"

# Load nvm if available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use default
fi

echo "Starting frontend on port 3001..."
echo "Backend should be running on port 3000"
echo ""
echo "Once started, open: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev



