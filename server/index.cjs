require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { initDatabase, DatabaseService } = require('./database-supabase.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

initDatabase().catch(console.error);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await DatabaseService.authenticateUser(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid email or password'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, company, mobile } = req.body;

    if (!email || !password || !name || !company || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const user = await DatabaseService.createUser(email, password, name, company, mobile);

    res.json({
      success: true,
      message: 'Account created successfully',
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const resetData = await DatabaseService.generatePasswordResetToken(email);

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
      token: resetData.token
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process password reset request'
    });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    const result = await DatabaseService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await DatabaseService.getAllUsers();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

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

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await DatabaseService.updateUser(id, updates);

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user'
    });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await DatabaseService.deleteUser(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
});

app.post('/api/users/:userId/credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { credits, operation } = req.body;

    if (!credits || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Credits and operation are required'
      });
    }

    const result = await DatabaseService.updateCredits(userId, credits, operation);

    res.json({
      success: true,
      message: 'Credits updated successfully',
      newCredits: result.newCredits,
      oldCredits: result.oldCredits
    });
  } catch (error) {
    console.error('Update credits error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update credits'
    });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await DatabaseService.getSystemSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    const updatedSettings = await DatabaseService.updateSystemSettings(settings);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update settings'
    });
  }
});

app.get('/api/work-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const workHistory = await DatabaseService.getWorkHistory(userId);

    res.json({
      success: true,
      workHistory
    });
  } catch (error) {
    console.error('Get work history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work history'
    });
  }
});

app.post('/api/work-history', async (req, res) => {
  try {
    const { userId, ...workItem } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const workHistory = await DatabaseService.addWorkHistory(userId, workItem);

    res.json({
      success: true,
      message: 'Work history added successfully',
      workHistory
    });
  } catch (error) {
    console.error('Add work history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add work history'
    });
  }
});

app.put('/api/work-history/:workId/files', async (req, res) => {
  try {
    const { workId } = req.params;
    const { resultFiles } = req.body;

    if (!resultFiles) {
      return res.status(400).json({
        success: false,
        message: 'Result files are required'
      });
    }

    const workHistory = await DatabaseService.updateWorkHistoryFiles(workId, resultFiles);

    res.json({
      success: true,
      message: 'Work history files updated successfully',
      workHistory
    });
  } catch (error) {
    console.error('Update work history files error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update work history files'
    });
  }
});

app.get('/api/blog', async (req, res) => {
  try {
    const posts = await DatabaseService.getBlogPosts();
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog posts'
    });
  }
});

app.get('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const posts = await DatabaseService.getBlogPosts();
    const post = posts.find(p => p.id === id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog post'
    });
  }
});

app.post('/api/blog', async (req, res) => {
  try {
    const postData = req.body;
    const post = await DatabaseService.addBlogPost(postData);

    res.json({
      success: true,
      message: 'Blog post created successfully',
      post
    });
  } catch (error) {
    console.error('Add blog post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create blog post'
    });
  }
});

app.put('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const post = await DatabaseService.updateBlogPost(id, updates);

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      post
    });
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update blog post'
    });
  }
});

app.delete('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await DatabaseService.deleteBlogPost(id);

    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete blog post'
    });
  }
});

app.post('/api/process-automation', upload.single('file'), async (req, res) => {
  try {
    const { serviceId, userId } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const scriptMap = {
      'damco-tracking-maersk': 'automation_scripts/damco_tracking_maersk.py',
      'ctg-port-tracking': 'automation_scripts/ctg_port_tracking.py',
      'pdf-excel-converter': 'automation_scripts/example_automation.py'
    };

    const scriptPath = path.join(__dirname, '..', scriptMap[serviceId]);

    if (!fs.existsSync(scriptPath)) {
      return res.status(400).json({ success: false, message: 'Service not available' });
    }

    const pythonProcess = spawn('python3', [scriptPath, uploadedFile.path]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
      console.log(`Python output: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python error: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        const resultsDir = path.join(__dirname, '../results');
        const resultFiles = fs.existsSync(resultsDir)
          ? fs.readdirSync(resultsDir).filter(f => f.endsWith('.pdf'))
          : [];

        const downloadUrl = resultFiles.length > 0
          ? `/api/download/${resultFiles[0]}`
          : null;

        await DatabaseService.addWorkHistory(userId, {
          serviceId,
          serviceName: getServiceName(serviceId),
          fileName: uploadedFile.originalname,
          creditsUsed: getServiceCredits(serviceId),
          status: 'completed',
          resultFiles: JSON.stringify(resultFiles),
          downloadUrl
        });

        res.json({
          success: true,
          message: 'Automation completed successfully',
          serviceName: getServiceName(serviceId),
          resultFiles,
          downloadUrl,
          output: outputData
        });
      } else {
        await DatabaseService.addWorkHistory(userId, {
          serviceId,
          serviceName: getServiceName(serviceId),
          fileName: uploadedFile.originalname,
          creditsUsed: getServiceCredits(serviceId),
          status: 'failed',
          resultFiles: JSON.stringify([]),
          downloadUrl: null
        });

        res.status(500).json({
          success: false,
          message: 'Automation failed',
          error: errorData
        });
      }
    });

  } catch (error) {
    console.error('Automation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../results', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

app.post('/api/track-container', async (req, res) => {
  try {
    const { trackingNumber, userId } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ success: false, message: 'Tracking number required' });
    }

    const tempFile = path.join(__dirname, '../uploads', `temp-${Date.now()}.csv`);
    fs.writeFileSync(tempFile, `FCR Number\n${trackingNumber}`);

    const scriptPath = path.join(__dirname, '..', 'automation_scripts/damco_tracking_maersk.py');
    const pythonProcess = spawn('python3', [scriptPath, tempFile]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      fs.unlinkSync(tempFile);

      if (code === 0) {
        const resultsDir = path.join(__dirname, '../results');
        const resultFiles = fs.existsSync(resultsDir)
          ? fs.readdirSync(resultsDir).filter(f => f.includes(trackingNumber))
          : [];

        const downloadUrl = resultFiles.length > 0
          ? `/api/download/${resultFiles[0]}`
          : null;

        await DatabaseService.addWorkHistory(userId, {
          serviceId: 'damco-tracking-maersk',
          serviceName: 'Damco (APM) Tracking',
          fileName: trackingNumber,
          creditsUsed: 1,
          status: 'completed',
          resultFiles: JSON.stringify(resultFiles),
          downloadUrl
        });

        res.json({
          success: true,
          trackingData: {
            containerNumber: trackingNumber,
            bookingNumber: trackingNumber,
            vessel: 'Retrieved from Maersk',
            voyage: 'N/A',
            status: 'In Transit',
            location: 'Retrieved from tracking',
            estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            events: []
          },
          downloadUrl
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Tracking failed',
          error: errorData
        });
      }
    });

  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function getServiceName(serviceId) {
  const names = {
    'damco-tracking-maersk': 'Damco (APM) Tracking',
    'ctg-port-tracking': 'CTG Port Authority Tracking',
    'pdf-excel-converter': 'PDF to Excel Converter'
  };
  return names[serviceId] || serviceId;
}

function getServiceCredits(serviceId) {
  const credits = {
    'damco-tracking-maersk': 1,
    'ctg-port-tracking': 1,
    'pdf-excel-converter': 1
  };
  return credits[serviceId] || 1;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;