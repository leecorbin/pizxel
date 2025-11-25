#!/bin/bash
# Quick test: Start canvas mode and kill after 3 seconds

echo "Starting canvas mode..."
npm run start:canvas &
PID=$!

sleep 3

echo -e "\n\nKilling process..."
kill $PID 2>/dev/null

echo "Done! If you saw 'Canvas display running at http://localhost:3001', it works!"
