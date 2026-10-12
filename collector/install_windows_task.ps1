$ErrorActionPreference = 'Stop'
$Project = Split-Path $PSScriptRoot -Parent
$PythonExe = (& py -3 -c "import sys; print(sys.executable)").Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $PythonExe)) { throw 'No se encontró Python 3.' }
& $PythonExe -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias.' }
if (-not (Test-Path (Join-Path $Project '.env.local'))) { throw 'Falta .env.local con COLLECTOR_SECRET vigente de Vercel.' }
$Runner = Join-Path $PSScriptRoot 'run_windows.py'
$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument ('"' + $Runner + '"') -WorkingDirectory $Project
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
$Principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 13) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Play Metric NBA' -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description 'Actualiza NBA cada 15 minutos mientras el usuario tiene sesión abierta.' -Force | Out-Null
Start-ScheduledTask -TaskName 'Play Metric NBA'
Write-Host 'Tarea creada e iniciada: Play Metric NBA'
Write-Host 'Logs: %LOCALAPPDATA%\PlayMetric\collector'
Write-Host 'Requiere PC encendida, conexión y sesión de Windows abierta (puede estar bloqueada).'
