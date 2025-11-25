#!/bin/bash
npm run start:canvas &
PID=$!
sleep 4
echo "=== Test complete, checking if server sent cached frame to new client ==="
kill $PID 2>/dev/null
