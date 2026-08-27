# gate-cage.ps1 — chạy MỘT lệnh trong "lồng" Windows Job Object: trần RAM cho CẢ CÂY tiến trình + ưu tiên thấp.
#
# Vì sao (đo 2026-08-27): gate zemory từng chiếm 7–10 GB (ONNX arena của test nhúng tin dài nở tới
# 6,1 GB một file; daemon + con embed ~4 GB) ⇒ máy 16 GB tràn, phiên agent chết giữa gate HAI lần và
# kéo sập phiên ở repo khác trên cùng máy. User chốt: trần TOÀN CÂY 4 GB · ưu tiên thấp · chấp nhận chậm.
# `--max-old-space-size` của Node KHÔNG làm được việc này — nó chỉ chặn heap V8, phần ngốn là native.
#
# Job Object là cơ chế duy nhất của Windows ghim được tổng RAM của một cây tiến trình
# (JOB_OBJECT_LIMIT_JOB_MEMORY): vượt trần ⇒ cấp phát THẤT BẠI trong lồng (test đỏ, có lỗi rõ),
# KHÔNG đói RAM của người khác. KILL_ON_JOB_CLOSE ⇒ đóng lồng là mọi con chết theo, không để mồ côi.
#
# Dùng:  powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/gate-cage.ps1 -- node backend/scripts/run-tests.mjs
# Env:   ZEMORY_GATE_RAM_MB (mặc định 4096) · ZEMORY_GATE_PRIORITY (BelowNormal | Idle | Normal; mặc định BelowNormal)
# Không phải Windows ⇒ script này không áp; runner tự chạy thẳng (xem run-tests.mjs).
# KHÔNG dùng param(): PowerShell sẽ đem `-e`/`-p` của node đi khớp tham số script ("AmbiguousParameter").
# $args giữ mọi token nguyên văn.
$Cmd = @($args)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8 # chữ Việt trong log không thành mojibake
if ($Cmd.Count -gt 0 -and $Cmd[0] -eq "--") { $Cmd = $Cmd[1..($Cmd.Count - 1)] }
if (-not $Cmd -or $Cmd.Count -eq 0) { Write-Error "gate-cage: thiếu lệnh cần chạy"; exit 2 }

$limitMb = [int]([Environment]::GetEnvironmentVariable("ZEMORY_GATE_RAM_MB"))
if ($limitMb -le 0) { $limitMb = 4096 }
$prio = [Environment]::GetEnvironmentVariable("ZEMORY_GATE_PRIORITY")
if (-not $prio) { $prio = "BelowNormal" }

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class JobCage {
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount; }
  [StructLayout(LayoutKind.Sequential)] struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed; }
  const uint JOB_OBJECT_LIMIT_JOB_MEMORY = 0x200; const uint JOB_OBJECT_LIMIT_PRIORITY_CLASS = 0x20; const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
  const int JobObjectExtendedLimitInformation = 9;
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr a, string name);
  [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job, int cls, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint len);
  [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr proc);
  [DllImport("kernel32.dll")] static extern bool QueryInformationJobObject(IntPtr job, int cls, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint len, IntPtr ret);
  static IntPtr job;
  public static void Create(ulong limitBytes, uint priorityClass) {
    job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw new Exception("CreateJobObject failed");
    var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_JOB_MEMORY | JOB_OBJECT_LIMIT_PRIORITY_CLASS | JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    info.BasicLimitInformation.PriorityClass = priorityClass;
    info.JobMemoryLimit = (UIntPtr)limitBytes;
    if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, ref info, (uint)Marshal.SizeOf(info))) throw new Exception("SetInformationJobObject failed");
  }
  public static void Assign(IntPtr proc) { if (!AssignProcessToJobObject(job, proc)) throw new Exception("AssignProcessToJobObject failed (tiến trình đã nằm trong job khác?)"); }
  public static ulong Peak() { var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION(); QueryInformationJobObject(job, JobObjectExtendedLimitInformation, ref info, (uint)Marshal.SizeOf(info), IntPtr.Zero); return (ulong)info.PeakJobMemoryUsed; }
}
"@

# PriorityClass hằng số Win32: BelowNormal 0x4000 · Idle 0x40 · Normal 0x20
$prioCode = switch ($prio) { "Idle" { 0x40 } "Normal" { 0x20 } default { 0x4000 } }
[JobCage]::Create([uint64]$limitMb * 1MB, [uint32]$prioCode)

# Khởi động lệnh ở trạng thái TREO (CREATE_SUSPENDED không có trong .NET) — thay bằng: start, gán vào job
# NGAY, rồi mới để nó chạy tiếp. Cửa sổ vài ms trước khi gán là chấp nhận được: con của node chưa kịp sinh.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $Cmd[0]
$psi.Arguments = ($Cmd | Select-Object -Skip 1 | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join " "
$psi.UseShellExecute = $false
$psi.WorkingDirectory = (Get-Location).Path
$p = [System.Diagnostics.Process]::Start($psi)
[JobCage]::Assign($p.Handle)
Write-Host ("[gate-cage] trần {0} MB · ưu tiên {1} · pid {2}" -f $limitMb, $prio, $p.Id)
$p.WaitForExit()
$peakMb = [int]([JobCage]::Peak() / 1MB)
Write-Host ("[gate-cage] đỉnh RAM cả cây: {0} MB / trần {1} MB · exit {2}" -f $peakMb, $limitMb, $p.ExitCode)
exit $p.ExitCode
