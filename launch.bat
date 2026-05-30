@echo off
cd /d "%~dp0"
set PATH=%USERPROFILE%\scoop\apps\flutter\current\bin;%PATH%
flutter run -d windows
