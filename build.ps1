# Voegt de bronbestanden in src/ samen tot één speelbaar index.html
$src = Join-Path $PSScriptRoot 'src'
# strikte (ordinale) sortering op naam: 04-1-net.js … 04-7-simloop.js komen vóór 04b-game.js
$parts = Get-ChildItem $src | Where-Object { $_.Extension -in '.html', '.js' }
$names = [string[]]$parts.Name; [Array]::Sort($names, [StringComparer]::Ordinal)
$parts = $names | ForEach-Object { Join-Path $src $_ } | Get-Item
# controle op verborgen fouten (tests/lint.mjs): syntax per bestand en samengevoegd, en commentaar dat code uitschakelt
node (Join-Path $PSScriptRoot 'tests/lint.mjs') --build
if ($LASTEXITCODE -ne 0) { Write-Host 'index.html niet gebouwd – los eerst de lintmeldingen op' -ForegroundColor Red; exit 1 }
$out = ($parts | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'index.html'), $out, (New-Object Text.UTF8Encoding $false))
Write-Host "index.html gebouwd uit $($parts.Count) delen"
