# zemory installer for Windows — one line, in PowerShell:
#
#   irm https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install.ps1 | iex
#
# Options (set before the line above, in the same window):
#   $env:ZEMORY_DIR = "E:\Tools\Zemory"   # install folder (default: %LOCALAPPDATA%\Zemory, or the existing install)
#   $env:ZEMORY_NO_SHORTCUT = "1"         # do not create Start Menu / Desktop shortcuts
#   $env:ZEMORY_NO_EMBED = "1"            # skip building the vector index now (run `zemory memory embed --all` later)
#
# Safe to run again: what is installed is skipped, an existing install is updated in place, and it stops at the first
# step that fails. What it does:
#   1. installs Git, Node.js LTS (>= 20) and the Visual C++ 2015-2022 x64 runtime if missing — with winget when the
#      machine has it, otherwise with each vendor's official installer (silent);
#   2. clones zemory into the install folder (or `git pull`s an existing clone), fetches the prebuilt native binary,
#      builds, and links the global `zemory` command;
#   3. builds this machine's memory: shortcuts, scan of existing agent transcripts, capture hooks, vector index.

function Install-Zemory {
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue"   # Invoke-WebRequest is many times slower with the progress bar
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # this window only: lets npm.ps1 / zemory.ps1 run

  function Say($m) { Write-Host "zemory install: $m" }
  function ReloadPath { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
  function Native($what) { if ($LASTEXITCODE) { throw "$what failed (exit $LASTEXITCODE)" } }
  function Fetch($url, $name) { $f = Join-Path $env:TEMP $name; Invoke-WebRequest $url -OutFile $f -UseBasicParsing; $f }

  # ── 1. Prerequisites ─────────────────────────────────────────────────────────────────────────────────────────────
  # winget is a per-user app alias: an elevated window often does not have it on PATH.
  $winget = (Get-Command winget -ErrorAction SilentlyContinue).Source
  if (-not $winget -and (Test-Path "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe")) { $winget = "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe" }
  function Need([scriptblock]$has, $id, [scriptblock]$direct) {
    if (& $has) { Say "ok  $id"; return }
    if ($winget) { Say "installing $id (winget)"; & $winget install -e --id $id --accept-package-agreements --accept-source-agreements }
    else { Say "installing $id (official installer - no winget on this machine)"; & $direct }
    ReloadPath
    if (-not (& $has)) { throw "$id did not install - install it by hand, then run the installer again" }
    Say "ok  $id installed"
  }
  Need { [bool](Get-Command git -ErrorAction SilentlyContinue) } "Git.Git" {
    $a = (Invoke-RestMethod "https://api.github.com/repos/git-for-windows/git/releases/latest").assets | Where-Object name -match '^Git-[\d.]+-64-bit\.exe$' | Select-Object -First 1
    Start-Process (Fetch $a.browser_download_url $a.name) -ArgumentList "/VERYSILENT", "/NORESTART" -Verb RunAs -Wait
  }
  Need { (Get-Command node -ErrorAction SilentlyContinue) -and [int]((node --version) -replace '^v(\d+).*', '$1') -ge 20 } "OpenJS.NodeJS.LTS" {
    # Assign first: in Windows PowerShell 5.1 a JSON array from Invoke-RestMethod reaches the pipeline as ONE object.
    $idx = Invoke-RestMethod "https://nodejs.org/dist/index.json"
    $v = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version
    $msi = Fetch "https://nodejs.org/dist/$v/node-$v-x64.msi" "node-$v-x64.msi"
    Start-Process msiexec -ArgumentList "/i `"$msi`" /qn /norestart" -Verb RunAs -Wait
  }
  Need { $vc = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" -ErrorAction SilentlyContinue; [bool]($vc -and $vc.Installed -eq 1) } "Microsoft.VCRedist.2015+.x64" {
    # Without this runtime the ONNX embedder cannot load, and `memory embed` would silently embed nothing.
    Start-Process (Fetch "https://aka.ms/vs/17/release/vc_redist.x64.exe" "vc_redist.x64.exe") -ArgumentList "/install", "/quiet", "/norestart" -Verb RunAs -Wait
  }

  # ── 2. Get, build and link zemory ────────────────────────────────────────────────────────────────────────────────
  $dir = $env:ZEMORY_DIR
  if (-not $dir) {
    # Already installed? Update THAT install (the global command is a link to its clone) instead of making a second one.
    $linked = $null
    try { $linked = (Get-Item (Join-Path (npm root -g) "zemory") -ErrorAction Stop).Target } catch { }
    $dir = if ($linked) { @($linked)[0] } else { Join-Path $env:LOCALAPPDATA "Zemory" }
  }
  $dir = [IO.Path]::GetFullPath($dir)
  # The memory store lives inside the install folder: a live database in a synced folder gets corrupted.
  $cloud = @($env:OneDrive, $env:OneDriveCommercial, $env:OneDriveConsumer) | Where-Object { $_ -and $dir.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) }
  if ($cloud -or $dir -match "OneDrive|Google Drive|Dropbox|iCloud") { throw "$dir is in a cloud-synced folder - set `$env:ZEMORY_DIR to a plain local folder" }
  # ZEMORY_INSTALL_STOP = plan | build: stop points for testing the installer without touching this machine's install.
  if ($env:ZEMORY_INSTALL_STOP -eq "plan") { Say "plan: install folder = $dir (exists: $(Test-Path $dir), clone: $(Test-Path (Join-Path $dir '.git')))"; return }

  if (Test-Path (Join-Path $dir ".git")) {
    Say "updating $dir"; Set-Location $dir; git pull --ff-only; Native "git pull"
  } elseif ((Test-Path $dir) -and (Get-ChildItem -Force $dir | Select-Object -First 1)) {
    throw "$dir is not empty and is not a zemory clone - set `$env:ZEMORY_DIR to a new or empty folder"
  } else {
    Say "cloning into $dir"; git clone https://github.com/ZyroFrost/Zemory.git $dir; Native "git clone"; Set-Location $dir
  }
  node backend/scripts/fetch-prebuilds.mjs; Native "fetch-prebuilds"   # before npm ci: some networks block the binary host
  npm ci; Native "npm ci"
  npm run build; Native "build"
  if ($env:ZEMORY_INSTALL_STOP -eq "build") { Say "stopped after build (ZEMORY_INSTALL_STOP)"; return }
  npm install -g .; Native "linking the global zemory command"
  ReloadPath

  # ── 3. This machine's memory ─────────────────────────────────────────────────────────────────────────────────────
  # Flags only: a bare `zemory setup` asks [Y/n] and would wait for an answer.
  if ($env:ZEMORY_NO_SHORTCUT -eq "1") { zemory setup --no-shortcut } else { zemory setup --shortcut }
  zemory memory scan; Native "memory scan"
  zemory hook install; Native "hook install"
  if ($env:ZEMORY_NO_EMBED -ne "1") { zemory memory embed --all; Native "memory embed" }
  zemory memory stats
  Say "done - zemory is installed in $dir. In each project folder run: zemory init (or zemory init --non-app), then zemory doctor."
}

Install-Zemory
