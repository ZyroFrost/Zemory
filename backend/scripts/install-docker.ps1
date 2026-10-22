# zemory, the Docker install, for Windows (docs/plan/30). One line, in PowerShell:
#
#   irm https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install-docker.ps1 | iex
#
# The other way to install beside install.ps1 (native). A machine runs ONE of them: this one turns the native install off
# (its autostart, its global command, its hooks) and runs install.ps1's counterpart in reverse. Run install.ps1 to go back.
#
# Needs, and does NOT install by itself (each needs an administrator, a restart or a licence decision):
#   · WSL 2 with an Ubuntu distro          wsl --install Ubuntu-24.04
#   · Docker Desktop, with WSL integration for that distro turned on (Settings > Resources > WSL integration)
# Installs if missing: Git, Node.js LTS (the hooks and the `zemory` command on this machine are small Node scripts).
#
# Options (set before the line above):
#   $env:ZEMORY_DIR        the clone (default: the existing clone, else %LOCALAPPDATA%\Programs\Zemory)
#   $env:ZEMORY_WORKSPACE  the folder holding your repos (default: the clone's parent folder's parent, asked if unsure)
#   $env:ZEMORY_DISTRO     the Ubuntu distro (default: the first one whose name starts with Ubuntu)
#   $env:ZEMORY_MIGRATE    "0" = do not copy the native memory store into the Docker one (default: copy when found)
#   $env:ZEMORY_MIGRATE_KEY "0" = copy everything but share.key (you copy that file yourself)

function Install-ZemoryDocker {
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue"
  function Say($m) { Write-Host "zemory docker install: $m" }
  function Native($what) { if ($LASTEXITCODE) { throw "$what failed (exit $LASTEXITCODE)" } }
  function ReloadPath { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }

  # ── 1. What must already be there ─────────────────────────────────────────────────────────────────────────────────
  $distros = @(wsl.exe -l -q 2>$null | ForEach-Object { ($_ -replace "`0", "").Trim() } | Where-Object { $_ })
  $distro = if ($env:ZEMORY_DISTRO) { $env:ZEMORY_DISTRO } else { $distros | Where-Object { $_ -like "Ubuntu*" } | Select-Object -First 1 }
  if (-not $distro) { throw "no Ubuntu distro in WSL - run 'wsl --install Ubuntu-24.04' (administrator, then restart), then run this again" }
  Say "ok  WSL distro $distro"
  wsl.exe -d $distro -- docker version --format "{{.Server.Version}}" *> $null
  if ($LASTEXITCODE) { throw "docker does not answer inside $distro - start Docker Desktop and turn on Settings > Resources > WSL integration > $distro, then run this again" }
  Say "ok  Docker (inside $distro)"
  $winget = (Get-Command winget -ErrorAction SilentlyContinue).Source
  foreach ($need in @(@{ cmd = "git"; id = "Git.Git" }, @{ cmd = "node"; id = "OpenJS.NodeJS.LTS" })) {
    if (Get-Command $need.cmd -ErrorAction SilentlyContinue) { Say "ok  $($need.cmd)"; continue }
    if (-not $winget) { throw "$($need.cmd) is missing and this machine has no winget - install $($need.id) by hand, then run this again" }
    Say "installing $($need.id)"; & $winget install -e --id $need.id --accept-package-agreements --accept-source-agreements; ReloadPath
    if (-not (Get-Command $need.cmd -ErrorAction SilentlyContinue)) { throw "$($need.id) did not install" }
  }

  # ── 2. The clone (compose builds the image from it, and lends its .git for HS history) ─────────────────────────────
  $linked = $null
  try { $linked = @((Get-Item (Join-Path (npm root -g 2>$null) "zemory") -ErrorAction Stop).Target)[0] } catch { }
  $dir = if ($env:ZEMORY_DIR) { [IO.Path]::GetFullPath($env:ZEMORY_DIR) } elseif ($linked) { [IO.Path]::GetFullPath($linked) } else { Join-Path $env:LOCALAPPDATA "Programs\Zemory" }
  if (Test-Path (Join-Path $dir ".git")) { Say "updating $dir"; git -C $dir pull --ff-only; Native "git pull" }
  else { Say "cloning into $dir"; git clone https://github.com/ZyroFrost/Zemory.git $dir; Native "git clone" }

  # ── 3. Where things are, as Docker (inside Ubuntu) and as Windows name them ──────────────────────────────────────────
  function WslPath($p) { $f = [IO.Path]::GetFullPath($p); "/mnt/" + $f.Substring(0, 1).ToLower() + ($f.Substring(2) -replace '\\', '/') }
  $ws = if ($env:ZEMORY_WORKSPACE) { [IO.Path]::GetFullPath($env:ZEMORY_WORKSPACE) } else { Split-Path (Split-Path $dir -Parent) -Parent }
  if (-not $env:ZEMORY_WORKSPACE -and $ws -match '\\AppData(\\|$)') { throw "the clone is not inside your repos folder - set `$env:ZEMORY_WORKSPACE to the folder holding your repos, then run this again" }
  if (-not (Test-Path $ws)) { throw "workspace folder $ws not found - set `$env:ZEMORY_WORKSPACE to the folder holding your repos" }
  if (-not ([IO.Path]::GetFullPath($dir)).StartsWith($ws, [StringComparison]::OrdinalIgnoreCase)) { Say "note: the clone $dir is outside the workspace $ws" }
  $wslUser = (wsl.exe -d $distro -- sh -c 'id -un').Trim()
  $store = "/home/$wslUser/zemory"
  $envLines = @(
    "HOST_HOME=$(WslPath $env:USERPROFILE)", "HOST_HOME_NATIVE=$env:USERPROFILE",
    "HOST_WORKSPACE=$(WslPath $ws)", "HOST_WORKSPACE_NATIVE=$ws",
    "ZEMORY_HOSTNAME=$env:COMPUTERNAME", "ZEMORY_STORE=$store", "ZEMORY_SELF_NATIVE=$dir"
  )
  # the Drive sync folder of the native config, if any: Docker Desktop cannot see a Google Drive letter, so Ubuntu mounts
  # it (drvfs, /etc/fstab) and compose binds the Ubuntu path
  $nativeLoc = Join-Path $env:USERPROFILE ".zemory\location.json"
  $nativeData = $null; $nativeMem = $null
  if (Test-Path $nativeLoc) { $l = Get-Content $nativeLoc -Raw | ConvertFrom-Json; $nativeData = $l.dataDir; $nativeMem = $l.memoryRoot }
  if (-not $nativeData -and (Test-Path (Join-Path $env:USERPROFILE ".zemory\config.json"))) { $nativeData = Join-Path $env:USERPROFILE ".zemory" }
  $drive = $null
  if ($nativeData -and (Test-Path (Join-Path $nativeData "config.json"))) { $drive = (Get-Content (Join-Path $nativeData "config.json") -Raw | ConvertFrom-Json).drive }
  if ($drive) {
    $letter = $drive.Substring(0, 1).ToLower()
    wsl.exe -d $distro -u root -- sh -c "mkdir -p /mnt/$letter; grep -q '^$($letter.ToUpper()): /mnt/$letter ' /etc/fstab || echo '$($letter.ToUpper()): /mnt/$letter drvfs metadata,noatime 0 0' >> /etc/fstab; mountpoint -q /mnt/$letter || mount /mnt/$letter"
    $envLines += "HOST_DRIVE=$(WslPath $drive)", "HOST_DRIVE_NATIVE=$drive"
    Say "ok  Drive folder $drive (mounted in $distro at /mnt/$letter)"
  }
  Set-Content -Path (Join-Path $dir ".env") -Value $envLines -Encoding ascii
  Say "wrote $(Join-Path $dir '.env')"

  # ── 4. One install per machine: the native one goes quiet ───────────────────────────────────────────────────────────
  $ping = $null
  try { $ping = Invoke-RestMethod "http://127.0.0.1:4444/ping" -TimeoutSec 3 } catch { }
  if ($ping -and $ping.app -eq "zemory" -and $ping.runtime -ne "docker") {
    Say "stopping the native zemory (pid $($ping.pid))"; Stop-Process -Id $ping.pid -Force -ErrorAction SilentlyContinue; Start-Sleep 2
  }
  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  foreach ($f in @("zemory.vbs", "zemory.cmd")) { $p = Join-Path $startup $f; if (Test-Path $p) { Remove-Item $p -Force; Say "removed the native autostart $p" } }
  if ($linked) { Say "unlinking the native global command"; npm uninstall -g zemory *> $null }

  # ── 5. The memory store: the native one is copied in once, when the Docker one is still empty ───────────────────────
  wsl.exe -d $distro -- sh -c "mkdir -p '$store/global-memory' '$store/data' '$store/no-drive'"
  $empty = (wsl.exe -d $distro -- sh -c "[ -e '$store/global-memory/global_memory.db' ] && echo no || echo yes").Trim() -eq "yes"
  if ($empty -and $nativeMem -and (Test-Path (Join-Path $nativeMem "global_memory.db")) -and $env:ZEMORY_MIGRATE -ne "0") {
    Say "copying the native memory store into $store (one time; the native store is left as it is)"
    $skip = if ($env:ZEMORY_MIGRATE_KEY -eq "0") { "--exclude=share.key" } else { "" }
    wsl.exe -d $distro -- sh -c "cp -a '$(WslPath $nativeMem)/.' '$store/global-memory/' && tar -C '$(WslPath $nativeData)' --exclude=browser --exclude=backups --exclude=logs --exclude=cache --exclude='global_memory.*' $skip -cf - . | tar -C '$store/data' -xf -"
    Native "copying the store"
  }

  # ── 6. Start it, then the host half: hooks, the zemory command, the shortcut ────────────────────────────────────────
  Say "building and starting the container (the first build takes a while)"
  wsl.exe -d $distro -- sh -c "cd '$(WslPath $dir)' && docker compose up -d --build"
  Native "docker compose up"
  # every rebuild leaves a layer of build cache and an untagged old image in Docker's disk: 24.6 GB after a day of
  # rebuilds on one machine (measured 2026-10-22). Keep a day of cache, drop the rest.
  wsl.exe -d $distro -- sh -c "docker builder prune -f --filter until=24h >/dev/null; docker image prune -f >/dev/null"
  for ($i = 0; $i -lt 60; $i++) { try { $ping = Invoke-RestMethod "http://127.0.0.1:4444/ping" -TimeoutSec 3; if ($ping.runtime -eq "docker") { break } } catch { }; Start-Sleep 2 }
  if (-not $ping -or $ping.runtime -ne "docker") { throw "the container did not answer on http://127.0.0.1:4444 - see 'docker logs zemory'" }
  Say "ok  the cockpit answers on http://127.0.0.1:4444"
  node (Join-Path $dir "backend\scripts\host-hook.mjs") install; Native "hook install"
  $bin = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps"   # on every user's PATH
  Set-Content -Path (Join-Path $bin "zemory.cmd") -Value "@node `"$(Join-Path $dir 'backend\scripts\host-cli.mjs')`" %*" -Encoding ascii
  Say "ok  the zemory command ($bin\zemory.cmd) runs in the container"
  if ($env:ZEMORY_NO_SHORTCUT -ne "1") {
    $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
    $lnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Zemory.lnk"
    $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
    if ($edge) { $s.TargetPath = $edge; $s.Arguments = "--app=http://127.0.0.1:4444" } else { $s.TargetPath = "http://127.0.0.1:4444" }
    $ico = Join-Path $dir "backend\resources\packaging\zemory.ico"; if (Test-Path $ico) { $s.IconLocation = $ico }
    $s.Save(); Say "ok  Start Menu: Zemory (opens the cockpit)"
  }
  Say "done - Docker restarts the container with Docker Desktop. Back to native: run install.ps1."
}

Install-ZemoryDocker
