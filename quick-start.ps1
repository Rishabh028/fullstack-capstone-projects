#!/usr/bin/env pwsh
# quick-start.ps1 — One-click dev environment setup
# Run from project root: .\quick-start.ps1

Write-Host "🚀 Multi-Tenant SaaS Project Management Platform — Quick Start" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed. Install Docker Desktop from https://docker.com"
    exit 1
}

# Check .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠  No .env found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env created. Edit it to add your Stripe test keys before continuing." -ForegroundColor Green
    Write-Host "   Then re-run this script." -ForegroundColor Yellow
    exit 0
}

Write-Host "📦 Building and starting all services (db, redis, backend, celery, frontend)..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host "🌱 Running seed data..." -ForegroundColor Cyan
docker compose exec backend python manage.py seed_data

Write-Host ""
Write-Host "✅ Platform is ready!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  API:         http://localhost:8000/api/" -ForegroundColor White
Write-Host "  Swagger UI:  http://localhost:8000/api/docs/" -ForegroundColor White
Write-Host "  Admin:       http://localhost:8000/admin/" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Demo credentials (from seed data):" -ForegroundColor Yellow
Write-Host "  Email:    user_1_1@seed.saaspm.local" -ForegroundColor White
Write-Host "  Password: Password123!" -ForegroundColor White
Write-Host "  (or any user_X_Y@seed.saaspm.local with same password)" -ForegroundColor Gray
Write-Host ""
Write-Host "To view logs: docker compose logs -f" -ForegroundColor Gray
Write-Host "To stop:      docker compose down" -ForegroundColor Gray
