# ejecutar_prod.ps1 — Fase II · R1 · sincronización de RPC → PROD (thgrhueckkjdutjvcufp)
# NO EDITAR: manifiesto.json fija la huella de la migración; el dictamen debe decir «R1 FIRMADA» en su línea Estado.
# Paso 1: supabase/migrations/20261125000000_sincronizar_rpc_prod.sql (sha256 9632b97cc90f7cf7…)
# Uso (se sitúa solo en la raíz del repo):  pwsh -File <ruta>\ejecutar_prod.ps1
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$manifiesto = Join-Path $PSScriptRoot 'manifiesto.json'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raiz
$bstr = [IntPtr]::Zero
$secreto = $null
try {
  Write-Host '== Fase II · R1 · sincronización de RPC → PROD (thgrhueckkjdutjvcufp) ==' -ForegroundColor Cyan
  $refTecleado = Read-Host 'Teclee el project ref de destino para confirmar'
  if ($refTecleado -ne 'thgrhueckkjdutjvcufp') { throw 'Project ref no coincide. Abortado sin conectar.' }
  $confirmacion = Read-Host 'Escriba exactamente: SINCRONIZAR RPC EN PROD'
  if ($confirmacion -cne 'SINCRONIZAR RPC EN PROD') { throw 'Frase de confirmación incorrecta. Abortado sin conectar.' }
  $secreto = Read-Host 'DATABASE_URL (entrada oculta)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secreto)
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  npx --no-install tsx scripts/olas/ejecutar-sql.ts --manifiesto $manifiesto --destino prod --ref thgrhueckkjdutjvcufp --desde 1 --hasta 1
  if ($LASTEXITCODE -ne 0) { throw "El ejecutor terminó con código $LASTEXITCODE (la transacción fallida se revirtió)." }
  Write-Host 'OK: RPC sincronizadas en PROD.' -ForegroundColor Green
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
