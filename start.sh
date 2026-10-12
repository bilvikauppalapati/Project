#!/bin/bash

cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"
LOG_DIR="$ROOT/.logs"
API_PORT=5001
WEB_PORT=5173
API_URL="http://localhost:$API_PORT/api/health"
WEB_URL="http://localhost:$WEB_PORT"
MONGO_BIN="$HOME/mongodb/bin"
MONGO_PLIST="$HOME/Library/LaunchAgents/org.mongodb.mongod.plist"
export PATH="$MONGO_BIN:$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[1;33m"; BOLD="\033[1m"; RESET="\033[0m"
ok()   { echo -e "  ${GREEN}✔${RESET} $1"; }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
fail() { echo -e "  ${RED}✘ $1${RESET}"; [ -n "$2" ] && echo -e "    $2"; exit 1; }
step() { echo -e "\n${BOLD}$1${RESET}"; }

SEED=false
OPEN=true
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    --no-open) OPEN=false ;;
    -h|--help)
      echo "Usage: ./start.sh [--seed] [--no-open]"
      echo "  --seed     reset the database with demo data before starting"
      echo "  --no-open  do not open the browser"
      exit 0 ;;
  esac
done

echo -e "${BOLD}🐾 PawShare startup${RESET}"

step "1. Checking tools"
command -v node >/dev/null || fail "Node.js is not installed" "Install it from https://nodejs.org"
ok "Node $(node -v) ($(node -p process.arch))"
command -v npm >/dev/null || fail "npm is not installed"
ok "npm $(npm -v)"

step "2. Freeing ports $API_PORT and $WEB_PORT"
for port in $API_PORT $WEB_PORT; do
  pids=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null; sleep 1
    pids=$(lsof -ti tcp:$port 2>/dev/null)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null
    ok "Port $port freed"
  else
    ok "Port $port is free"
  fi
done

step "3. Checking configuration"
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -i '' "s#change_me_to_a_long_random_string#$SECRET#" server/.env
  warn "Created server/.env from the example. Set MONGO_URI in it if your database needs a password."
fi
MONGO_URI=$(grep -E '^MONGO_URI=' server/.env | cut -d= -f2-)
[ -z "$MONGO_URI" ] && fail "MONGO_URI is missing in server/.env"
ok "server/.env found"

step "4. Checking MongoDB"
mongo_ping() {
  if command -v mongosh >/dev/null; then
    mongosh --quiet "$MONGO_URI" --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q 1
  else
    nc -z localhost 27017 >/dev/null 2>&1
  fi
}
if mongo_ping; then
  ok "MongoDB is running and accepts the app login"
else
  warn "MongoDB is not responding, starting it..."
  if [ -f "$MONGO_PLIST" ]; then
    launchctl bootstrap gui/$(id -u) "$MONGO_PLIST" 2>/dev/null || launchctl kickstart -k gui/$(id -u)/org.mongodb.mongod 2>/dev/null
  elif command -v brew >/dev/null; then
    brew services start mongodb-community >/dev/null
  elif [ -x "$MONGO_BIN/mongod" ]; then
    mkdir -p "$HOME/mongodb/data" "$HOME/mongodb/log"
    "$MONGO_BIN/mongod" --dbpath "$HOME/mongodb/data" --logpath "$HOME/mongodb/log/mongod.log" --bind_ip 127.0.0.1 --auth --fork >/dev/null
  else
    fail "MongoDB is not installed" "See README.md → Setup"
  fi
  for i in $(seq 1 20); do mongo_ping && break; sleep 1; done
  mongo_ping || fail "MongoDB did not start" "Check ~/mongodb/log/mongod.log"
  ok "MongoDB started"
fi

step "5. Checking dependencies"
for dir in . server client; do
  if [ ! -d "$dir/node_modules" ]; then
    warn "Installing packages in $dir (first run only)..."
    (cd "$dir" && npm install --silent) || fail "npm install failed in $dir"
  fi
done
ok "All packages installed"

step "6. Checking demo data"
if $SEED; then
  (cd server && npm run seed --silent >/dev/null 2>&1) || fail "Seeding failed" "Run: cd server && npm run seed"
  ok "Database reset with demo accounts (password Test@12345)"
else
  COUNT=$(mongosh --quiet "$MONGO_URI" --eval "db.users.countDocuments()" 2>/dev/null | tail -1)
  if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
    warn "Database is empty, seeding demo data..."
    (cd server && npm run seed --silent >/dev/null 2>&1) || fail "Seeding failed"
    ok "Demo data created"
  else
    ok "Database has $COUNT users (use ./start.sh --seed to reset demo data)"
  fi
fi

step "7. Starting PawShare"
mkdir -p "$LOG_DIR"
(cd server && node server.js >"$LOG_DIR/server.log" 2>&1) &
SERVER_PID=$!
(cd client && npx vite --port $WEB_PORT --strictPort >"$LOG_DIR/client.log" 2>&1) &
CLIENT_PID=$!
echo "$SERVER_PID $CLIENT_PID" >"$LOG_DIR/pids"

cleanup() {
  echo -e "\n${BOLD}Stopping PawShare...${RESET}"
  kill $SERVER_PID $CLIENT_PID 2>/dev/null
  pkill -P $SERVER_PID 2>/dev/null; pkill -P $CLIENT_PID 2>/dev/null
  for port in $API_PORT $WEB_PORT; do lsof -ti tcp:$port 2>/dev/null | xargs kill 2>/dev/null; done
  rm -f "$LOG_DIR/pids"
  ok "Stopped. Bye! 🐾"
  exit 0
}
trap cleanup INT TERM

wait_for() {
  for i in $(seq 1 30); do
    curl -sf "$1" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

step "8. Health checks"
if wait_for "$API_URL"; then ok "Backend API     http://localhost:$API_PORT/api"; else tail -15 "$LOG_DIR/server.log"; cleanup; fi
if curl -s "http://localhost:$API_PORT/socket.io/?EIO=4&transport=polling" | grep -q '"sid"'; then ok "Real-time chat  socket.io is accepting connections"; else warn "socket.io did not answer"; fi
grep -q "\[cron\]" "$LOG_DIR/server.log" && ok "Scheduler       check-in reminder job is active"
ANIMALS=$(curl -s "http://localhost:$API_PORT/api/animals?limit=1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).total' 2>/dev/null)
ok "Database        $ANIMALS animals available"
if wait_for "$WEB_URL"; then ok "Website         $WEB_URL"; else tail -15 "$LOG_DIR/client.log"; cleanup; fi
curl -sf "$WEB_URL/api/health" >/dev/null && ok "Website → API proxy is working"

echo -e "\n${GREEN}${BOLD}✔ PawShare is live at $WEB_URL${RESET}"
echo -e "  Demo logins (password ${BOLD}Test@12345${RESET}): admin@gmail.com · user@gmail.com · care@gmail.com"
echo -e "  Logs: .logs/server.log and .logs/client.log"
echo -e "  Press ${BOLD}Ctrl + C${RESET} to stop.\n"

$OPEN && open "$WEB_URL"

while true; do
  sleep 15
  if ! kill -0 $SERVER_PID 2>/dev/null || ! curl -sf "$API_URL" >/dev/null 2>&1; then
    warn "Backend stopped responding, restarting it..."
    lsof -ti tcp:$API_PORT 2>/dev/null | xargs kill 2>/dev/null
    (cd server && node server.js >>"$LOG_DIR/server.log" 2>&1) &
    SERVER_PID=$!
    wait_for "$API_URL" && ok "Backend is back up" || warn "Backend failed to restart, see .logs/server.log"
  fi
  if ! kill -0 $CLIENT_PID 2>/dev/null || ! curl -sf "$WEB_URL" >/dev/null 2>&1; then
    warn "Website stopped responding, restarting it..."
    lsof -ti tcp:$WEB_PORT 2>/dev/null | xargs kill 2>/dev/null
    (cd client && npx vite --port $WEB_PORT --strictPort >>"$LOG_DIR/client.log" 2>&1) &
    CLIENT_PID=$!
    wait_for "$WEB_URL" && ok "Website is back up" || warn "Website failed to restart, see .logs/client.log"
  fi
  echo "$SERVER_PID $CLIENT_PID" >"$LOG_DIR/pids"
done
