#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=4200

# Kill existing instance on port 4200 if any
PID=$(lsof -ti :"$PORT" 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Stopping previous TypeVitae instance (PID: $PID)..."
  kill -9 "$PID" 2>/dev/null
  sleep 0.5
fi

# Start server in background detached
nohup node server.mjs > server.log 2>&1 &
SERVER_PID=$!
sleep 0.8

echo "=========================================================="
echo "  TypeVitae - Monochrome CV Operating System (Port $PORT)"
echo "=========================================================="
echo "  ✓ Server live at: http://127.0.0.1:$PORT (PID: $SERVER_PID)"
echo "  ✓ Logs writing to: $DIR/server.log"
echo "=========================================================="

if [ -z "$SSH_CLIENT" ] && [ -z "$SSH_TTY" ]; then
  open "http://127.0.0.1:$PORT"
else
  echo "Remote session detected: Open http://<mac-ip>:$PORT in your iPad browser."
fi
