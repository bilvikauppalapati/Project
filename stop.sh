#!/bin/bash

cd "$(dirname "$0")" || exit 1

if [ -f .logs/start.pid ]; then
  kill "$(cat .logs/start.pid)" 2>/dev/null && echo "✔ Stopped the start.sh watcher"
fi
for pid in $(pgrep -f "bash ./start.sh|bash .*pawshare/start.sh"); do
  kill "$pid" 2>/dev/null && echo "✔ Stopped start.sh (pid $pid)"
done
sleep 1

for port in 5001 5173 5174; do
  pids=$(lsof -ti tcp:$port -sTCP:LISTEN 2>/dev/null)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null; sleep 1
    pids=$(lsof -ti tcp:$port -sTCP:LISTEN 2>/dev/null)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null
    echo "✔ Freed port $port"
  else
    echo "✔ Port $port already free"
  fi
done
rm -f .logs/pids .logs/start.pid
echo "PawShare stopped. MongoDB keeps running in the background (port 27017)."
