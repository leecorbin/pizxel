#!/bin/bash
npm run start:canvas &
PID=$!
sleep 5
kill $PID 2>/dev/null || true
wait $PID 2>/dev/null
