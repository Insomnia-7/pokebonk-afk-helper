$ErrorActionPreference='Stop'
if([IO.Path]::GetPathRoot($PSScriptRoot)-ne 'D:\'){throw '请把助手安装到 D 盘后启动。'}
$clientExe=Join-Path $PSScriptRoot 'client\PokeBonk.exe'
if(!(Test-Path -LiteralPath $clientExe)){throw '未找到客户端，请先运行 Install-Desktop.ps1 并指定官方便携版 EXE。'}
$taskTemp=Join-Path $PSScriptRoot 'temp'
New-Item -ItemType Directory -Force -Path $taskTemp|Out-Null
$env:TEMP=$taskTemp
$env:TMP=$taskTemp
Start-Process -FilePath $clientExe -WorkingDirectory $PSScriptRoot -WindowStyle Normal
