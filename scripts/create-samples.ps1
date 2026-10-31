param(
  [ValidatePattern('^N65-2408-[0-9]{4}$')][string]$Serial,
  [string]$OutputDirectory
)
Add-Type -AssemblyName System.Drawing
$sampleRoot = if ($OutputDirectory) { [IO.Path]::GetFullPath($OutputDirectory) } else { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\samples')) }
New-Item -ItemType Directory -Force -Path $sampleRoot | Out-Null
$cases = @(
  @{Name='label-clear'; Model='N65'; Serial='N65-2408-8000'},
  @{Name='label-unaffected'; Model='N66'; Serial='N66-2409-8000'},
  @{Name='label-ambiguous'; Model='N65'; Serial='[serial unreadable]'}
)
if ($Serial) { $cases = @(@{Name=('label-' + $Serial); Model='N65'; Serial=$Serial}) }
foreach ($sample in $cases) {
  $bitmap = New-Object Drawing.Bitmap(900, 420)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([Drawing.Color]::FromArgb(247,247,239))
  $brush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(34,54,44))
  $heading = New-Object Drawing.Font('Arial', 27, [Drawing.FontStyle]::Bold)
  $body = New-Object Drawing.Font('Consolas', 23)
  $small = New-Object Drawing.Font('Arial', 14)
  $graphics.DrawString('NORTHSTAR GOODS  /  NOVA CHARGER', $heading, $brush, 35, 30)
  $graphics.DrawString(('MODEL: ' + $sample.Model), $body, $brush, 35, 125)
  $graphics.DrawString(('SERIAL: ' + $sample.Serial), $body, $brush, 35, 185)
  $graphics.DrawString('65W USB-C TRAVEL CHARGER', $small, $brush, 35, 265)
  $graphics.DrawString('FICTIONAL HACKATHON PRODUCT - SYNTHETIC TEST IMAGE', $small, $brush, 35, 340)
  $bitmap.Save((Join-Path $sampleRoot ($sample.Name + '.png')), [Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose(); $brush.Dispose(); $heading.Dispose(); $body.Dispose(); $small.Dispose()
}
Write-Output ('Generated ' + $cases.Count + ' explicitly synthetic label image(s).')
