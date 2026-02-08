# PowerShell script to build and export Docker image on Windows
# Run this from the Fasto project directory

Write-Host "Building Docker image..." -ForegroundColor Green
docker build -f Dockerfile --target production -t fasto:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Image built successfully!" -ForegroundColor Green

Write-Host "Exporting image to tar file..." -ForegroundColor Green
docker save fasto:latest -o fasto-image.tar

if ($LASTEXITCODE -ne 0) {
    Write-Host "Export failed!" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item fasto-image.tar).Length / 1MB
Write-Host "Image exported successfully!" -ForegroundColor Green
Write-Host "File: fasto-image.tar ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Transfer fasto-image.tar to ZimaOS (~/AppData/fasto/)" -ForegroundColor White
Write-Host "2. On ZimaOS, run: docker load -i fasto-image.tar" -ForegroundColor White
Write-Host "3. Then use docker-compose or docker run to start the container" -ForegroundColor White
