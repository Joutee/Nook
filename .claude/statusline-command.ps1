$input = $Input | Out-String
$data = $input | ConvertFrom-Json

# Extract values
$projectDir = if ($data.workspace.project_dir) { $data.workspace.project_dir } elseif ($data.cwd) { $data.cwd } else { "unknown" }
$projectName = Split-Path $projectDir -Leaf
$model = if ($data.model.display_name) { $data.model.display_name } else { "unknown" }
$usedPct = $data.context_window.used_percentage

# Build context bar
if ($null -ne $usedPct) {
    $pct = [Math]::Round($usedPct)
    $width = 20
    $filled = [Math]::Round($usedPct * $width / 100)
    if ($filled -gt $width) { $filled = $width }
    if ($filled -lt 0) { $filled = 0 }
    $bar = "$([char]0x2588)" * $filled + ' ' * ($width - $filled)
    $contextPart = "$bar $pct%"
} else {
    $contextPart = (' ' * 20) + " --%"
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host -NoNewline "$projectName | $model | $contextPart"
