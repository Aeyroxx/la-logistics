# L&A Logistic Services - Production Deployment Guide

## 📋 Prerequisites

1. **Node.js** (version 18 or higher)
2. **NPM** (comes with Node.js)
3. **Web Server** with Node.js support

## 🚀 Production Deployment Steps

### 1. Prepare the Application

```bash
# Install dependencies
npm install

# Build the frontend for production
npm run build
```

### 2. Production Environment Setup

Create a `.env.production` file with:
```env
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3003
FRONTEND_PORT=3000
```

### 3. Start Production Services

#### Option A: Manual Start
```bash
# Start backend server
npm run backend

# In another terminal, start frontend
npm start
```

#### Option B: PM2 (Recommended for production)
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
pm2 start backend/server.js --name "laa-backend"

# Start frontend with PM2
pm2 start npm --name "laa-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Coolify.io Deployment (Recommended for Self-Hosted)

Coolify is perfect for deploying your L&A Logistics application with its built-in reverse proxy and automatic SSL.

#### Prerequisites:
- Coolify.io installed on your server
- Git repository (GitHub/GitLab/Bitbucket)
- Domain name pointing to your Coolify server

#### Step-by-Step Coolify Deployment:

1. **Prepare Your Repository**:
   ```bash
   # Create a Dockerfile in your project root
   # (See Dockerfile section below)
   
   # Create docker-compose.yml for multi-service setup
   # (See Docker Compose section below)
   
   # Commit and push to your Git repository
   git add .
   git commit -m "Add Coolify deployment configuration"
   git push origin main
   ```

2. **Create New Project in Coolify**:
   - Login to your Coolify dashboard
   - Click "New Resource" → "Application"
   - Select "Public Repository" or connect your Git provider
   - Enter your repository URL: `https://github.com/aeyroxx/la-logistics`
   - Choose branch: `main`

3. **Configure Application Settings**:
   - **Build Pack**: Docker
   - **Port**: 3000 (Frontend)
   - **Domain**: `laa-logistics.yourdomain.com`
   - **Enable Automatic SSL**: ✅

4. **Environment Variables**:
   Add these in Coolify's Environment tab:
   ```env
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   FRONTEND_PORT=3000
   BACKEND_PORT=3003
   ALLOWED_ORIGINS=https://laa-logistics.yourdomain.com
   ```

5. **Deploy**: Click "Deploy" button

#### Dockerfile Configuration:
Create this `Dockerfile` in your project root:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/backend ./backend
COPY --from=deps /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p backend/uploads && chown nextjs:nodejs backend/uploads

USER nextjs

EXPOSE 3000
EXPOSE 3003

# Start both frontend and backend
CMD ["sh", "-c", "node backend/server.js & npm start"]
```

#### Docker Compose (Alternative Approach):
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    command: node backend/server.js
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3003
    volumes:
      - uploads:/app/backend/uploads
      - database:/app/backend
    restart: unless-stopped

  frontend:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  uploads:
  database:
```

#### Coolify Advanced Configuration:

1. **Custom Nginx (if needed)**:
   Coolify handles reverse proxy automatically, but you can customize:
   ```nginx
   # In Coolify's "Proxy" tab, add custom configuration:
   location /api/ {
       proxy_pass http://backend:3003;
   }
   
   location /uploads/ {
       proxy_pass http://backend:3003;
   }
   ```

2. **Health Checks**:
   Add to your application settings:
   - **Health Check Path**: `/api/health`
   - **Health Check Port**: 3003

3. **Persistent Data**:
   - **Database**: Map volume `/app/backend/database.sqlite`
   - **Uploads**: Map volume `/app/backend/uploads`

#### Troubleshooting Coolify Deployment:

- **Build Fails**: Check Coolify build logs for Node.js version compatibility
- **Database Issues**: Ensure SQLite file has write permissions
- **CORS Errors**: Update `ALLOWED_ORIGINS` with your Coolify domain
- **File Uploads**: Verify uploads directory is persistent across deployments

### 5. Web Server Configuration

#### Nginx Configuration Example:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (uploads)
    location /uploads/ {
        proxy_pass http://localhost:3003;
    }
}
```

#### Apache Configuration Example:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    # Frontend
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Backend API
    ProxyPass /api/ http://localhost:3003/api/
    ProxyPassReverse /api/ http://localhost:3003/api/
    
    # Static files
    ProxyPass /uploads/ http://localhost:3003/uploads/
    ProxyPassReverse /uploads/ http://localhost:3003/uploads/
</VirtualHost>
```

## 🔧 Configuration

### Default Admin Account
- **Email**: `admin@lalogistics.com`
- **Password**: `admin123`
- **⚠️ IMPORTANT**: Change this password immediately after first login!

### Email Configuration (Optional)
1. Go to **Admin Panel** → **System Settings**
2. Enable email and configure SMTP settings:
   - **Host**: Your SMTP server (e.g., smtp.gmail.com)
   - **Port**: Usually 587 for TLS
   - **Username**: Your email address
   - **Password**: Your email password or app password

### Company Branding
1. **Admin Panel** → **System Settings**
2. Upload your company logo
3. Change company name from "L&A Logistic Services" to your company name

## 📁 File Structure

```
la-logistic-services/
├── backend/
│   ├── server.js          # Backend server
│   ├── database.sqlite    # SQLite database (auto-created)
│   └── uploads/           # User uploads (auto-created)
├── src/                   # Frontend source code
├── .next/                 # Build output (after npm run build)
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🛡️ Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET in production
- [ ] Configure firewall to only allow necessary ports
- [ ] Set up SSL/HTTPS certificate
- [ ] Regular database backups
- [ ] Monitor application logs

## 📊 Features Overview

### For All Users:
- ✅ Secure login with forgot password
- ✅ Personal profile management
- ✅ Password change functionality
- ✅ Parcel entry and tracking
- ✅ Export reports (PDF/Excel)

### For Admin Users:
- ✅ Employee account management
- ✅ System settings configuration
- ✅ Email report functionality
- ✅ Company branding customization
- ✅ Data management and deletion

### Courier Support:
- ✅ **SPX**: Accurate pricing with 100-parcel cap per Shop ID
- ✅ **Flash**: Maximum 30 parcels per Seller ID
- ✅ Pickup status tracking for bonus calculations

## 🔍 Troubleshooting

### Common Issues:

1. **Port conflicts**: Change ports in configuration if 3000/3003 are in use
2. **Permission errors**: Ensure Node.js has write permissions for uploads/ and database
3. **CORS errors**: Check that frontend and backend URLs are correctly configured
4. **Email not working**: Verify SMTP settings and check firewall/network restrictions

### Log Files:
- Backend logs: Check console output or PM2 logs (`pm2 logs`)
- Frontend logs: Check browser developer console

## 📞 Support

This application was developed by **aewon.sebastian**

For technical support or customizations, contact the developer.

---

**Made with ❤️ by aewon.sebastian**
