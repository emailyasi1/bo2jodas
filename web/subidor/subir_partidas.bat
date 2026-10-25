@echo off
title bo2jodas - subir partidas
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0subir_partidas.ps1"
pause
