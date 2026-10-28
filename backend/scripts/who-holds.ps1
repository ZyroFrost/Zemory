# The processes holding a file or folder under -Path (Windows). A folder rename refused with EACCES names no holder, and the
# Restart Manager sees files only, not the folder handles an editor's file watcher or Explorer keeps (measured 2026-10-28: a
# closed VS Code window left two helper processes on .git and the repo root, Explorer kept a subfolder; 11,221 files had no
# holder). This walks every handle on the system, keeps the disk-file handles of the processes it can open, and prints
# "<process> <pid> <path>" for -Path itself and each path under it. Read-only; called by host-cli.mjs after a refused `project move`.
param([Parameter(Mandatory = $true)][string]$Path)
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text; using System.Collections.Generic;
public static class ZemoryHandles {
  [StructLayout(LayoutKind.Sequential)] public struct E { public IntPtr Obj; public IntPtr Pid; public IntPtr Handle; public uint Access; public ushort Bt; public ushort Type; public uint Attr; public uint Res; }
  [DllImport("ntdll.dll")] static extern int NtQuerySystemInformation(int c, IntPtr b, int l, out int r);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint a, bool i, int p);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
  [DllImport("kernel32.dll")] static extern bool DuplicateHandle(IntPtr sp, IntPtr sh, IntPtr tp, out IntPtr th, uint a, bool i, uint o);
  [DllImport("kernel32.dll")] static extern uint GetFileType(IntPtr h);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern uint GetFinalPathNameByHandle(IntPtr h, StringBuilder s, uint n, uint f);
  public static List<string> Find(string needle) {
    var o = new List<string>(); int len = 1 << 24; IntPtr buf = Marshal.AllocHGlobal(len); int ret;
    // 64 = SystemExtendedHandleInformation; grow the buffer while the call says it is too small
    while (NtQuerySystemInformation(64, buf, len, out ret) == unchecked((int)0xC0000004)) { Marshal.FreeHGlobal(buf); len = ret + (1 << 20); buf = Marshal.AllocHGlobal(len); }
    long count = Marshal.ReadIntPtr(buf).ToInt64(); int sz = Marshal.SizeOf(typeof(E)); IntPtr p = buf + IntPtr.Size * 2;
    var procs = new Dictionary<long, IntPtr>(); IntPtr me = GetCurrentProcess(); var seen = new HashSet<string>();
    for (long i = 0; i < count; i++) {
      var e = (E)Marshal.PtrToStructure(p + (int)(i * sz), typeof(E)); long pid = e.Pid.ToInt64();
      IntPtr ph; if (!procs.TryGetValue(pid, out ph)) { ph = OpenProcess(0x40, false, (int)pid); procs[pid] = ph; }
      if (ph == IntPtr.Zero) continue;
      IntPtr d; if (!DuplicateHandle(ph, e.Handle, me, out d, 0, false, 2)) continue;
      try {
        // disk files only: asking a pipe its name can block for ever
        if (GetFileType(d) != 1) continue;
        var sb = new StringBuilder(1024);
        if (GetFinalPathNameByHandle(d, sb, 1024, 0) == 0) continue;
        var path = sb.ToString(); if (path.StartsWith(@"\\?\")) path = path.Substring(4);
        // the folder itself or a path under it - never a sibling that only starts with the same letters (.git / .github)
        bool under = path.Equals(needle, StringComparison.OrdinalIgnoreCase) || path.StartsWith(needle + @"\", StringComparison.OrdinalIgnoreCase);
        if (under && seen.Add(pid + "|" + path)) o.Add(pid + " " + path);
      } finally { CloseHandle(d); } }
    foreach (var h in procs.Values) if (h != IntPtr.Zero) CloseHandle(h);
    Marshal.FreeHGlobal(buf); return o; } }
"@
$needle = $Path.TrimEnd('\', '/') -replace '/', '\'
foreach ($r in [ZemoryHandles]::Find($needle)) {
  $id = [int]($r -split ' ', 2)[0]
  $name = (Get-Process -Id $id -ErrorAction SilentlyContinue).ProcessName
  "$name $r"
}
