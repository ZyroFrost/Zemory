<#
  vault.ps1 - the repo's credential vault. A person types each secret into its own window; the agent never sees plaintext.

  Invariants:
    - A value is entered in a SEPARATE window (Read-Host -AsSecureString): no echo, not in the command history, never on the
      agent's stdout.
    - Stored encrypted with DPAPI (CurrentUser scope) at <repo>\data\secrets\vault\<Name>.sec. The folder is gitignored, and
      a .sec file opens only for this Windows account on this machine.
    - `Get-VaultSecret` returns a SecureString and `Get-VaultCredential` a PSCredential - never a plain string.

  Usage
    # 1. Store a value (opens a window for the person to type or paste) - once, then reused
    powershell -File scripts\vault.ps1 -Action Set -Name DB_READONLY -UserName "svc_readonly"
    powershell -File scripts\vault.ps1 -Action Set -Name SMTP_PASSWORD

    # 2. List what is stored (names only, never values)
    powershell -File scripts\vault.ps1 -Action List

    # 3. Remove
    powershell -File scripts\vault.ps1 -Action Remove -Name DB_READONLY

    # 4. Use from another script
    . scripts\vault.ps1
    $cred = Get-VaultCredential -Name DB_READONLY

  Installed by the HS skill task-pull: edit it on HS, not in a repo copy (the next `zemory sync` puts the HS version back).
#>

[CmdletBinding()]
param(
    [ValidateSet('Set', 'Get', 'List', 'Remove')]
    [string]$Action,
    [string]$Name,
    [string]$UserName
)

# The vault lives inside the repo (data\secrets\vault\), so moving or backing up the repo carries it.
#   DPAPI is tied to the Windows ACCOUNT: on another profile, or a recreated one, the old .sec files cannot be decrypted -
#   the values must be entered again.
#   VAULT_DIR overrides the folder.
$script:VaultDir = if ($env:VAULT_DIR) { $env:VAULT_DIR }
                   else { Join-Path (Split-Path $PSScriptRoot -Parent) 'data\secrets\vault' }

function Initialize-VaultDir {
    if (-not (Test-Path $script:VaultDir)) {
        New-Item -ItemType Directory -Force -Path $script:VaultDir | Out-Null
    }
}

function Get-VaultPath {
    param([Parameter(Mandatory)][string]$Name)
    Join-Path $script:VaultDir "$Name.sec"
}

<#
  Opens a SEPARATE window for the person to type or paste the value. The agent reads nothing from it.
  The window closes by itself once the value is saved.
#>
function Set-VaultSecret {
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$UserName
    )
    Initialize-VaultDir
    $target = Get-VaultPath -Name $Name

    $inner = @"
`$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '  +--------------------------------------------------+' -ForegroundColor Cyan
Write-Host '  |   VAULT  -  enter a credential                   |' -ForegroundColor Cyan
Write-Host '  +--------------------------------------------------+' -ForegroundColor Cyan
Write-Host ''
Write-Host '   Key name : $Name'
Write-Host '   Saved to : $target'
Write-Host '   Encrypted: DPAPI (CurrentUser) - only this account can decrypt it'
Write-Host ''
Write-Host '   Type or paste the value, then Enter. Nothing is shown on screen.' -ForegroundColor Yellow
Write-Host ''
`$sec = Read-Host '   >' -AsSecureString
if (`$sec.Length -eq 0) {
    Write-Host ''
    Write-Host '   CANCELLED - nothing entered, nothing saved.' -ForegroundColor Red
    Start-Sleep -Seconds 3
    exit 1
}
ConvertFrom-SecureString `$sec | Set-Content -Path '$target' -Encoding ASCII
Write-Host ''
Write-Host '   SAVED.' -ForegroundColor Green
Start-Sleep -Seconds 2
"@

    $tmp = Join-Path $env:TEMP "vault_prompt_$([guid]::NewGuid().ToString('N')).ps1"
    Set-Content -Path $tmp -Value $inner -Encoding UTF8
    try {
        $p = Start-Process -FilePath 'powershell.exe' `
            -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp `
            -Wait -PassThru
        if ($p.ExitCode -ne 0) { Write-Host "vault: cancelled, '$Name' not saved."; return }
    }
    finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }

    if ($UserName) {
        Set-Content -Path "$target.user" -Value $UserName -Encoding UTF8
    }
    if (Test-Path $target) { Write-Host "vault: saved '$Name'." }
}

function Get-VaultSecret {
    param([Parameter(Mandatory)][string]$Name)
    $path = Get-VaultPath -Name $Name
    if (-not (Test-Path $path)) {
        throw "vault: no key '$Name'. Store it with: powershell -File scripts\vault.ps1 -Action Set -Name $Name"
    }
    Get-Content $path | ConvertTo-SecureString
}

function Get-VaultCredential {
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$UserName
    )
    $sec = Get-VaultSecret -Name $Name
    if (-not $UserName) {
        $userFile = (Get-VaultPath -Name $Name) + '.user'
        if (Test-Path $userFile) { $UserName = (Get-Content $userFile -Raw).Trim() }
    }
    if (-not $UserName) { throw "vault: no UserName stored for '$Name'." }
    New-Object System.Management.Automation.PSCredential($UserName, $sec)
}

function Get-VaultList {
    Initialize-VaultDir
    Get-ChildItem $script:VaultDir -Filter *.sec -ErrorAction SilentlyContinue | ForEach-Object {
        $userFile = "$($_.FullName).user"
        [pscustomobject]@{
            Name     = $_.BaseName
            UserName = if (Test-Path $userFile) { (Get-Content $userFile -Raw).Trim() } else { '' }
            Saved    = $_.LastWriteTime
        }
    }
}

function Remove-VaultSecret {
    param([Parameter(Mandatory)][string]$Name)
    $path = Get-VaultPath -Name $Name
    Remove-Item $path, "$path.user" -Force -ErrorAction SilentlyContinue
    Write-Host "vault: removed '$Name'."
}

switch ($Action) {
    'Set' {
        if (-not $Name) { throw 'vault: -Name is missing.' }
        Set-VaultSecret -Name $Name -UserName $UserName
    }
    'List' { Get-VaultList | Format-Table -AutoSize }
    'Remove' {
        if (-not $Name) { throw 'vault: -Name is missing.' }
        Remove-VaultSecret -Name $Name
    }
    'Get' { throw "vault: printing a value is not supported. Dot-source this file and use Get-VaultCredential / Get-VaultSecret." }
}
