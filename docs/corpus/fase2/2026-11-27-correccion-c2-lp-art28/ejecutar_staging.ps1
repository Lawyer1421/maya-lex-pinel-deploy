# ejecutar_staging.ps1 — Corrección C2 · ensayo en STAGING (aicakncgtuiiuomflkqj)
# NO EDITAR: manifiesto.json fija la huella de 01_ensayo_staging.sql. El ensayo siembra la fila de producción, corre 01, 02 y 99
# (dos veces cada uno) y termina en ROLLBACK: no deja nada en staging.
# Uso (se sitúa solo en la raíz del repo):  pwsh -File <ruta>\ejecutar_staging.ps1
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$manifiesto = Join-Path $PSScriptRoot 'manifiesto.json'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raiz
$bstr = [IntPtr]::Zero
$secreto = $null
try {
  Write-Host '== Corrección C2 · ensayo en STAGING (aicakncgtuiiuomflkqj) · termina en ROLLBACK ==' -ForegroundColor Cyan
  $refTecleado = Read-Host 'Teclee el project ref de destino para confirmar'
  if ($refTecleado -ne 'aicakncgtuiiuomflkqj') { throw 'Project ref no coincide. Abortado sin conectar.' }
  $confirmacion = Read-Host 'Escriba exactamente: ENSAYAR C2 EN STAGING'
  if ($confirmacion -cne 'ENSAYAR C2 EN STAGING') { throw 'Frase de confirmación incorrecta. Abortado sin conectar.' }
  $secreto = Read-Host 'DATABASE_URL de STAGING (entrada oculta)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secreto)
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  npx --no-install tsx scripts/olas/ejecutar-sql.ts --manifiesto $manifiesto --destino staging --ref aicakncgtuiiuomflkqj --desde 1 --hasta 1
  if ($LASTEXITCODE -ne 0) { throw "El ejecutor terminó con código $LASTEXITCODE (la transacción fallida se revirtió)." }
  Write-Host 'OK: ensayo C2 completo en STAGING (revertido con ROLLBACK; staging queda igual).' -ForegroundColor Green
}
finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if ($secreto) { $secreto.Dispose() }
  Remove-Variable secreto, bstr, refTecleado, confirmacion -ErrorAction SilentlyContinue
  [GC]::Collect()
  Pop-Location
  Write-Host 'Variables de sesión borradas.' -ForegroundColor DarkGray
}
