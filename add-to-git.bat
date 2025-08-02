@echo off
echo 🚀 Adding Coolify deployment files to Git repository...
echo.

echo 📋 Checking Git status...
git status
echo.

echo 📦 Adding new deployment files...
git add Dockerfile
git add docker-compose.yml
git add .dockerignore
git add .coolify
git add COOLIFY-DEPLOYMENT.md
git add setup-coolify.sh
git add DEPLOYMENT.md
git add next.config.js

echo.
echo 📝 Committing changes...
git commit -m "Add Coolify deployment configuration

- Add Dockerfile for multi-stage production build
- Add docker-compose.yml for service separation
- Add .dockerignore for optimized builds
- Add COOLIFY-DEPLOYMENT.md with step-by-step guide
- Add .coolify configuration file
- Add setup-coolify.sh verification script
- Update DEPLOYMENT.md with Coolify section
- Update next.config.js for production optimization

Ready for Coolify deployment with automatic SSL and monitoring."

echo.
echo ✅ Files committed! Now push to your repository:
echo git push origin main
echo.
echo 📖 Next steps:
echo 1. Push to your Git repository (GitHub/GitLab/Bitbucket)
echo 2. Open Coolify dashboard
echo 3. Create new application from your repository
echo 4. Configure environment variables
echo 5. Deploy!
echo.
echo Made with ❤️ by aewon.sebastian
pause
