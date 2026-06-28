# Run in PowerShell AS ADMINISTRATOR (required to edit hosts file)
# Fixes: UnknownHostException for *.mongodb.net when router DNS fails

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$marker = "# healthqor HealthID MongoDB Atlas"
$entries = @(
    "159.41.160.110 ac-knrtmfj-shard-00-00.eoqxsyl.mongodb.net",
    "159.41.178.15 ac-knrtmfj-shard-00-01.eoqxsyl.mongodb.net",
    "159.41.177.229 ac-knrtmfj-shard-00-02.eoqxsyl.mongodb.net"
)

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run this script as Administrator: Right-click PowerShell -> Run as administrator"
    exit 1
}

$content = Get-Content $hostsPath -Raw
if ($content -match [regex]::Escape($marker)) {
    Write-Host "MongoDB hosts entries already present."
    exit 0
}

$block = "`r`n$marker`r`n" + ($entries -join "`r`n") + "`r`n"
Add-Content -Path $hostsPath -Value $block -Encoding ascii
ipconfig /flushdns | Out-Null
Write-Host "Added Atlas shard hostnames to hosts file. Retry: cd backend; .\run.ps1"
