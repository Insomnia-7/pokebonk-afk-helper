param([string]$ClientVersion='1.2.0')
$ErrorActionPreference='Stop'
if([IO.Path]::GetPathRoot($PSScriptRoot)-ne 'D:\'){throw '客户端入口必须位于 D 盘。'}
if($ClientVersion-notmatch '^\d+\.\d+\.\d+$'){throw '客户端版本格式不正确。'}
$resources=Join-Path $PSScriptRoot 'client\resources'
$archive=Join-Path $resources 'app.asar'
$original=Join-Path $resources 'app.official.asar'
if(!(Test-Path -LiteralPath $original)){if(!(Test-Path -LiteralPath $archive)){throw '找不到已解压的官方客户端。'};Move-Item -LiteralPath $archive -Destination $original}
$utf8=[Text.UTF8Encoding]::new($false)
$manifest=@{name='pokebonk-afk-desktop-loader';productName='PokéBonk';version=$ClientVersion;main='entry.cjs';private=$true}|ConvertTo-Json -Compress
$entry="require(require('node:path').resolve(__dirname,'../../../main.cjs'));"
$packageBytes=$utf8.GetBytes($manifest);$entryBytes=$utf8.GetBytes($entry)
$header=@{files=@{'package.json'=@{size=$packageBytes.Length;offset='0'};'entry.cjs'=@{size=$entryBytes.Length;offset=[string]$packageBytes.Length}}}|ConvertTo-Json -Depth 6 -Compress
$headerBytes=$utf8.GetBytes($header);$padding=(4-($headerBytes.Length%4))%4
$stream=[IO.File]::Create($archive);$writer=[IO.BinaryWriter]::new($stream)
try{$writer.Write([uint32]4);$writer.Write([uint32](8+$headerBytes.Length+$padding));$writer.Write([uint32](4+$headerBytes.Length+$padding));$writer.Write([uint32]$headerBytes.Length);$writer.Write($headerBytes);if($padding){$writer.Write([byte[]]::new($padding))};$writer.Write($packageBytes);$writer.Write($entryBytes)}finally{$writer.Dispose();$stream.Dispose()}
Write-Output 'D 盘客户端助手入口已生成；原始客户端归档保留为 app.official.asar。'
