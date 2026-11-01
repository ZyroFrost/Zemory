@echo off
rem _python.cmd -- sets PY / PYW to the Python this repo declares in config\runtime.json, under the data root (the drive that
rem holds _ConfigVault): <root>\Software\Dev\Python\<version>\App\python.exe (slot Software_149_Program -- never a bare python
rem from PATH, never the system drive). Every launcher in bin\ calls it: call "%~dp0_python.cmd" || exit /b 3
rem With arguments it also runs them: bin\_python.cmd scripts\x.py  (repo gates in docs\.harness.json use this form).
set "PY="
set "PYW="
set "_VER="
set "_ROOT="
set "_RT=%~dp0..\config\runtime.json"
if not exist "%_RT%" (echo !! MISSING config\runtime.json & exit /b 3)
for /f "usebackq tokens=2 delims=: " %%v in (`findstr /c:"python" "%_RT%"`) do set "_VER=%%~v"
for %%d in (E D C) do if not defined _ROOT if exist "%%d:\_ConfigVault" set "_ROOT=%%d:"
if not defined _ROOT (echo !! no _ConfigVault on drive E, D or C & exit /b 3)
set "PY=%_ROOT%\Software\Dev\Python\%_VER%\App\python.exe"
set "PYW=%_ROOT%\Software\Dev\Python\%_VER%\App\pythonw.exe"
if not exist "%PY%" (echo !! MISSING %PY% -- install Python %_VER% there ^(skill task-vm-automation^) & exit /b 3)
if "%~1"=="" exit /b 0
"%PY%" %*
exit /b %errorlevel%
