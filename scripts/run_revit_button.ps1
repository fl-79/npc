# Clicks a pyRevit ribbon button in the running Revit through Windows UI Automation and,
# optionally, waits for a marker file the script writes when it is done.
#
#   powershell -File run_revit_button.ps1 -Tab NPC -Button "Export Model" -Marker "...\exports\export-done.txt" -TimeoutSec 1800
#   powershell -File run_revit_button.ps1 -Tab pyRevit -Button Reload
#
# Button names match the ribbon text with "\n" for the line break (e.g. "Export\nModel");
# pass the name with a space instead of the line break and it is matched either way.

param(
    [string]$Tab = "NPC",
    [Parameter(Mandatory = $true)][string]$Button,
    [string]$Marker = "",
    [int]$TimeoutSec = 1800,
    [int]$Index = -1,       # position of the button in the panel (0 = leftmost), for the mouse fallback
    [switch]$ListOnly
)

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]

$procs = @(Get-Process Revit -ErrorAction Stop)
if (-not $procs) { throw "Revit is not running." }
# The process's MainWindowHandle can point at a pyRevit output window, so look for the
# top-level window of the Revit process whose title starts with "Autodesk Revit".
$root = $null
$pidCond = New-Object System.Windows.Automation.OrCondition(@($procs | ForEach-Object { New-Object System.Windows.Automation.PropertyCondition($AE::ProcessIdProperty, $_.Id) }) + @(New-Object System.Windows.Automation.PropertyCondition($AE::ProcessIdProperty, $procs[0].Id)))
$tops = $AE::RootElement.FindAll($TS::Children, $pidCond)
foreach ($w in $tops) { if ($w.Current.Name -like "Autodesk Revit*") { $root = $w } }
if (-not $root) { throw "Revit main window not found (titles: " + (($tops | ForEach-Object { $_.Current.Name }) -join ' | ') + ")" }
Write-Output ("Revit window: " + $root.Current.Name)

function Find-ById($id) {
    $c = New-Object System.Windows.Automation.PropertyCondition($AE::AutomationIdProperty, $id)
    return $root.FindFirst($TS::Descendants, $c)
}

$tabBtn = Find-ById $Tab
if (-not $tabBtn) { throw "Ribbon tab '$Tab' not found." }
$tabBtn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
Start-Sleep -Milliseconds 700

$bar = Find-ById ($Tab + "_PanelBarScrollViewer")
if (-not $bar) { throw "Panel bar for tab '$Tab' not found." }
# After a pyRevit reload the ribbon buttons are virtualised items without automation peers;
# realising each RibbonButton item makes its Button appear.
$items = $bar.FindAll($TS::Descendants, (New-Object System.Windows.Automation.PropertyCondition($AE::NameProperty, "Autodesk.Windows.RibbonButton")))
foreach ($it in $items) {
    try { $it.GetCurrentPattern([System.Windows.Automation.VirtualizedItemPattern]::Pattern).Realize() } catch { }
}
if ($items.Count -gt 0) { Start-Sleep -Milliseconds 500 }
$bc = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
$btns = $bar.FindAll($TS::Descendants, $bc)

$wanted = $Button -replace ' ', "`n"
$target = $null
foreach ($b in $btns) {
    $n = $b.Current.Name
    if ($ListOnly) { Write-Output ("  button: " + ($n -replace "`n", '\n') + "  id=" + $b.Current.AutomationId) }
    if ($n -eq $Button -or $n -eq $wanted -or ($n -replace "`n", ' ') -eq $Button) { $target = $b }
}
if ($ListOnly) { exit 0 }
if (-not $target) {
    # The panel bar only lists what is laid out; fall back to the button's stable AutomationId
    # (CustomCtrl_%CustomCtrl_%<Tab>%<Panel>%<BundleName>) anywhere under the Revit window.
    $bundle = ($Button -replace '[\s\n]', '')
    $all = $root.FindAll($TS::Descendants, $bc)
    foreach ($b in $all) {
        $id = $b.Current.AutomationId
        if ($id -like ("*%" + $Tab + "%*%" + $bundle) -or $id -like ("*%" + $Tab + "%*%" + $bundle + "_*")) { $target = $b }
    }
}
$ErrMarker = ""
if ($Marker -ne "") {
    if (Test-Path $Marker) { Remove-Item $Marker -Force }
    $ErrMarker = $Marker -replace '-done\.txt$', '-error.txt'
    if ($ErrMarker -ne $Marker -and (Test-Path $ErrMarker)) { Remove-Item $ErrMarker -Force }
}
if ($target) {
    $target.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    Write-Output ("Invoked '" + ($target.Current.Name -replace "`n", ' ') + "' at " + (Get-Date -Format HH:mm:ss))
} elseif ($Index -ge 0 -and $Index -lt $items.Count) {
    # Mouse fallback: the ribbon item has a rectangle even without an automation peer.
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type @"
using System; using System.Runtime.InteropServices;
public class Win32Mouse {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
"@
    $r = $items[$Index].Current.BoundingRectangle
    $cx = [int]($r.X + $r.Width / 2); $cy = [int]($r.Y + $r.Height / 2)
    [Win32Mouse]::SetForegroundWindow($root.Current.NativeWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 400
    $tabBtn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($cx, $cy)
    Start-Sleep -Milliseconds 200
    [Win32Mouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)   # left down
    [Win32Mouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)   # left up
    Write-Output ("Clicked panel item $Index at ($cx, $cy) for '" + $Button + "' at " + (Get-Date -Format HH:mm:ss))
} else {
    # UI Automation does not always materialise every ribbon button after a pyRevit reload.
    # pyRevit's Search palette runs any command by name: open it, type the name, press Enter.
    $pyTab = Find-ById "pyRevit"
    if ($pyTab) { $pyTab.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke(); Start-Sleep -Milliseconds 800 }
    $search = Find-ById "CustomCtrl_%CustomCtrl_%pyRevit%pyRevit%Search"
    if (-not $search) { throw "Button '$Button' not found on tab '$Tab', and pyRevit Search is not reachable." }
    Add-Type -AssemblyName System.Windows.Forms
    $search.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    Start-Sleep -Milliseconds 1500
    [System.Windows.Forms.SendKeys]::SendWait(($Button -replace "`n", ' '))
    Start-Sleep -Milliseconds 1200
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Write-Output ("Ran '" + $Button + "' through pyRevit Search at " + (Get-Date -Format HH:mm:ss))
}

if ($Marker -eq "") { exit 0 }
$t0 = Get-Date
while (-not (Test-Path $Marker)) {
    Start-Sleep -Seconds 2
    if ($ErrMarker -ne "" -and $ErrMarker -ne $Marker -and (Test-Path $ErrMarker)) {
        Start-Sleep -Seconds 1
        Write-Output "SCRIPT FAILED:"
        Get-Content $ErrMarker
        exit 2
    }
    if (((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec) { throw "Timed out after $TimeoutSec s waiting for $Marker" }
}
Start-Sleep -Seconds 1
Write-Output ("Done after " + [int]((Get-Date) - $t0).TotalSeconds + " s")
Get-Content $Marker
