const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const ExcelJS = require('exceljs');
const jsPDF = require('jspdf').jsPDF;
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
require('jspdf-autotable');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3004'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Add logging middleware (only in development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
  });
}

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'employee',
    employee_id TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    picture TEXT,
    last_active DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Parcels table
  db.run(`CREATE TABLE IF NOT EXISTS parcels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    courier TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    picked_up_same_day BOOLEAN DEFAULT 0,
    date DATE NOT NULL,
    total_earning DECIMAL(10,2) NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Initialize default settings
  const defaultSettings = [
    ['company_name', 'L&A Logistic Services'],
    ['company_logo', ''],
    ['smtp_enabled', 'false'],
    ['smtp_host', ''],
    ['smtp_port', '587'],
    ['smtp_user', ''],
    ['smtp_password', ''],
    ['smtp_from_email', ''],
    ['smtp_from_name', '']
  ];

  defaultSettings.forEach(([key, value]) => {
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
  });

  // Create default admin user if not exists
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (name, email, password, role, employee_id) 
          VALUES ('Admin User', 'admin@lalogistics.com', ?, 'admin', 'ADMIN001')`, 
          [defaultPassword]);

  // Update existing users to have default values for new fields
  db.run(`UPDATE users SET 
    employee_id = COALESCE(employee_id, 'EMP' || printf('%03d', id)),
    address = COALESCE(address, ''),
    phone = COALESCE(phone, ''),
    picture = COALESCE(picture, ''),
    last_active = COALESCE(last_active, CURRENT_TIMESTAMP),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
    WHERE employee_id IS NULL OR address IS NULL OR phone IS NULL`, 
    function(err) {
      if (err) console.error('Error updating existing users:', err);
      else console.log('Existing users updated with default values');
    });
});

// Email utility functions
const getEmailTransporter = async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings WHERE key LIKE "smtp_%"', (err, settings) => {
      if (err) return reject(err);
      
      const config = {};
      settings.forEach(setting => {
        config[setting.key] = setting.value;
      });

      if (config.smtp_enabled !== 'true') {
        return resolve(null);
      }

      const transporter = nodemailer.createTransporter({
        host: config.smtp_host,
        port: parseInt(config.smtp_port),
        secure: parseInt(config.smtp_port) === 465,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password
        }
      });

      resolve(transporter);
    });
  });
};

const getSettings = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', (err, settings) => {
      if (err) return reject(err);
      const config = {};
      settings.forEach(setting => {
        config[setting.key] = setting.value;
      });
      resolve(config);
    });
  });
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, role, created_at as createdAt FROM users ORDER BY created_at DESC', 
    (err, users) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(users);
    });
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Email already exists' });
          }
          return res.status(500).json({ message: 'Database error' });
        }
        
        res.status(201).json({
          id: this.lastID,
          name,
          email,
          role
        });
      });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.run('DELETE FROM users WHERE id = ? AND role != "admin"', [userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found or cannot delete admin' });
    }
    
    res.json({ message: 'User deleted successfully' });
  });
});

// Parcel routes
app.get('/api/parcels', authenticateToken, (req, res) => {
  const { filter } = req.query;
  let dateCondition = '';
  const today = new Date();
  
  switch (filter) {
    case 'today':
      dateCondition = `date = '${today.toISOString().split('T')[0]}'`;
      break;
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateCondition = `date >= '${weekAgo.toISOString().split('T')[0]}'`;
      break;
    case 'month':
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      dateCondition = `date >= '${monthAgo.toISOString().split('T')[0]}'`;
      break;
    case 'year':
      const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      dateCondition = `date >= '${yearAgo.toISOString().split('T')[0]}'`;
      break;
    default:
      dateCondition = '1=1';
  }

  const query = `SELECT * FROM parcels WHERE ${dateCondition} ORDER BY date DESC, created_at DESC`;
  
  db.all(query, (err, parcels) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    const formattedParcels = parcels.map(parcel => ({
      id: parcel.id,
      taskId: parcel.task_id,
      sellerId: parcel.seller_id,
      courier: parcel.courier,
      quantity: parcel.quantity,
      pickedUpSameDay: parcel.picked_up_same_day === 1,
      date: parcel.date,
      totalEarning: parseFloat(parcel.total_earning)
    }));
    
    res.json(formattedParcels);
  });
});

app.post('/api/parcels', authenticateToken, (req, res) => {
  const { taskId, sellerId, courier, quantity, pickedUpSameDay, date, totalEarning } = req.body;
  const userId = req.user.userId;

  db.run(`INSERT INTO parcels 
          (task_id, seller_id, courier, quantity, picked_up_same_day, date, total_earning, user_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [taskId, sellerId, courier, quantity, pickedUpSameDay ? 1 : 0, date, totalEarning, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      res.status(201).json({
        id: this.lastID,
        taskId,
        sellerId,
        courier,
        quantity,
        pickedUpSameDay,
        date,
        totalEarning
      });
    });
});

// Delete parcel entry (Admin only)
app.delete('/api/parcels/:id', authenticateToken, requireAdmin, (req, res) => {
  const parcelId = req.params.id;
  
  db.run('DELETE FROM parcels WHERE id = ?', [parcelId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Parcel entry not found' });
    }
    
    res.json({ message: 'Parcel entry deleted successfully' });
  });
});

// Export routes
app.get('/api/export/pdf', authenticateToken, (req, res) => {
  const { filter } = req.query;
  let dateCondition = '';
  const today = new Date();
  
  switch (filter) {
    case 'today':
      dateCondition = `date = '${today.toISOString().split('T')[0]}'`;
      break;
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateCondition = `date >= '${weekAgo.toISOString().split('T')[0]}'`;
      break;
    case 'month':
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      dateCondition = `date >= '${monthAgo.toISOString().split('T')[0]}'`;
      break;
    case 'year':
      const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      dateCondition = `date >= '${yearAgo.toISOString().split('T')[0]}'`;
      break;
    default:
      dateCondition = '1=1';
  }

  const query = `SELECT * FROM parcels WHERE ${dateCondition} ORDER BY date DESC`;
  
  db.all(query, (err, parcels) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('L&A Logistic Services', 14, 22);
    doc.setFontSize(14);
    doc.text(`Parcel Report - ${filter}`, 14, 32);
    
    // Prepare table data
    const tableData = parcels.map(parcel => [
      parcel.task_id,
      parcel.seller_id,
      parcel.courier,
      parcel.quantity.toString(),
      parcel.date,
      parcel.picked_up_same_day ? 'Yes' : 'No',
      `₱${parseFloat(parcel.total_earning).toFixed(2)}`
    ]);

    // Add table
    doc.autoTable({
      head: [['Task ID', 'Seller ID', 'Courier', 'Quantity', 'Date', 'Picked Up', 'Earning']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Add summary
    const totalEarnings = parcels.reduce((sum, parcel) => sum + parseFloat(parcel.total_earning), 0);
    const totalParcels = parcels.reduce((sum, parcel) => sum + parcel.quantity, 0);
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Parcels: ${totalParcels}`, 14, finalY);
    doc.text(`Total Earnings: ₱${totalEarnings.toFixed(2)}`, 14, finalY + 8);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=parcels-${filter}.pdf`);
    res.send(Buffer.from(doc.output('arraybuffer')));
  });
});

app.get('/api/export/excel', authenticateToken, async (req, res) => {
  const { filter } = req.query;
  let dateCondition = '';
  const today = new Date();
  
  switch (filter) {
    case 'today':
      dateCondition = `date = '${today.toISOString().split('T')[0]}'`;
      break;
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateCondition = `date >= '${weekAgo.toISOString().split('T')[0]}'`;
      break;
    case 'month':
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      dateCondition = `date >= '${monthAgo.toISOString().split('T')[0]}'`;
      break;
    case 'year':
      const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      dateCondition = `date >= '${yearAgo.toISOString().split('T')[0]}'`;
      break;
    default:
      dateCondition = '1=1';
  }

  const query = `SELECT * FROM parcels WHERE ${dateCondition} ORDER BY date DESC`;
  
  db.all(query, async (err, parcels) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Parcels');

    // Add headers
    worksheet.columns = [
      { header: 'Task ID', key: 'task_id', width: 15 },
      { header: 'Seller ID', key: 'seller_id', width: 15 },
      { header: 'Courier', key: 'courier', width: 10 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Picked Up Same Day', key: 'picked_up_same_day', width: 18 },
      { header: 'Total Earning', key: 'total_earning', width: 15 }
    ];

    // Add data
    parcels.forEach(parcel => {
      worksheet.addRow({
        task_id: parcel.task_id,
        seller_id: parcel.seller_id,
        courier: parcel.courier,
        quantity: parcel.quantity,
        date: parcel.date,
        picked_up_same_day: parcel.picked_up_same_day ? 'Yes' : 'No',
        total_earning: parseFloat(parcel.total_earning)
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    // Add summary
    const totalEarnings = parcels.reduce((sum, parcel) => sum + parseFloat(parcel.total_earning), 0);
    const totalParcels = parcels.reduce((sum, parcel) => sum + parcel.quantity, 0);
    
    worksheet.addRow([]);
    worksheet.addRow(['SUMMARY']);
    worksheet.addRow(['Total Parcels:', totalParcels]);
    worksheet.addRow(['Total Earnings:', totalEarnings]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=parcels-${filter}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  });
});

// Forgot password route
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Check if user exists
    db.get('SELECT id, name, email FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with that email exists, password reset instructions have been sent.' });
      }
      
      try {
        const transporter = await getEmailTransporter();
        const settings = await getSettings();
        
        if (!transporter) {
          return res.status(400).json({ message: 'Email is not configured. Please contact administrator.' });
        }
        
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        // Update user password
        db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, user.id], async function(err) {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }
            
            // Send email with new password
            const mailOptions = {
              from: `${settings.smtp_from_name || settings.company_name} <${settings.smtp_from_email}>`,
              to: user.email,
              subject: 'Password Reset - ' + (settings.company_name || 'L&A Logistics'),
              html: `
                <h1>${settings.company_name || 'L&A Logistics'}</h1>
                <h2>Password Reset</h2>
                <p>Hello ${user.name},</p>
                <p>Your password has been reset. Here are your new login credentials:</p>
                <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <strong>Email:</strong> ${user.email}<br>
                  <strong>New Password:</strong> ${tempPassword}
                </div>
                <p><strong>Important:</strong> Please log in with this temporary password and change it immediately from your profile page.</p>
                <p>If you did not request this password reset, please contact the administrator immediately.</p>
                <p>Best regards,<br>${settings.company_name || 'L&A Logistics'} Team</p>
              `
            };
            
            await transporter.sendMail(mailOptions);
            res.json({ message: 'Password reset instructions have been sent to your email.' });
          });
      } catch (emailError) {
        console.error('Email error:', emailError);
        res.status(500).json({ message: 'Failed to send reset email. Please contact administrator.' });
      }
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile & Password routes
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  console.log('Profile request for user ID:', userId);
  
  db.get(`SELECT id, name, email, role, employee_id, address, phone, picture, 
          last_active, created_at FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error('Database error in profile:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Profile loaded for user:', user.name);
    res.json(user);
  });
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { name, address, phone, picture } = req.body;
  
  db.run(`UPDATE users SET name = ?, address = ?, phone = ?, picture = ?, 
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, address, phone, picture, userId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      res.json({ message: 'Profile updated successfully' });
    });
});

app.put('/api/change-password', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;
  
  try {
    // Get current user
    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!user || !await bcrypt.compare(currentPassword, user.password)) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, userId], function(err) {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          
          res.json({ message: 'Password changed successfully' });
        });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Settings routes (Admin only)
app.get('/api/settings', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT key, value FROM settings', (err, settings) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    const config = {};
    settings.forEach(setting => {
      // Don't send sensitive data like SMTP password
      if (setting.key === 'smtp_password') {
        config[setting.key] = setting.value ? '***' : '';
      } else {
        config[setting.key] = setting.value;
      }
    });
    
    res.json(config);
  });
});

app.put('/api/settings', authenticateToken, requireAdmin, (req, res) => {
  const settings = req.body;
  
  const updatePromises = Object.entries(settings).map(([key, value]) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [value, key], function(err) {
          if (err) reject(err);
          else resolve();
        });
    });
  });
  
  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Settings updated successfully' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Database error' });
    });
});

// Employee management routes (Admin only)
app.get('/api/admin/employees', authenticateToken, requireAdmin, (req, res) => {
  db.all(`SELECT id, name, email, employee_id, address, phone, picture, 
          last_active, role, created_at FROM users WHERE role = 'employee' 
          ORDER BY created_at DESC`, (err, employees) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(employees);
  });
});

app.put('/api/admin/employees/:id', authenticateToken, requireAdmin, (req, res) => {
  const employeeId = req.params.id;
  const { name, email, employee_id, address, phone, picture } = req.body;
  
  db.run(`UPDATE users SET name = ?, email = ?, employee_id = ?, address = ?, 
          phone = ?, picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'employee'`,
    [name, email, employee_id, address, phone, picture, employeeId], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ message: 'Email or Employee ID already exists' });
        }
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      res.json({ message: 'Employee updated successfully' });
    });
});

// Email routes
app.post('/api/email/send-report', authenticateToken, requireAdmin, async (req, res) => {
  const { to, subject, reportType, dateFilter } = req.body;
  
  try {
    const transporter = await getEmailTransporter();
    const settings = await getSettings();
    
    if (!transporter) {
      return res.status(400).json({ message: 'Email is not configured' });
    }
    
    // Generate report data
    let dateCondition = '';
    const today = new Date();
    
    switch (dateFilter) {
      case 'today':
        dateCondition = `date = '${today.toISOString().split('T')[0]}'`;
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = `date >= '${weekAgo.toISOString().split('T')[0]}'`;
        break;
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        dateCondition = `date >= '${monthAgo.toISOString().split('T')[0]}'`;
        break;
      case 'year':
        const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        dateCondition = `date >= '${yearAgo.toISOString().split('T')[0]}'`;
        break;
      default:
        dateCondition = '1=1';
    }
    
    const query = `SELECT * FROM parcels WHERE ${dateCondition} ORDER BY date DESC`;
    
    db.all(query, async (err, parcels) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      const totalEarnings = parcels.reduce((sum, parcel) => sum + parseFloat(parcel.total_earning), 0);
      const totalParcels = parcels.reduce((sum, parcel) => sum + parcel.quantity, 0);
      
      // Create HTML report
      let htmlContent = `
        <h1>${settings.company_name || 'L&A Logistic Services'}</h1>
        <h2>Parcel Report - ${dateFilter}</h2>
        <h3>Summary</h3>
        <p>Total Parcels: ${totalParcels}</p>
        <p>Total Earnings: ₱${totalEarnings.toFixed(2)}</p>
        
        <h3>Detailed Report</h3>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th>Task ID</th>
              <th>Seller ID</th>
              <th>Courier</th>
              <th>Quantity</th>
              <th>Date</th>
              <th>Picked Up</th>
              <th>Earning</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      parcels.forEach(parcel => {
        htmlContent += `
          <tr>
            <td>${parcel.task_id}</td>
            <td>${parcel.seller_id}</td>
            <td>${parcel.courier}</td>
            <td>${parcel.quantity}</td>
            <td>${parcel.date}</td>
            <td>${parcel.picked_up_same_day ? 'Yes' : 'No'}</td>
            <td>₱${parseFloat(parcel.total_earning).toFixed(2)}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </tbody>
        </table>
      `;
      
      const mailOptions = {
        from: `${settings.smtp_from_name || settings.company_name} <${settings.smtp_from_email}>`,
        to: to,
        subject: subject,
        html: htmlContent
      };
      
      await transporter.sendMail(mailOptions);
      res.json({ message: 'Report sent successfully' });
    });
    
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

app.post('/api/email/send-employee-report', authenticateToken, requireAdmin, async (req, res) => {
  const { to, subject } = req.body;
  
  try {
    const transporter = await getEmailTransporter();
    const settings = await getSettings();
    
    if (!transporter) {
      return res.status(400).json({ message: 'Email is not configured' });
    }
    
    // Get employee data
    db.all(`SELECT id, name, email, employee_id, address, phone, 
            last_active, created_at FROM users WHERE role = 'employee' 
            ORDER BY name`, async (err, employees) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      // Create HTML report
      let htmlContent = `
        <h1>${settings.company_name || 'L&A Logistic Services'}</h1>
        <h2>Employee Report</h2>
        
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Last Active</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      employees.forEach(employee => {
        htmlContent += `
          <tr>
            <td>${employee.employee_id || 'N/A'}</td>
            <td>${employee.name}</td>
            <td>${employee.email}</td>
            <td>${employee.phone || 'N/A'}</td>
            <td>${employee.address || 'N/A'}</td>
            <td>${employee.last_active ? new Date(employee.last_active).toLocaleDateString() : 'Never'}</td>
            <td>${new Date(employee.created_at).toLocaleDateString()}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </tbody>
        </table>
        <p>Total Employees: ${employees.length}</p>
      `;
      
      const mailOptions = {
        from: `${settings.smtp_from_name || settings.company_name} <${settings.smtp_from_email}>`,
        to: to,
        subject: subject,
        html: htmlContent
      };
      
      await transporter.sendMail(mailOptions);
      res.json({ message: 'Employee report sent successfully' });
    });
    
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

// Update last active timestamp
app.post('/api/update-activity', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [userId], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ message: 'Activity updated' });
  });
});

// File upload routes
app.post('/api/upload/logo', authenticateToken, requireAdmin, upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const filename = req.file.filename;
  const logoUrl = `/uploads/${filename}`;
  
  // Update company logo in settings
  db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
    [logoUrl, 'company_logo'], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      res.json({ 
        message: 'Logo uploaded successfully',
        logoUrl: logoUrl
      });
    });
});

app.post('/api/upload/profile', authenticateToken, upload.single('profile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const filename = req.file.filename;
  const profileUrl = `/uploads/${filename}`;
  const userId = req.user.userId;
  
  // Update user profile picture
  db.run('UPDATE users SET picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [profileUrl, userId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      res.json({ 
        message: 'Profile picture uploaded successfully',
        profileUrl: profileUrl
      });
    });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'L&A Logistic Services API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 L&A Logistic Services API`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  if (NODE_ENV === 'development') {
    console.log('\n🔐 Default admin credentials:');
    console.log('   Email: admin@lalogistics.com');
    console.log('   Password: admin123');
    console.log('   ⚠️  Change password in production!\n');
  }
  
  console.log('✅ API is ready!');
  console.log('💖 Made with love by aewon.sebastian\n');
});

module.exports = app;
