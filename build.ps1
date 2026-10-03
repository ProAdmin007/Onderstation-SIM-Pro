# Voegt de bronbestanden in src/ samen tot één speelbaar index.html
$src = Join-Path $PSScriptRoot 'src'
$parts = Get-ChildItem $src | Where-Object { $_.Extension -in '.html', '.js' } | Sort-Object Name
$out = ($parts | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'index.html'), $out, (New-Object Text.UTF8Encoding $false))
Write-Host "index.html gebouwd uit $($parts.Count) delen"
