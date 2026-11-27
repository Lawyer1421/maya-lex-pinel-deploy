# ejecutar_prod.ps1 — Corrección C2 · Ley de Propiedad art. 28 → CONTEXT vigente · PROD (thgrhueckkjdutjvcufp)
# NO EDITAR: manifiesto.json fija las huellas; el dictamen debe decir «C2 FIRMADA» en su línea Estado y citar cada huella.
# Paso 1: 01_respaldo_prod.sql (respaldo con RLS) · Paso 2: 02_reclasificar_prod.sql. Ambos idempotentes; la reversión 99 no se corre aquí.
# Uso (se sitúa solo en la raíz del repo):  pwsh -File <ruta>\ejecutar_prod.ps1
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$manifiesto = Join-Path $PSScriptRoot 'manifiesto.json'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raiz
$bstr = [IntPtr]::Zero
$secreto = $null
try {
  Write-Host '== Corrección C2 · Ley de Propiedad art. 28 → CONTEXT vigente · PROD (thgrhueckkjdutjvcufp) ==' -ForegroundColor Cyan
  $refTecleado = Read-Host 'Teclee el project ref de destino para confirmar'
  if ($refTecleado -ne 'thgrhueckkjdutjvcufp') { throw 'Project ref no coincide. Abortado sin conectar.' }
  $confirmacion = Read-Host 'Escriba exactamente: RECLASIFICAR ART 28 LP EN PROD'
  if ($confirmacion -cne 'RECLASIFICAR ART 28 LP EN PROD') { throw 'Frase de confirmación incorrecta. Abortado sin conectar.' }
  $secreto = Read-Host 'DATABASE_URL de PRODUCCIÓN (entrada oculta)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secreto)
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  npx --no-install tsx scripts/olas/ejecutar-sql.ts --manifiesto $manifiesto --destino prod --ref thgrhueckkjdutjvcufp --desde 1 --hasta 2
  if ($LASTEXITCODE -ne 0) { throw "El ejecutor terminó con código $LASTEXITCODE (la transacción fallida se revirtió)." }
  Write-Host 'OK: C2 aplicada en PROD (respaldo protegido y art. 28 como CONTEXT vigente).' -ForegroundColor Green
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
