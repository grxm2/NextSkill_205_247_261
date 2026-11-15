param(
    [string]$Source = (Join-Path $PSScriptRoot '../artifacts/course-covers/originals'),
    [string]$Destination = (Join-Path $PSScriptRoot '../NextSkill_205_247_261/wwwroot/images/courses')
)
# Encode the generated originals for cards; keep the original artwork intact.
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$jpeg = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$quality = New-Object Drawing.Imaging.EncoderParameters(1)
$quality.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]88)
foreach ($file in Get-ChildItem -LiteralPath $Source -Filter '*.png') {
    $original = [Drawing.Image]::FromFile($file.FullName)
    $height = [int][Math]::Round(960 * $original.Height / $original.Width)
    $bitmap = New-Object Drawing.Bitmap(960, $height)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($original, 0, 0, 960, $height)
        $bitmap.Save((Join-Path $Destination ($file.BaseName + '.jpg')), $jpeg, $quality)
    }
    finally { $graphics.Dispose(); $bitmap.Dispose(); $original.Dispose() }
}
$quality.Dispose()
Get-ChildItem -LiteralPath $Destination -Filter '*.jpg' | Select-Object Name, Length
