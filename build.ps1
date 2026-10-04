# Voegt de bronbestanden in src/ samen tot één speelbaar index.html
$src = Join-Path $PSScriptRoot 'src'
# strikte (ordinale) sortering op naam: 04-1-net.js … 04-7-simloop.js komen vóór 04b-game.js
$parts = Get-ChildItem $src | Where-Object { $_.Extension -in '.html', '.js' }
$names = [string[]]$parts.Name; [Array]::Sort($names, [StringComparer]::Ordinal)
$parts = $names | ForEach-Object { Join-Path $src $_ } | Get-Item
# syntaxcontrole per bronbestand (vangt o.a. een commentaar dat per ongeluk de rest van een regel uitschakelt)
$bad = $parts | Where-Object { $_.Extension -eq '.js' } | ForEach-Object { $m = node --check $_.FullName 2>&1 | Select-String 'SyntaxError'; if ($m) { "$($_.Name): $m" } }
if ($bad) { Write-Host "SYNTAXFOUT – index.html niet gebouwd:
$($bad -join "
")" -ForegroundColor Red; exit 1 }
$out = ($parts | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'index.html'), $out, (New-Object Text.UTF8Encoding $false))
Write-Host "index.html gebouwd uit $($parts.Count) delen"
