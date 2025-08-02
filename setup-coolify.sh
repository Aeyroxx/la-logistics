#!/bin/bash

# L&A Logistic Services - Coolify Setup Script
# This script helps prepare your repository for Coolify deployment

echo "🚀 Preparing L&A Logistic Services for Coolify deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Check if required files exist
echo "📋 Checking required files..."

required_files=(
    "Dockerfile"
    "docker-compose.yml"
    ".dockerignore"
    "COOLIFY-DEPLOYMENT.md"
    "next.config.js"
    "backend/server.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        exit 1
    fi
done

echo ""
echo "🔧 Verifying configuration..."

# Check if health endpoint exists
if grep -q "app.get('/api/health'" backend/server.js; then
    echo "✅ Health check endpoint configured"
else
    echo "❌ Health check endpoint missing"
fi

# Check if Next.js is configured for standalone output
if grep -q "output: 'standalone'" next.config.js; then
    echo "✅ Next.js standalone output configured"
else
    echo "⚠️  Next.js standalone output not configured"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Testing build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check for errors."
    exit 1
fi

echo ""
echo "🎉 Ready for Coolify deployment!"
echo ""
echo "Next steps:"
echo "1. Push your code to Git repository"
echo "2. Create new application in Coolify"
echo "3. Configure environment variables"
echo "4. Deploy!"
echo ""
echo "📖 See COOLIFY-DEPLOYMENT.md for detailed instructions"
echo ""
echo "Default login credentials:"
echo "Email: admin@lalogistics.com"
echo "Password: admin123"
echo "⚠️  CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!"
echo ""
echo "Made with ❤️ by aewon.sebastian"
