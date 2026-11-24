$ErrorActionPreference = 'Stop'
$database = 'NextSkill_Audit_Certificates'
$server = '(localdb)\NextSkill_Audit_20261123'
$sourceSetup = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'app\Database\Setup.sql') -Raw
$setup = Join-Path $PSScriptRoot 'setup-certificate-test.sql'
$sourceSetup.Replace('NextSkillAuth', $database) | Set-Content -LiteralPath $setup -Encoding UTF8
& SqlLocalDB start NextSkill_Audit_20261123
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& sqlcmd -S $server -d master -E -C -b -i $setup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$env:ConnectionStrings__NextSkill = "Server=$server;Database=$database;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Connect Timeout=4"
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:DOTNET_ENVIRONMENT = 'Development'
$app = Join-Path $PSScriptRoot 'app'
$assembly = Join-Path $app 'bin\Debug\net10.0\NextSkill_205_247_261.dll'
$process = Start-Process -FilePath (Get-Command dotnet).Source -ArgumentList @($assembly, '--urls', 'http://127.0.0.1:52844') -WorkingDirectory $app -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'app.log') -RedirectStandardError (Join-Path $PSScriptRoot 'app-error.log')
try {
    & node (Join-Path $PSScriptRoot 'certificate.cjs')
    exit $LASTEXITCODE
} finally {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id }
}
