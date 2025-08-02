# 🚀 Coolify.io Deployment Guide for L&A Logistic Services

## Quick Start with Coolify

### 1. Prerequisites
- [ ] Coolify.io installed on your server
- [ ] Git repository (GitHub/GitLab/Bitbucket) 
- [ ] Domain name pointing to your Coolify server

### 2. Repository Setup

1. **Push your code to Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Coolify deployment"
   git remote add origin https://github.com/yourusername/laa-logistics.git
   git push -u origin main
   ```

### 3. Coolify Configuration

#### Create New Application:
1. **Login** to your Coolify dashboard
2. **New Resource** → **Application**
3. **Source**: Connect your Git repository
4. **Repository URL**: `https://github.com/yourusername/laa-logistics`
5. **Branch**: `main`
6. **Build Pack**: `Docker`

#### Environment Variables:
```env
NODE_ENV=production
JWT_SECRET=your-super-secret-change-this-in-production-min-32-chars
FRONTEND_PORT=3000
BACKEND_PORT=3003
ALLOWED_ORIGINS=https://laa-logistics.yourdomain.com
```

#### Application Settings:
- **Port**: `3000` (Frontend)
- **Domain**: `laa-logistics.yourdomain.com`
- **SSL**: ✅ Enable (Automatic)
- **Health Check**: `/api/health` (Port 3003)

#### Persistent Storage:
Add these volumes in Coolify:
- **Source**: `/app/backend/uploads` → **Destination**: `/uploads`
- **Source**: `/app/backend/database.sqlite` → **Destination**: `/database.sqlite`

### 4. Advanced Coolify Setup

#### Custom Proxy Configuration:
If you need custom routing, add to Coolify's proxy settings:
```nginx
# API Routes
location /api/ {
    proxy_pass http://{{ container_name }}:3003;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# File Uploads
location /uploads/ {
    proxy_pass http://{{ container_name }}:3003;
}
```

#### Docker Compose Alternative:
For multi-service deployment, use the included `docker-compose.yml`:

1. **Create Service** → **Docker Compose**
2. **Upload** your `docker-compose.yml`
3. **Set Environment Variables**:
   ```env
   JWT_SECRET=your-secret-key
   ALLOWED_ORIGINS=https://your-domain.com
   ```

### 5. Deployment Steps

1. **Deploy**: Click "Deploy" in Coolify
2. **Monitor**: Watch build logs in real-time
3. **Access**: Visit your domain once deployed
4. **Login**: Use default credentials:
   - Email: `admin@lalogistics.com`
   - Password: `admin123`
   - ⚠️ **Change immediately after first login!**

### 6. Post-Deployment Configuration

#### Company Settings:
1. **Admin Panel** → **System Settings**
2. **Upload Logo**: Replace default logo
3. **Company Name**: Change from "L&A Logistic Services"
4. **Email Settings**: Configure SMTP (optional)

#### Security Checklist:
- [ ] Change default admin password
- [ ] Verify SSL certificate is working
- [ ] Test file upload functionality
- [ ] Configure email settings (if needed)
- [ ] Set up database backups

### 7. Coolify Advantages

✅ **Automatic SSL** with Let's Encrypt
✅ **Built-in Reverse Proxy** (Traefik)
✅ **One-click Deployments** from Git
✅ **Container Health Monitoring**
✅ **Automatic Restarts** on failure
✅ **Volume Management** for persistent data
✅ **Environment Variables** management
✅ **Build Logs** and monitoring

### 8. Troubleshooting

#### Common Issues:

1. **Build Fails**:
   ```bash
   # Check Coolify build logs
   # Verify Node.js version compatibility
   # Ensure all dependencies are in package.json
   ```

2. **Database Permission Errors**:
   ```bash
   # In Coolify terminal:
   chmod 755 /app/backend
   chown -R nextjs:nodejs /app/backend/uploads
   ```

3. **CORS Errors**:
   - Verify `ALLOWED_ORIGINS` matches your domain
   - Check proxy configuration in Coolify

4. **File Upload Issues**:
   - Ensure uploads volume is properly mounted
   - Check container permissions

#### Health Check Endpoints:
- **Frontend**: `https://your-domain.com/` (200 OK)
- **Backend**: `https://your-domain.com/api/health` (200 OK)

### 9. Scaling and Maintenance

#### Backup Strategy:
```bash
# Database backup (in Coolify terminal)
cp /app/backend/database.sqlite /backups/database-$(date +%Y%m%d).sqlite

# Uploads backup
tar -czf /backups/uploads-$(date +%Y%m%d).tar.gz /app/backend/uploads/
```

#### Updates:
1. **Push** code changes to Git
2. **Redeploy** in Coolify dashboard
3. **Monitor** deployment logs
4. **Test** functionality after deployment

---

## 🎉 Success!

Your L&A Logistic Services application is now running on Coolify with:
- ✅ Automatic SSL
- ✅ Production-ready configuration
- ✅ Persistent data storage
- ✅ Health monitoring
- ✅ Easy updates via Git

**Made with ❤️ by aewon.sebastian**
