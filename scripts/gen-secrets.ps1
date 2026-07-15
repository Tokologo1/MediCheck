$jwtAccess = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$jwtRefresh = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "JWT_ACCESS=$jwtAccess"
Write-Host "JWT_REFRESH=$jwtRefresh"
