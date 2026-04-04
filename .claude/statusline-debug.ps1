$input = $Input | Out-String
$input | Out-File -FilePath "D:\1Skola\Nook\.claude\statusline-debug.txt" -Encoding utf8
Write-Host -NoNewline "debug: saved"
