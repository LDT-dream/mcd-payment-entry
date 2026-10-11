param(
    [string]$OrderId,
    [ValidateRange(1,60)][int]$Minutes = 10,
    [switch]$Clear
)
$ErrorActionPreference = 'Stop'
if ($Clear -and $OrderId) { throw 'Use either -OrderId or -Clear.' }
if (-not $Clear -and $OrderId -notmatch '^\d{1,64}$') { throw 'OrderId must contain 1–64 digits.' }
Push-Location $PSScriptRoot
try {
    $branch = git branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Run from main in the dedicated payment repository.' }
    $staged = git diff --cached --name-only
    if ($LASTEXITCODE -ne 0 -or $staged) { throw 'Commit or unstage existing changes first.' }
    if ($Clear) { node ./update-order.mjs --clear }
    else { node ./update-order.mjs $OrderId $Minutes }
    if ($LASTEXITCODE -ne 0) { throw 'Updating latest.json failed.' }
    git add -- latest.json
    if ($LASTEXITCODE -ne 0) { throw 'Staging latest.json failed.' }
    git diff --cached --quiet -- latest.json
    if ($LASTEXITCODE -eq 1) {
        git commit -m 'Update latest payment entry' -- latest.json
        if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
    } elseif ($LASTEXITCODE -ne 0) { throw 'Checking changes failed.' }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push failed; phone entry has not been updated.' }
    Write-Output 'Latest entry pushed. Phone access and payment status require separate verification.'
} finally { Pop-Location }
