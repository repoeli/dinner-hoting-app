@echo off
echo Stopping existing servers...
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq json-server*" >nul 2>&1
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq http-server*" >nul 2>&1
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq proxy*" >nul 2>&1

timeout /t 2 /nobreak >nul

echo Starting JSON server...
cd /d "%~dp0"
start "json-server" cmd /c "npx json-server --watch api/db.json --port 3000"

timeout /t 3 /nobreak >nul

echo Starting proxy server...
start "proxy" cmd /c "node proxy.js"

timeout /t 2 /nobreak >nul

echo Starting HTTP server...
cd /d "%~dp0"
start "http-server" cmd /c "npx http-server . -p 8080 --cors -c-1 -o -d false > http-server.log 2>&1"

timeout /t 2 /nobreak >nul

echo All services started!
echo - JSON Server: http://localhost:3000
echo - Proxy Server: http://localhost:8090/api
echo - HTTP Server: http://localhost:8080
echo.
echo You can access the application at: http://localhost:8080
echo.
echo Press Ctrl+C in each terminal window to stop the services
