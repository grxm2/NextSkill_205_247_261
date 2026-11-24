$ErrorActionPreference = 'Stop'
$audit = $PSScriptRoot
$app = Join-Path $audit '.runtime\app'
$published = Join-Path $audit '.runtime\published'
$server = '(localdb)\NextSkill_Audit_20261123'
$database = 'NextSkill_Audit'
$env:ConnectionStrings__NextSkill = "Server=$server;Database=$database;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Connect Timeout=4"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:Learning__GuestPreview = 'true'
$invitation = & (Join-Path $app 'Database\New-AdminInvitation.ps1') -Server $server -Database $database
$env:NEXTSKILL_AUDIT_INVITE = ($invitation -split ': ')[-1]
if (-not $env:NEXTSKILL_AUDIT_INVITE) { throw 'Audit invitation was not created.' }
$children = @()
try {
    foreach ($site in @(@{ Mode = 'Development'; Port = 52791 }, @{ Mode = 'Production'; Port = 52792 })) {
        $env:ASPNETCORE_ENVIRONMENT = $site.Mode
        $env:DOTNET_ENVIRONMENT = $site.Mode
        $port = $site.Port
        $startFolder = if ($site.Mode -eq 'Production') { $published } else { $app }
        $assembly = if ($site.Mode -eq 'Production') { Join-Path $published 'NextSkill_205_247_261.dll' } else { Join-Path $app 'bin\Debug\net10.0\NextSkill_205_247_261.dll' }
        $children += Start-Process -FilePath (Get-Command dotnet).Source -ArgumentList @($assembly, '--urls', "http://127.0.0.1:$port") -WorkingDirectory $startFolder -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $audit "app-$port.log") -RedirectStandardError (Join-Path $audit "app-$port-error.log")
    }
    node (Join-Path $audit 'runtime.cjs')
    if ($LASTEXITCODE -ne 0) { throw "Runtime audit runner exited $LASTEXITCODE." }
    sqlcmd -S $server -d $database -E -C -b -Q "SET NOCOUNT ON; SELECT DB_NAME() AS AuditDatabase; SELECT (SELECT COUNT(*) FROM dbo.Users) AS Learners, (SELECT COUNT(*) FROM dbo.Admins) AS Admins, (SELECT COUNT(*) FROM dbo.AdminInvitations WHERE RedeemedAt IS NOT NULL) AS UsedInvitations; IF OBJECT_ID(N'dbo.LearningProfiles') IS NOT NULL SELECT (SELECT COUNT(*) FROM dbo.LearningProfiles p WHERE NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Id=p.AccountId) AND NOT EXISTS (SELECT 1 FROM dbo.Admins a WHERE a.Id=p.AccountId)) AS PreviewProfiles, (SELECT COUNT(*) FROM dbo.LearningCourseProgress) AS CourseRows, (SELECT COUNT(*) FROM dbo.LearningLessonCompletions) AS PassedLessons, (SELECT ISNULL(SUM(Xp),0) FROM dbo.LearningProfiles) AS TotalXp;" | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $audit 'audit-db-totals.txt')
} finally {
    Remove-Item Env:NEXTSKILL_AUDIT_INVITE -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        if (-not $child.HasExited) { Stop-Process -Id $child.Id }
    }
}
