# zemory, the Docker install, for Windows (docs/plan/30). One line, in PowerShell:
#
#   irm https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install-docker.ps1 | iex
#
# The other way to install beside install.ps1 (native). A machine runs ONE of them: this one turns the native install off
# (its autostart, its global command, its hooks) and moves its memory store in. Run install.ps1 to go back.
#
# One place (plan/30 §3k): on Windows the WSL Ubuntu distro is the Linux machine. The Docker engine, the clone, the memory
# store and the model all live inside it, laid out as on a real Linux machine (install-docker.sh); Windows keeps only the
# thin host half - the hooks, the `zemory` command, the Start Menu shortcut and one hidden process that keeps the distro up.
#
# Needs, and does NOT install by itself (it needs an administrator and a restart):
#   · WSL 2 with an Ubuntu distro          wsl --install Ubuntu-24.04
# Installs if missing: Docker Engine + compose + buildx inside the distro (apt), Git and Node.js LTS on Windows (the hooks
# and the `zemory` command on this machine are small Node scripts).
#
# Options (set before the line above):
#   $env:ZEMORY_DIR        the clone (default: the existing clone, else ~/.local/share/zemory/app inside the distro)
#   $env:ZEMORY_WORKSPACE  the folder holding your repos (default: the clone's parent folder's parent, asked if unsure)
#   $env:ZEMORY_DISTRO     the Ubuntu distro (default: the first one whose name starts with Ubuntu)
#   $env:ZEMORY_MIGRATE    "0" = do not move the native memory store into the Docker one (default: move when found)
#   $env:ZEMORY_MIGRATE_KEY "0" = move everything but share.key (you bring that file yourself)

function Install-ZemoryDocker {
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue"
  function Say($m) { Write-Host "zemory docker install: $m" }
  function Native($what) { if ($LASTEXITCODE) { throw "$what failed (exit $LASTEXITCODE)" } }
  function ReloadPath { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }

  # ── 1. What must already be there, and the engine inside the distro ───────────────────────────────────────────────
  $distros = @(wsl.exe -l -q 2>$null | ForEach-Object { ($_ -replace "`0", "").Trim() } | Where-Object { $_ })
  $distro = if ($env:ZEMORY_DISTRO) { $env:ZEMORY_DISTRO } else { $distros | Where-Object { $_ -like "Ubuntu*" } | Select-Object -First 1 }
  if (-not $distro) { throw "no Ubuntu distro in WSL - run 'wsl --install Ubuntu-24.04' (administrator, then restart), then run this again" }
  Say "ok  WSL distro $distro"
  $wslUser = (wsl.exe -d $distro -- sh -c 'id -un').Trim()
  # the engine runs in the distro itself, as on a Linux machine: systemd starts it, the distro's apt keeps it current.
  # A Docker Desktop that integrates into the distro takes over its docker socket and CLI plugins - it must be off.
  wsl.exe -d $distro -u root -- sh -c "grep -qs '^systemd=true' /etc/wsl.conf || printf '[boot]\nsystemd=true\n' >> /etc/wsl.conf"
  wsl.exe -d $distro -u root -- sh -c "command -v dockerd >/dev/null && docker compose version >/dev/null 2>&1 && docker buildx version >/dev/null 2>&1"
  if ($LASTEXITCODE) {
    Say "installing Docker Engine, compose and buildx inside $distro (apt)"
    wsl.exe -d $distro -u root -- sh -c "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq docker.io docker-compose-v2 docker-buildx >/dev/null && apt-get clean"
    Native "apt-get install docker.io"
  }
  wsl.exe -d $distro -u root -- sh -c "usermod -aG docker $wslUser; systemctl enable --now docker >/dev/null 2>&1; docker version --format '{{.Server.Version}}' >/dev/null"
  Native "starting docker inside $distro"
  Say "ok  Docker Engine (inside $distro)"
  $winget = (Get-Command winget -ErrorAction SilentlyContinue).Source
  foreach ($need in @(@{ cmd = "git"; id = "Git.Git" }, @{ cmd = "node"; id = "OpenJS.NodeJS.LTS" })) {
    if (Get-Command $need.cmd -ErrorAction SilentlyContinue) { Say "ok  $($need.cmd)"; continue }
    if (-not $winget) { throw "$($need.cmd) is missing and this machine has no winget - install $($need.id) by hand, then run this again" }
    Say "installing $($need.id)"; & $winget install -e --id $need.id --accept-package-agreements --accept-source-agreements; ReloadPath
    if (-not (Get-Command $need.cmd -ErrorAction SilentlyContinue)) { throw "$($need.id) did not install" }
  }

  # ── 2. The clone (compose builds the image from it, and lends its .git for HS history) ─────────────────────────────
  # Windows names a folder inside the distro \\wsl.localhost\<distro>\...; Docker in the distro names it /...
  $unc = "\\wsl.localhost\$distro"
  function WslPath($p) {
    if ($p.StartsWith($unc, [StringComparison]::OrdinalIgnoreCase)) { return ($p.Substring($unc.Length) -replace '\\', '/') }
    $f = [IO.Path]::GetFullPath($p); "/mnt/" + $f.Substring(0, 1).ToLower() + ($f.Substring(2) -replace '\\', '/')
  }
  $linked = $null
  try { $linked = @((Get-Item (Join-Path (npm root -g 2>$null) "zemory") -ErrorAction Stop).Target)[0] } catch { }
  $dir = if ($env:ZEMORY_DIR) { $env:ZEMORY_DIR } elseif ($linked) { [IO.Path]::GetFullPath($linked) } else { "$unc\home\$wslUser\.local\share\zemory\app" }
  $wdir = WslPath $dir
  wsl.exe -d $distro -- sh -c "[ -d '$wdir/.git' ]"
  if (-not $LASTEXITCODE) { Say "updating $dir"; wsl.exe -d $distro -- git -C $wdir pull --ff-only; Native "git pull" }
  else { Say "cloning into $dir"; wsl.exe -d $distro -- sh -c "mkdir -p '$(Split-Path $wdir -Parent)' && git clone https://github.com/ZyroFrost/Zemory.git '$wdir'"; Native "git clone" }

  # ── 3. Where things are, as Docker (inside Ubuntu) and as Windows name them ──────────────────────────────────────────
  $ws = if ($env:ZEMORY_WORKSPACE) { [IO.Path]::GetFullPath($env:ZEMORY_WORKSPACE) } elseif (-not $dir.StartsWith($unc)) { Split-Path (Split-Path $dir -Parent) -Parent } else { $null }
  if (-not $ws -or $ws -match '\\AppData(\\|$)') { throw "set `$env:ZEMORY_WORKSPACE to the folder holding your repos, then run this again" }
  if (-not (Test-Path $ws)) { throw "workspace folder $ws not found - set `$env:ZEMORY_WORKSPACE to the folder holding your repos" }
  $store = "/home/$wslUser/zemory"
  $envLines = @(
    "HOST_HOME=$(WslPath $env:USERPROFILE)", "HOST_HOME_NATIVE=$env:USERPROFILE",
    "HOST_WORKSPACE=$(WslPath $ws)", "HOST_WORKSPACE_NATIVE=$ws",
    "ZEMORY_HOSTNAME=$env:COMPUTERNAME", "ZEMORY_STORE=$store", "ZEMORY_SELF_NATIVE=$dir",
    # the `zemory` command on Windows reaches the engine through this distro (host-cli.mjs)
    "ZEMORY_WSL_DISTRO=$distro"
  )
  # the Drive sync folder of the native config, if any: a Google Drive letter is mounted in Ubuntu (drvfs, /etc/fstab)
  # and compose binds the Ubuntu path
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
  $envText = ($envLines -join "`n") + "`n"
  $envText | wsl.exe -d $distro -- sh -c "cat > '$wdir/.env'"
  Say "wrote $dir\.env"

  # ── 4. One install per machine: the native one goes quiet ───────────────────────────────────────────────────────────
  $ping = $null
  try { $ping = Invoke-RestMethod "http://127.0.0.1:4444/ping" -TimeoutSec 3 } catch { }
  if ($ping -and $ping.app -eq "zemory" -and $ping.runtime -ne "docker") {
    Say "stopping the native zemory (pid $($ping.pid))"; Stop-Process -Id $ping.pid -Force -ErrorAction SilentlyContinue; Start-Sleep 2
  }
  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  foreach ($f in @("zemory.vbs", "zemory.cmd")) { $p = Join-Path $startup $f; if (Test-Path $p) { Remove-Item $p -Force; Say "removed the native autostart $p" } }
  if ($linked) { Say "unlinking the native global command"; npm uninstall -g zemory *> $null }

  # ── 5. The memory store: the native one MOVES in once, when the Docker one is still empty (never two copies) ───────
  # What comes: the GM folder and the machine's settings and secrets. What does not: the model weights (the one the GM is
  # embedded with is fetched on first use), backups, the browser profiles, logs and caches.
  wsl.exe -d $distro -- sh -c "mkdir -p '$store/global-memory' '$store/data' '$store/no-drive'"
  $empty = (wsl.exe -d $distro -- sh -c "[ -e '$store/global-memory/global_memory.db' ] && echo no || echo yes").Trim() -eq "yes"
  if ($empty -and $nativeMem -and (Test-Path (Join-Path $nativeMem "global_memory.db")) -and $env:ZEMORY_MIGRATE -ne "0") {
    Say "moving the native memory store into $store (one time)"
    $skip = if ($env:ZEMORY_MIGRATE_KEY -eq "0") { "--exclude=share.key" } else { "" }
    wsl.exe -d $distro -- sh -c "mv '$(WslPath $nativeMem)/'* '$store/global-memory/' && tar -C '$(WslPath $nativeData)' --exclude=models --exclude=browser --exclude=backups --exclude=logs --exclude=cache --exclude='global_memory.*' $skip --remove-files -cf - . | tar -C '$store/data' -xf -"
    Native "moving the store"
  }

  # ── 6. Start it, then the host half: hooks, the zemory command, the shortcut, the distro kept up ────────────────────
  Say "building and starting the container (the first build takes a while)"
  # every rebuild leaves build cache and an untagged old image in Docker's disk (24.6 GB after a day of rebuilds,
  # measured 2026-10-22; a rebuild on a nearly full drive filled it to 0 bytes on 2026-10-23, and the prune that ran
  # after it could no longer run). The old cache goes BEFORE the build, so the peak is one build, and again after it.
  wsl.exe -d $distro -u root -- sh -c "docker builder prune -af >/dev/null; docker image prune -f >/dev/null"
  wsl.exe -d $distro -u root -- sh -c "cd '$wdir' && docker compose up -d --build"
  Native "docker compose up"
  wsl.exe -d $distro -u root -- sh -c "docker builder prune -af >/dev/null; docker image prune -f >/dev/null"
  # WSL stops an idle distro, and the engine and the container with it: one hidden process keeps it up, from every sign-in
  $keep = "`"$env:SystemRoot\system32\conhost.exe`" --headless wsl.exe -d $distro --exec sleep infinity"
  Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Zemory (WSL)" -Value $keep
  if (-not (Get-CimInstance Win32_Process -Filter "Name='wsl.exe'" | Where-Object { $_.CommandLine -match 'sleep infinity' })) {
    Start-Process "$env:SystemRoot\system32\conhost.exe" -ArgumentList "--headless", "wsl.exe", "-d", $distro, "--exec", "sleep", "infinity" -WindowStyle Hidden
  }
  Say "ok  $distro stays up from sign-in (Run: Zemory (WSL))"
  for ($i = 0; $i -lt 60; $i++) { try { $ping = Invoke-RestMethod "http://127.0.0.1:4444/ping" -TimeoutSec 3; if ($ping.runtime -eq "docker") { break } } catch { }; Start-Sleep 2 }
  if (-not $ping -or $ping.runtime -ne "docker") { throw "the container did not answer on http://127.0.0.1:4444 - see 'wsl -d $distro -- docker logs zemory'" }
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
  Say "done - the container restarts with the distro (restart: unless-stopped). Back to native: run install.ps1."
}

Install-ZemoryDocker
