# Load environment variables from ../.env then start Spring Boot
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        if ($_ -match '^\s*VITE_') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
    Write-Host "Loaded environment from $envFile"
} else {
    Write-Warning ".env not found at $envFile - set MONGODB_URI, etc. manually"
}

$required = @('MONGODB_URI', 'HEALTHID_ENCRYPTION_KEY', 'JWT_SECRET')
foreach ($var in $required) {
    if (-not [Environment]::GetEnvironmentVariable($var, 'Process')) {
        Write-Error "Missing required env var: $var"
        exit 1
    }
}

if (-not [Environment]::GetEnvironmentVariable('SPRING_PROFILES_ACTIVE', 'Process')) {
    [Environment]::SetEnvironmentVariable('SPRING_PROFILES_ACTIVE', 'dev', 'Process')
}
if (-not [Environment]::GetEnvironmentVariable('CACHE_TYPE', 'Process')) {
    [Environment]::SetEnvironmentVariable('CACHE_TYPE', 'simple', 'Process')
}

# Windows router DNS often fails to resolve *.mongodb.net; force JVM to use public DNS
$jvmDns = '-Dsun.net.spi.nameservice.provider.1=dns,sun -Dsun.net.spi.nameservice.nameservers=8.8.8.8,1.1.1.1'
$mavenOpts = [Environment]::GetEnvironmentVariable('MAVEN_OPTS', 'Process')
if ($mavenOpts) {
    if ($mavenOpts -notmatch 'sun\.net\.spi\.nameservice\.nameservers') {
        [Environment]::SetEnvironmentVariable('MAVEN_OPTS', "$mavenOpts $jvmDns", 'Process')
    }
} else {
    [Environment]::SetEnvironmentVariable('MAVEN_OPTS', $jvmDns, 'Process')
}

$mvn = Join-Path $PSScriptRoot "mvn.cmd"
& $mvn spring-boot:run "-Dspring-boot.run.jvmArguments=$jvmDns" @args
