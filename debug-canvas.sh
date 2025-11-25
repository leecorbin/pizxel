#!/bin/bash
# Start canvas and capture output
echo "Starting canvas mode..."
npm run start:canvas > /tmp/canvas-test.log 2>&1 &
PID=$!

sleep 3

echo "=== Server output ==="
cat /tmp/canvas-test.log

echo ""
echo "=== Killing server ==="
kill $PID 2>/dev/null
wait $PID 2>/dev/null

echo "Done!"
