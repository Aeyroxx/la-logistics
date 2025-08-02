# L&A Logistics - Git Repository Setup Script for PowerShell
# This script will initialize your repository and add all Coolify deployment files

Write-Host "Setting up L&A Logistics repository..." -ForegroundColor Green
Write-Host ""

# Set Git path for this session
$env:PATH += ";C:\Program Files\Git\bin"

# Initialize repository if not already done
Write-Host "Initializing Git repository..." -ForegroundColor Yellow
& git init

Write-Host ""
Write-Host "Adding remote repository..." -ForegroundColor Yellow
& git remote add origin https://github.com/aeyroxx/la-logistics.git

# Check current status
Write-Host ""
Write-Host "Current repository status:" -ForegroundColor Yellow
& git status

Write-Host ""
Write-Host "Adding all files to repository..." -ForegroundColor Yellow

# Add all project files
& git add .

Write-Host ""
Write-Host "Committing files..." -ForegroundColor Yellow
& git commit -m "Initial commit: L&A Logistics System with Coolify deployment

Features:
- Complete logistics management system
- User authentication with admin/employee roles
- Parcel tracking with SPX/Flash courier support
- PDF/Excel report generation
- Email functionality with SMTP configuration
- Company branding customization
- Admin panel for employee and data management

Deployment:
- Dockerfile for production deployment
- Docker Compose configuration
- Coolify deployment guide and configuration
- Next.js optimized for standalone production build
- Health checks and monitoring endpoints
- Persistent storage for database and uploads

Ready for production deployment on Coolify.io

Made with love by aewon.sebastian"

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
& git branch -M main
& git push -u origin main

Write-Host ""
Write-Host "Repository setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open Coolify dashboard" -ForegroundColor White
Write-Host "2. Create new application from: https://github.com/aeyroxx/la-logistics" -ForegroundColor White
Write-Host "3. Configure environment variables" -ForegroundColor White
Write-Host "4. Deploy!" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- DEPLOYMENT.md - General deployment guide" -ForegroundColor White
Write-Host "- COOLIFY-DEPLOYMENT.md - Specific Coolify instructions" -ForegroundColor White
Write-Host ""
Write-Host "Default login:" -ForegroundColor Cyan
Write-Host "Email: admin@lalogistics.com" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host "CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!" -ForegroundColor Red
Write-Host ""
Write-Host "Made with love by aewon.sebastian" -ForegroundColor Magenta
