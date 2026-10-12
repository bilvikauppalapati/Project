#!/bin/bash

cd "$(dirname "$0")" || exit 1

pkill -f "pawshare/start.sh" 2>/dev/null
for port in 5001 5173; do
  pids=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null
    echo "✔ Freed port $port"
  else
    echo "✔ Port $port already free"
  fi
done
rm -f .logs/pids
echo "PawShare stopped. MongoDB keeps running in the background."
