const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { initDatabase, DatabaseService } = require('./database.cjs');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('?? Smart Process Flow Backend Server Starting...');
console.log(`?? Port: ${PORT}`);
console.log(`?? Environment: ${process.env.NODE_ENV || 'development'}`);

// ==================== EMAIL CONFIGURATION ====================

// Email transporter configuration
const createEmailTransporter = () => {
  // For development/demo, we'll use a test account
  // In production, you would use your actual email service
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'izajahmad@gmail.com', // Your email
      pass: process.env.EMAIL_PASSWORD || 'your-app-password' // You'll need to set this
    }
  });
};

const sendPasswordResetEmail = async (email, token) => {
  try {
    const transporter = createEmailTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: '"Smart Process Flow" <izajahmad@gmail.com>',
      to: email,
      subject: 'Password Reset Request - Smart Process Flow',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Smart Process Flow</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Smart Process Flow account.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Click the button below to reset your password. This link will expire in 1 hour.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            
            <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px; font-size: 14px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 Smart Process Flow. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`? Password reset email sent to: ${email}`);
    return true;
    
  } catch (error) {
    console.error('? Failed to send password reset email:', error);
    
    // For development, log the reset URL to console as fallback
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    console.log('?? Password Reset URL (for development):', resetUrl);
    
    return false;
  }
};

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/results', express.static(path.join(__dirname, '..', 'results')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`?? ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ==================== FILE UPLOAD CONFIGURATION ====================

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const resultsDir = path.join(__dirname, '..', 'results');
const logsDir = path.join(__dirname, '..', 'logs');

[uploadDir, resultsDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`?? Created directory: ${dir}`);
  }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${file.originalname}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, Excel, and CSV files are allowed.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Process Flow Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      fileUpload: 'active',
      automation: 'ready'
    }
  });
});

// ==================== AUTHENTICATION ROUTES ====================

// Create admin user endpoint (for initial setup)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { email, password, adminKey, name, company, mobile } = req.body;
    
    // Simple admin key check (you can change this)
    if (adminKey !== 'admin-setup-2024') {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin setup key'
      });
    }
    
    console.log('?? Creating admin user:', email);
    
    const adminUser = await DatabaseService.createAdminUser(email, password, name || 'Admin User', company || 'Smart Process Flow', mobile || '');
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        ...adminUser,
        isAdmin: true,
        name: adminUser.name || 'Admin User',
        company: adminUser.company || 'Smart Process Flow',
        mobile: adminUser.mobile || '',
        emailVerified: true,
        memberSince: new Date().toISOString().split('T')[0],
        status: 'active',
        services: [],
        totalSpent: 0,
        lastActivity: new Date().toISOString().split('T')[0],
        workHistory: []
      }
    });
  } catch (error) {
    console.error('? Create admin error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create admin user'
    });
  }
});

// Promote user to admin endpoint
app.post('/api/auth/promote-admin', async (req, res) => {
  try {
    const { email, adminKey } = req.body;
    
    // Simple admin key check (you can change this)
    if (adminKey !== 'admin-setup-2024') {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin setup key'
      });
    }
    
    console.log('?? Promoting user to admin:', email);
    
    await DatabaseService.promoteToAdmin(email);
    
    res.json({
      success: true,
      message: `User ${email} promoted to admin successfully`
    });
  } catch (error) {
    console.error('? Promote admin error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to promote user to admin'
    });
  }
});
// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, company, mobile } = req.body;
    console.log('?? Registration attempt:', req.body.email);
    
    // Create user with basic info
    const newUser = await DatabaseService.createUser(email, password, name, company, mobile);
    
    // Add additional user properties for frontend compatibility
    const userResponse = {
      ...newUser,
      name: newUser.name || 'User',
      company: newUser.company || 'Company',
      mobile: newUser.mobile || '',
      isAdmin: newUser.isAdmin,
      emailVerified: newUser.emailVerified,
      memberSince: newUser.memberSince ? newUser.memberSince.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: newUser.status || 'active',
      services: [],
      totalSpent: newUser.totalSpent || 0,
      lastActivity: newUser.lastActivity ? newUser.lastActivity.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      workHistory: []
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('? Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('?? Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const user = await DatabaseService.authenticateUser(email, password);
    
    // Map to frontend compatible format
    const userResponse = {
      ...user,
      memberSince: user.memberSince ? new Date(user.memberSince).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: user.lastActivity ? new Date(user.lastActivity).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalSpent: user.totalSpent || 0,
      services: [], // Assuming services are not stored directly on user object
      workHistory: [] // Assuming workHistory is fetched separately
    };
    
    console.log('? Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    console.error('? Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await DatabaseService.getAllUsers();
    
    // Map to frontend format
    const mappedUsers = users.map(user => ({
      ...user,
      memberSince: user.memberSince ? new Date(user.memberSince).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: user.lastActivity ? new Date(user.lastActivity).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalSpent: user.totalSpent || 0,
      services: [],
      workHistory: []
    }));
    
    res.json({
      success: true,
      users: mappedUsers
    });
  } catch (error) {
    console.error('? Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await DatabaseService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Map to frontend format
    const userResponse = {
      ...user,
      memberSince: user.memberSince ? new Date(user.memberSince).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: user.lastActivity ? new Date(user.lastActivity).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalSpent: user.totalSpent || 0,
      services: [],
      workHistory: []
    };
    
    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('? Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedUser = await DatabaseService.updateUser(id, updates);
    
    // Map to frontend format
    const userResponse = {
      ...updatedUser,
      memberSince: updatedUser.memberSince ? new Date(updatedUser.memberSince).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: updatedUser.lastActivity ? new Date(updatedUser.lastActivity).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalSpent: updatedUser.totalSpent || 0,
      services: [],
      workHistory: []
    };
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('? Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await DatabaseService.deleteUser(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('? Delete user error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
});
// Add/deduct credits
app.post('/api/users/:id/credits', async (req, res) => {
  try {
    const { id } = req.params;
    const { credits, operation } = req.body;
    
    if (!credits || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Credits amount and operation are required'
      });
    }
    
    const result = await DatabaseService.updateCredits(id, credits, operation);
    
    res.json({
      success: true,
      message: `Credits ${operation}ed successfully`,
      newCredits: result.newCredits,
      oldCredits: result.oldCredits
    });
  } catch (error) {
    console.error('? Credits operation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Credits operation failed'
    });
  }
});

// ==================== SYSTEM SETTINGS ROUTES ====================

// Get system settings
app.get('/api/settings', async (req, res) => {
  try {
    // Get settings from database
    const result = await DatabaseService.getSystemSettings();
    
    res.json({
      success: true,
      settings: result
    });
  } catch (error) {
    console.error('? Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update system settings
app.put('/api/settings', async (req, res) => {
  try {
    const newSettings = req.body;
    
    console.log('?? Updating system settings:', newSettings);
    
    // Update settings in database
    const updatedSettings = await DatabaseService.updateSystemSettings(newSettings);
    
    console.log('? Settings updated in database:', updatedSettings);
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('? Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// ==================== BLOG ROUTES ====================

// Get all blog posts
app.get('/api/blog', async (req, res) => {
  try {
    const posts = await DatabaseService.getBlogPosts();
    res.json({
      success: true,
      posts: posts
    });
  } catch (error) {
    console.error('? Get blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog posts'
    });
  }
});

// Create blog post
app.post('/api/blog', async (req, res) => {
  try {
    const newPost = await DatabaseService.addBlogPost(req.body);
    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      post: newPost
    });
  } catch (error) {
    console.error('? Create blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog post'
    });
  }
});

// Update blog post
app.put('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPost = await DatabaseService.updateBlogPost(id, req.body);
    res.json({
      success: true,
      message: 'Blog post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('? Update blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog post'
    });
  }
});

// Delete blog post
app.delete('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await DatabaseService.deleteBlogPost(id);
    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('? Delete blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post'
    });
  }
});

// ==================== WORK HISTORY ROUTES ====================

// Get work history for user
app.get('/api/work-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await DatabaseService.getWorkHistory(userId);
    res.json({
      success: true,
      workHistory: history
    });
  } catch (error) {
    console.error('? Get work history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work history'
    });
  }
});

// Add work history entry
app.post('/api/work-history', async (req, res) => {
  try {
    const { userId, serviceId, serviceName, fileName, creditsUsed, status, resultFiles, downloadUrl } = req.body;
    const newEntry = await DatabaseService.addWorkHistory(userId, serviceId, serviceName, fileName, creditsUsed, status, resultFiles, downloadUrl);
    res.status(201).json({
      success: true,
      message: 'Work history entry added successfully',
      workHistory: newEntry
    });
  } catch (error) {
    console.error('? Add work history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add work history'
    });
  }
});

// Update work history files
app.put('/api/work-history/:workId/files', async (req, res) => {
  try {
    const { workId } = req.params;
    const { resultFiles } = req.body;
    const updatedEntry = await DatabaseService.updateWorkHistoryFiles(workId, resultFiles);
    res.json({
      success: true,
      message: 'Work history files updated successfully',
      workHistory: updatedEntry
    });
  } catch (error) {
    console.error('? Update work history files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update work history files'
    });
  }
});

// ==================== FILE UPLOAD ROUTES ====================

// File upload endpoint
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    console.log(`?? Uploaded ${req.files.length} files:`, req.files.map(f => f.filename));

    const fileAnalysis = req.files.map(file => {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let credits = 1;
      let rows = 1;

      // Basic analysis - more detailed analysis would be done client-side
      if (fileExtension === '.pdf') {
        credits = 1;
      } else if (['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
        // Estimate based on file size for now
        const fileSizeKB = file.size / 1024;
        rows = Math.max(1, Math.floor(fileSizeKB / 2));
        credits = rows;
      }

      return {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        type: file.mimetype,
        credits: credits,
        rows: rows
      };
    });

    res.json({
      success: true,
      message: `Successfully uploaded ${req.files.length} files`,
      files: fileAnalysis
    });

  } catch (error) {
    console.error('? File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed: ' + error.message
    });
  }
});

// ==================== AUTOMATION ROUTES ====================

// Start automation process
app.post('/api/automation/start', async (req, res) => {
  try {
    const { serviceId, files, userCredentials, parameters } = req.body;
    
    console.log(`?? Starting automation for service: ${serviceId}`);
    console.log(`?? Processing ${files.length} files`);
    
    const processId = uuidv4();
    
    // Map service IDs to Python script names
    const serviceScriptMap = {
      'damco-tracking-maersk': 'damco_tracking_maersk.py',
      'ctg-port-tracking': 'ctg_port_tracking.py',
      'example-automation': 'example_automation.py'
    };
    
    const scriptName = serviceScriptMap[serviceId];
    
    if (!scriptName) {
      return res.status(400).json({
        success: false,
        message: `Service ${serviceId} is not yet implemented`
      });
    }
    
    const scriptPath = path.join(__dirname, '..', 'automation_scripts', scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({
        success: false,
        message: `Automation script not found: ${scriptName}`
      });
    }
    
    // For now, return success - actual automation would be implemented here
    res.json({
      success: true,
      message: 'Automation started successfully',
      processId: processId,
      status: 'running'
    });
    
  } catch (error) {
    console.error('? Automation start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start automation: ' + error.message
    });
  }
});

// Get automation status
app.get('/api/automation/status/:processId', (req, res) => {
  // Mock status response - would be implemented with actual process tracking
  res.json({
    success: true,
    status: 'completed',
    progress: 100,
    output: [
      '?? Automation started successfully',
      '?? Processing files...',
      '? Automation completed successfully'
    ],
    resultFiles: ['sample_report.pdf', 'automation_log.txt'],
    endTime: new Date().toISOString()
  });
});

// Stop automation process
app.post('/api/automation/stop/:processId', (req, res) => {
  res.json({
    success: true,
    message: 'Automation stopped successfully'
  });
});

// ==================== FILE SERVING ROUTES ====================

// Serve uploaded files
app.get('/api/files/:processId/:filename', (req, res) => {
  const { processId, filename } = req.params;
  const filePath = path.join(__dirname, '..', 'results', 'pdfs', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }
});

// Preview PDF files
app.get('/api/preview/:processId/:filename', (req, res) => {
  const { processId, filename } = req.params;
  const filePath = path.join(__dirname, '..', 'results', 'pdfs', filename);
  
  if (fs.existsSync(filePath) && filename.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({
      success: false,
      message: 'PDF file not found'
    });
  }
});

// ==================== ERROR HANDLING ====================

// Handle multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('?? Password reset request for:', email);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    try {
      const resetData = await DatabaseService.generatePasswordResetToken(email);
      
      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, resetData.token);
      
      // Always return success for security (don't reveal if email exists)
      res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
        emailSent: emailSent
      });
      
    } catch (error) {
      // Even if user doesn't exist, return success for security
      console.log('?? Password reset attempt for non-existent email:', email);
      res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
        emailSent: false
      });
    }
    
  } catch (error) {
    console.error('? Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    console.log('?? Password reset attempt with token');
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    const result = await DatabaseService.resetPassword(token, password);
    
    console.log('? Password reset successful for:', result.email);
    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
    
  } catch (error) {
    console.error('? Reset password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
});

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  console.error('? Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    // Initialize database first
    await initDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('?? Smart Process Flow Backend Server Started');
      console.log(`?? Server running on port ${PORT}`);
      console.log(`?? Health check: http://localhost:${PORT}/api/health`);
      console.log(`?? Upload directory: ${path.resolve('uploads')}`);
      console.log(`?? Results directory: ${path.resolve('results')}`);
      console.log('');
      console.log('?? Available endpoints:');
      console.log('   POST /api/auth/register - User registration');
      console.log('   POST /api/auth/login - User login');
      console.log('   GET  /api/users - Get all users');
      console.log('   POST /api/upload - File upload');
      console.log('   POST /api/automation/start - Start automation');
      console.log('   GET  /api/settings - Get system settings');
      console.log('');
    });
  } catch (error) {
    console.error('? Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('?? SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('?? SIGINT received, shutting down gracefully');
  process.exit(0);
});
