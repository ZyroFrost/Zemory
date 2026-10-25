# Read-only DAX against the model Power BI Desktop has open (its local msmdsrv engine).
# Each line of -QueryFile is one DAX query; every result row is printed as "<query index>`t<col1>`t<col2>...".
# -Report picks the engine of the Desktop window that has that report open (two windows = two engines); without it, the newest.
# Installed by the HS skill pbi-base: edit it on HS, not in a repo copy (the next `zemory sync` puts the HS version back).
param([Parameter(Mandatory = $true)][string]$QueryFile,
      [string]$Report = '',
      [string]$Exe = 'D:\Software\Office\PowerBI\App\bin\PBIDesktop.exe')
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -Path (Join-Path (Split-Path $Exe) 'Microsoft.PowerBI.AdomdClient.dll')
# the engine of the Desktop window that has -Report open: the first engine found may belong to a window that is closing,
# and a query against it waits for minutes
$all = @(Get-CimInstance Win32_Process -Filter "Name='msmdsrv.exe'")
$ms = $null
if ($Report) {
  $owners = @(Get-CimInstance Win32_Process -Filter "Name='PBIDesktop.exe'" | Where-Object { $_.CommandLine -like "*$Report*" })
  $ms = $all | Where-Object { $pp = $_.ParentProcessId; @($owners | Where-Object { $_.ProcessId -eq $pp }).Count -gt 0 } | Select-Object -First 1
}
if (-not $ms) { $ms = $all | Sort-Object CreationDate -Descending | Select-Object -First 1 }
if (-not $ms) { Write-Output 'ERROR`tno Power BI Desktop model is open'; exit 2 }
$port = (Get-NetTCPConnection -OwningProcess $ms.ProcessId -State Listen | Select-Object -First 1).LocalPort
$c = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection("Data Source=localhost:$port"); $c.Open()
$i = 0
foreach ($q in [System.IO.File]::ReadAllLines($QueryFile, [System.Text.Encoding]::UTF8)) {
  if ($q.Trim()) {
    try {
      $cmd = $c.CreateCommand(); $cmd.CommandText = $q; $r = $cmd.ExecuteReader()
      while ($r.Read()) { $row = @(); for ($k = 0; $k -lt $r.FieldCount; $k++) { $row += [string]$r.GetValue($k) }; Write-Output ("$i`t" + ($row -join "`t")) }
      $r.Close()
    } catch { Write-Output ("$i`tERROR`t" + $_.Exception.Message.Split("`n")[0]) }
  }
  $i++
}
$c.Close()
