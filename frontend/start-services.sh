#!/bin/bash

# Stop any existing servers
echo "Stopping existing servers..."
pkill -f json-server || true
pkill -f http-server || true
pkill -f "node proxy.js" || true

# Wait a moment to ensure ports are freed
sleep 2

# Start JSON server
echo "Starting JSON server..."
cd /workspaces/dinner-hoting-app/frontend
npx json-server --watch api/db.json --port 3000 > json-server.log 2>&1 &
JSON_SERVER_PID=$!

# Give the JSON server a moment to start
sleep 3

# Test if it's working
if curl -s http://localhost:3000/dinners > /dev/null; then
  echo "✓ JSON server started successfully on port 3000"
else
  echo "✗ JSON server failed to start properly"
  echo "Check the log file at json-server.log"
  exit 1
fi

# Start proxy server
echo "Starting proxy server..."
cd /workspaces/dinner-hoting-app/frontend
node proxy.js > proxy.log 2>&1 &
PROXY_SERVER_PID=$!

# Wait for proxy to start
sleep 2

# Start HTTP server
echo "Starting HTTP server..."
cd /workspaces/dinner-hoting-app
npx http-server frontend -p 8080 --cors > http-server.log 2>&1 &
HTTP_SERVER_PID=$!

sleep 2

echo "All services started!"
echo "- JSON Server: http://localhost:3000"
echo "- Proxy Server: http://localhost:8090/api"
echo "- HTTP Server: http://localhost:8080"
echo ""
echo "You can use the API test page to verify connections:"
echo "http://localhost:8080/api-test.html"
echo ""
echo "To stop all services, run: pkill -f json-server; pkill -f http-server; pkill -f 'node proxy.js'"

# Save PIDs for future reference
echo "$JSON_SERVER_PID $PROXY_SERVER_PID $HTTP_SERVER_PID" > services.pid

echo "Press Ctrl+C to stop all services at once"
# Wait for user interrupt
wait
