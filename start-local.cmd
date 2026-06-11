@echo off
cd /d "%~dp0"
set "NODE_EXE=C:\Users\defip\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if exist "%NODE_EXE%" goto start
where node.exe >nul 2>nul
if errorlevel 1 goto missing
set "NODE_EXE=node.exe"

:start
echo MAMAFI demarre sur http://localhost:3000
echo Administration : http://localhost:3000/admin.html
echo Appuyez sur Ctrl+C pour arreter le serveur.
"%NODE_EXE%" server.js
goto end

:missing
echo Node.js est introuvable.
echo Installez la version LTS depuis https://nodejs.org
pause

:end
