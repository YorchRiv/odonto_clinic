param(
    [string]$RenderName = "render"
)

Add-Type -AssemblyName System.Drawing

$renderDir = Join-Path $PSScriptRoot $RenderName
$contactDir = Join-Path $renderDir "contact"
New-Item -ItemType Directory -Path $contactDir -Force | Out-Null
Get-ChildItem -LiteralPath $contactDir -Filter "sheet-*.png" | Remove-Item -Force

$pages = @(Get-ChildItem -LiteralPath $renderDir -Filter "page-*.png" | Sort-Object Name)
$sheetWidth = 1000
$sheetHeight = 1300
$cellWidth = 500
$cellHeight = 650

for ($offset = 0; $offset -lt $pages.Count; $offset += 4) {
    $bitmap = New-Object System.Drawing.Bitmap($sheetWidth, $sheetHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::FromArgb(225, 228, 232))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    for ($index = 0; $index -lt 4 -and ($offset + $index) -lt $pages.Count; $index++) {
        $image = [System.Drawing.Image]::FromFile($pages[$offset + $index].FullName)
        try {
            $column = $index % 2
            $row = [Math]::Floor($index / 2)
            $margin = 12
            $availableWidth = $cellWidth - (2 * $margin)
            $availableHeight = $cellHeight - (2 * $margin)
            $scale = [Math]::Min($availableWidth / $image.Width, $availableHeight / $image.Height)
            $drawWidth = [int]($image.Width * $scale)
            $drawHeight = [int]($image.Height * $scale)
            $x = ($column * $cellWidth) + [int](($cellWidth - $drawWidth) / 2)
            $y = ($row * $cellHeight) + [int](($cellHeight - $drawHeight) / 2)
            $graphics.DrawImage($image, $x, $y, $drawWidth, $drawHeight)
        }
        finally {
            $image.Dispose()
        }
    }

    $sheetNumber = [int]($offset / 4) + 1
    $output = Join-Path $contactDir ("sheet-{0}.png" -f $sheetNumber)
    $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}
