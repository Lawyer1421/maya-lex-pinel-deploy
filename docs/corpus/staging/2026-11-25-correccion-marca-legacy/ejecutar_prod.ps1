# ejecutar_prod.ps1 — Corrección C1 · marca sustituido_por_lote en el legacy de OLA 3 (378) y OLA 9 (215)
# NO EDITAR: manifiesto.json fija la huella del SQL; el dictamen debe decir «C1 FIRMADA» en su línea Estado.
# Destino exclusivo: thgrhueckkjdutjvcufp
# Paso:
#   1. 01_marcar_legacy_ola3_ola9_prod.sql  (sha256 853a78b72959f90d…)  [requiere firma CLO]
#
# Uso (se sitúa solo en la raíz del repo):  pwsh -File <ruta>\ejecutar_prod.ps1
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$manifiesto = Join-Path $PSScriptRoot 'manifiesto.json'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raiz
$bstr = [IntPtr]::Zero
$secreto = $null
try {
  Write-Host '== Corrección C1 · marca legacy OLA 3 y OLA 9 → PROD (thgrhueckkjdutjvcufp) ==' -ForegroundColor Cyan
  $refTecleado = Read-Host 'Teclee el project ref de destino para confirmar'
  if ($refTecleado -ne 'thgrhueckkjdutjvcufp') { throw 'Project ref no coincide. Abortado sin conectar.' }
  $confirmacion = Read-Host 'Escriba exactamente: MARCAR LEGACY OLA3 OLA9 EN PROD'
  if ($confirmacion -cne 'MARCAR LEGACY OLA3 OLA9 EN PROD') { throw 'Frase de confirmación incorrecta. Abortado sin conectar.' }
  $secreto = Read-Host 'DATABASE_URL (entrada oculta)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secreto)
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  npx --no-install tsx scripts/olas/ejecutar-sql.ts --manifiesto $manifiesto --destino prod --ref thgrhueckkjdutjvcufp --desde 1 --hasta 1
  if ($LASTEXITCODE -ne 0) { throw "El ejecutor terminó con código $LASTEXITCODE (la transacción fallida se revirtió)." }
  Write-Host 'OK: corrección C1 aplicada.' -ForegroundColor Green
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
