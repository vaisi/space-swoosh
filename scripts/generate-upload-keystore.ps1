# generate-upload-keystore.ps1
# Changes:
# - Created: one-shot helper to create the Android upload keystore and print the
#   Codemagic env values. Back up the .jks — losing it means you cannot update
#   the Play app.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/generate-upload-keystore.ps1

$ErrorActionPreference = "Stop"
$outDir = Join-Path $PSScriptRoot "..\signing"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$keystore = Join-Path $outDir "space-swoosh-upload.jks"
$alias = "spaceswoosh"

if (Test-Path $keystore) {
    Write-Host "Keystore already exists: $keystore"
    Write-Host "Refusing to overwrite. Move it aside if you really want a new one."
    exit 1
}

Write-Host "You will be prompted for name/org and a keystore password."
Write-Host "Remember the password — it becomes CM_KEYSTORE_PASSWORD / CM_KEY_PASSWORD."
keytool -genkeypair -v `
    -keystore $keystore `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -alias $alias

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore))
$b64Path = Join-Path $outDir "space-swoosh-upload.jks.base64.txt"
Set-Content -Path $b64Path -Value $b64 -NoNewline

Write-Host ""
Write-Host "Created: $keystore"
Write-Host "Base64:  $b64Path  (paste into Codemagic CM_KEYSTORE)"
Write-Host "Alias:   $alias    (CM_KEY_ALIAS)"
Write-Host ""
Write-Host "Add signing/ to your password manager backup. It is gitignored."
