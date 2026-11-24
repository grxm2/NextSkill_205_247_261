$ErrorActionPreference = 'Stop'
$audit = $PSScriptRoot
$app = Join-Path $audit '.runtime\app'
$assembly = Join-Path $app 'bin\Debug\net10.0\NextSkill_205_247_261.dll'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:DOTNET_ENVIRONMENT = 'Development'
$env:Learning__GuestPreview = 'true'
$env:ConnectionStrings__NextSkill = 'Server=(localdb)\NextSkill_Audit_20261123;Database=NextSkill_Audit;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Connect Timeout=4'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$appProcess = Start-Process -FilePath (Get-Command dotnet).Source -ArgumentList @($assembly, '--urls', 'http://127.0.0.1:52791') -WorkingDirectory $app -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $audit 'ux-profile-app.log') -RedirectStandardError (Join-Path $audit 'ux-profile-app-error.log')
try {
    Start-Sleep -Seconds 3
    if ($appProcess.HasExited) { throw 'The localhost profiling app exited before Chromium could connect.' }
    node (Join-Path $audit 'ux-profile.cjs')
    if ($LASTEXITCODE -ne 0) { throw "Browser profiler exited $LASTEXITCODE." }
} finally {
    if (-not $appProcess.HasExited) { Stop-Process -Id $appProcess.Id }
}
