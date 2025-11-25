#!/bin/bash
# Quick test of PiZXel modes

echo "Testing Terminal Mode..."
echo "========================"
npm start 2>&1 | head -20 &
PID=$!
sleep 2
kill $PID 2>/dev/null
wait $PID 2>/dev/null

echo ""
echo "Testing Canvas Mode..."
echo "======================"
npm run start:canvas 2>&1 | head -20 &
PID=$!
sleep 3
kill $PID 2>/dev/null
wait $PID 2>/dev/null

echo ""
echo "✓ Tests complete"
