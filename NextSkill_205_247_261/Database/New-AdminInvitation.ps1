param([string]$Server = '(localdb)\MSSQLLocalDB', [string]$Database = 'NextSkillAuth')
$ErrorActionPreference = 'Stop'
$bytes = New-Object byte[] 24
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$code = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($code)))).Replace('-','')
$sha.Dispose()
$query = "INSERT INTO dbo.AdminInvitations(CodeHash,ExpiresAt) VALUES ('$hash',DATEADD(day,1,SYSUTCDATETIME()));"
& sqlcmd -S $Server -d $Database -E -b -Q $query | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not create the invitation.' }
Write-Output "Admin invitation (one use; expires in 24 hours): $code"
