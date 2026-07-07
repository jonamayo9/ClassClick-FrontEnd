param(
    [string]$BaseUrl = "https://classclick.com.ar"
)

$ErrorActionPreference = "Stop"

$paths = @(
    "/manifest.json",
    "/config.json",
    "/service-worker.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
)

foreach ($path in $paths) {
    $url = "$BaseUrl$path"
    Write-Host "Checking $url"
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing
    $contentType = $response.Headers["Content-Type"]
    Write-Host "  Status: $($response.StatusCode)"
    Write-Host "  Content-Type: $contentType"

    if ($path.EndsWith(".json") -and $response.Content.TrimStart().StartsWith("<")) {
        throw "$url devolvio HTML. Debe devolver JSON real."
    }

    if ($path.EndsWith(".png") -and $response.RawContentLength -lt 1000) {
        throw "$url parece demasiado chico para ser un icono valido."
    }
}

Write-Host "PWA publica lista para iniciar TWA."
