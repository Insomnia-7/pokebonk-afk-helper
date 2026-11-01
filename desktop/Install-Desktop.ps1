param([Parameter(Mandatory=$true)][string]$ClientExe,[string]$ArchiveTool)
$ErrorActionPreference='Stop'
if([IO.Path]::GetPathRoot($PSScriptRoot)-ne 'D:\'){throw '请把助手放到 D 盘后再安装客户端。'}
$ClientExe=(Resolve-Path -LiteralPath $ClientExe).Path
if(!(Test-Path -LiteralPath $ClientExe -PathType Leaf)){throw '找不到官方便携客户端 EXE。'}
if(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'client')){throw '客户端目录已存在。保留 profile 数据目录，将旧 client 目录移走后再安装。'}
if(!$ArchiveTool){$ArchiveTool=@('D:\bandzip\Bandizip\bz.exe','C:\Program Files\7-Zip\7z.exe')|Where-Object {Test-Path -LiteralPath $_}|Select-Object -First 1}
if(!$ArchiveTool){throw '需要 Bandizip 的 bz.exe 或 7-Zip 的 7z.exe；请用 -ArchiveTool 指定现有解压工具。'}
$taskTemp=Join-Path $PSScriptRoot 'temp';$importRoot=Join-Path $PSScriptRoot 'import-temp'
New-Item -ItemType Directory -Force -Path $taskTemp,$importRoot|Out-Null
$env:TEMP=$taskTemp;$env:TMP=$taskTemp
$outPrefix=if([IO.Path]::GetFileName($ArchiveTool)-ieq 'bz.exe'){'-o:'}else{'-o'}
& $ArchiveTool x -y ($outPrefix+$importRoot) $ClientExe
if($LASTEXITCODE-ne 0){throw '便携包解压失败。'}
$inner=Get-ChildItem -Recurse -LiteralPath $importRoot -Filter app-64.7z|Select-Object -First 1
if(!$inner){throw '未识别该便携客户端的 app-64.7z。原始 EXE 未被修改。'}
$clientRoot=Join-Path $PSScriptRoot 'client'
& $ArchiveTool x -y ($outPrefix+$clientRoot) $inner.FullName
if($LASTEXITCODE-ne 0-or !(Test-Path -LiteralPath (Join-Path $clientRoot 'resources\app.asar'))){throw '客户端主体解压失败。'}
$version=(Get-Item -LiteralPath $ClientExe).VersionInfo.FileVersion
if($version -match '^\d+\.\d+\.\d+$'){$file=Join-Path $PSScriptRoot 'package.json';$package=Get-Content -Raw -LiteralPath $file|ConvertFrom-Json;$package.version=$version;[IO.File]::WriteAllText($file,($package|ConvertTo-Json),[Text.UTF8Encoding]::new($false))}
& (Join-Path $PSScriptRoot 'Write-Loader.ps1') -ClientVersion $version
Write-Output ('安装完成：'+$clientRoot+'。请运行“启动客户端助手.cmd”。客户端数据和缓存保存在 D 盘。')
