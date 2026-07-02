Set-Location "C:\Users\MUNDIAL DEL PC\Claude\Projects\AppDian"
git add frontend/
git commit -m "feat: add React frontend POS (Dashboard, POS, Productos, Clientes, Facturas)"
git push origin main
Write-Host ""
Write-Host "✅ Frontend subido a GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso: crear servicio en Railway" -ForegroundColor Cyan
Write-Host "  1. Railway → New Service → GitHub Repo appdian" -ForegroundColor White
Write-Host "  2. Root Directory: /frontend" -ForegroundColor White
Write-Host "  3. Variable: VITE_API_URL=https://appdian-production.up.railway.app" -ForegroundColor White
Read-Host "Presiona Enter para cerrar"
