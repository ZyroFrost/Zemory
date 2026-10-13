# zemory installer for Windows — one line, in PowerShell:
#
#   irm https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install.ps1 | iex
#
# Options (set before the line above, in the same window):
#   $env:ZEMORY_DIR = "E:\Tools\Zemory"   # install folder without asking (otherwise the installer ASKS, default
#                                         # %LOCALAPPDATA%\Programs\Zemory; an existing install is updated in place)
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
  # The folder the user picks is used - any folder (the memory store does NOT live in the install folder: a fresh machine
  # keeps it in %USERPROFILE%\.zemory, memory/db.ts). Two cases only need a step, never a refusal:
  #   · a folder that already holds other files (git cannot clone into it, and nothing there may be overwritten) ⇒ zemory
  #     goes into a `Zemory` subfolder of it — said out loud;
  #   · a drive that is not on this machine ⇒ nothing can be written there, so the user is asked again.
  function NoDrive($d) { $root = [IO.Path]::GetPathRoot($d); if (-not $root -or -not [IO.Directory]::Exists($root)) { "drive $root is not on this machine" } }
  function Target($d) {
    $isClone = { param($p) [IO.Directory]::Exists([IO.Path]::Combine($p, ".git")) }
    $hasFiles = { param($p) [IO.Directory]::Exists($p) -and [IO.Directory]::EnumerateFileSystemEntries($p).GetEnumerator().MoveNext() }
    if ((& $isClone $d) -or -not (& $hasFiles $d)) { return $d }
    $sub = [IO.Path]::Combine($d, "Zemory"); $n = 2
    while (-not (& $isClone $sub) -and (& $hasFiles $sub)) { $sub = [IO.Path]::Combine($d, "Zemory-$n"); $n++ }
    Say "$d already holds other files - installing into $sub (nothing of yours is touched)"
    return $sub
  }
  # Already installed? The global command is a link to its clone - that install is UPDATED, never a second one made.
  $linked = $null
  try { $linked = @((Get-Item (Join-Path (npm root -g) "zemory") -ErrorAction Stop).Target)[0] } catch { }
  # Test seams (the installer's own checks): ZEMORY_INSTALL_FRESH ignores an existing install, ZEMORY_INSTALL_TTY forces the prompt.
  if ($env:ZEMORY_INSTALL_FRESH -eq "1") { $linked = $null }
  $interactive = ($env:ZEMORY_INSTALL_TTY -eq "1") -or ([Environment]::UserInteractive -and -not [Console]::IsInputRedirected)
  if ($env:ZEMORY_DIR) {
    $dir = [IO.Path]::GetFullPath($env:ZEMORY_DIR)
    $why = NoDrive $dir; if ($why) { throw "$dir : $why" }
    $dir = Target $dir
  } elseif ($linked) {
    $dir = [IO.Path]::GetFullPath($linked)
    Say "zemory is already installed in $dir - updating it (set `$env:ZEMORY_DIR to install somewhere else)"
  } else {
    # %LOCALAPPDATA%\Programs is Windows' place for per-user apps. NOT %LOCALAPPDATA%\Zemory: the cockpit window keeps
    # its WebView2 profile there, so on any machine that ever opened zemory that folder is already in use.
    $default = [IO.Path]::Combine($env:LOCALAPPDATA, "Programs", "Zemory")
    for (;;) {
      $answer = if ($interactive) { Read-Host "zemory install: install folder [$default] (Enter = default)" } else { "" }
      $dir = [IO.Path]::GetFullPath($(if ($answer.Trim()) { $answer.Trim().Trim('"') } else { $default }))
      $why = NoDrive $dir
      if (-not $why) { break }
      if (-not $interactive) { throw "$dir : $why" }
      Say "$dir : $why - type another folder"
    }
    $dir = Target $dir
  }
  # ZEMORY_INSTALL_STOP = plan | build: stop points for testing the installer without touching this machine's install.
  if ($env:ZEMORY_INSTALL_STOP -eq "plan") { Say "plan: install folder = $dir (exists: $(Test-Path $dir), clone: $(Test-Path (Join-Path $dir '.git')))"; return }

  if (Test-Path (Join-Path $dir ".git")) {
    Say "updating $dir"; Set-Location $dir; git pull --ff-only; Native "git pull"
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
  Say "done - zemory is installed in $dir (memory store: see 'zemory memory info'). In each project folder run: zemory init (or zemory init --non-app), then zemory doctor."
}

Install-Zemory
