#!/bin/bash
# Test canvas mode

echo "Starting canvas mode..."
npm run start:canvas &
PID=$!

sleep 3

echo -e "\n=== Canvas mode output captured ==="
echo "Check http://localhost:3001 in your browser"
echo "Process PID: $PID"

sleep 2

echo -e "\nStopping..."
kill $PID 2>/dev/null || true
wait $PID 2>/dev/null

echo "Done!"
