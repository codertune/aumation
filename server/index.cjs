require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { initDatabase, DatabaseService, getPool } = require('./database.cjs');
const BulkUploadService = require('./bulkUploadService.cjs');
const { QueueService, setPool } = require('./queueService.cjs');

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

initDatabase()
  .then(() => {
    setPool(getPool());
    console.log('✅ Queue service initialized with database pool');
  })
  .catch(console.error);

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

    console.log('=== Process Automation Request ===');
    console.log('Service ID:', serviceId);
    console.log('User ID:', userId);
    console.log('File:', uploadedFile?.originalname);

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'Service ID is required' });
    }

    const scriptMap = {
      'damco-tracking-maersk': 'automation_scripts/damco_tracking_maersk.py',
      'ctg-port-tracking': 'automation_scripts/ctg_port_tracking.py',
      'pdf-excel-converter': 'automation_scripts/example_automation.py'
    };

    if (!scriptMap[serviceId]) {
      console.error('Service not found in scriptMap:', serviceId);
      console.error('Available services:', Object.keys(scriptMap));
      return res.status(400).json({
        success: false,
        message: `Service '${serviceId}' is not configured. Available services: ${Object.keys(scriptMap).join(', ')}`
      });
    }

    const scriptPath = path.join(__dirname, '..', scriptMap[serviceId]);
    console.log('Script path:', scriptPath);
    console.log('Script exists:', fs.existsSync(scriptPath));

    if (!fs.existsSync(scriptPath)) {
      return res.status(400).json({
        success: false,
        message: `Service script not found at: ${scriptPath}`
      });
    }

    console.log('Starting Python process...');
    console.log('Command: python3', scriptPath, uploadedFile.path);

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

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
    });

    pythonProcess.on('close', async (code) => {
      console.log(`Python process exited with code: ${code}`);
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
          resultFiles: resultFiles,
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
        console.error('Automation failed with error:', errorData);

        await DatabaseService.addWorkHistory(userId, {
          serviceId,
          serviceName: getServiceName(serviceId),
          fileName: uploadedFile.originalname,
          creditsUsed: 0,
          status: 'failed',
          resultFiles: [],
          downloadUrl: null
        });

        res.status(500).json({
          success: false,
          message: 'Automation failed',
          error: errorData || 'Script execution failed',
          details: {
            exitCode: code,
            output: outputData
          }
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
          resultFiles: resultFiles,
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

app.get('/api/templates', async (req, res) => {
  try {
    const templates = await DatabaseService.getServiceTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

app.get('/api/templates/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const template = await DatabaseService.getServiceTemplate(serviceId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    });
  }
});

app.get('/api/templates/:serviceId/download', (req, res) => {
  try {
    const { serviceId } = req.params;
    const filePath = path.join(__dirname, '../public/templates', `${serviceId}-template.csv`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Template file not found'
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download template'
    });
  }
});

app.post('/api/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    const { serviceId, userId } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!serviceId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and User ID are required'
      });
    }

    const template = await DatabaseService.getServiceTemplate(serviceId);
    if (!template) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }

    const rows = await BulkUploadService.parseUploadedFile(uploadedFile.path);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File is empty or invalid format'
      });
    }

    const bulkUpload = await DatabaseService.createBulkUpload(
      userId,
      serviceId,
      template.service_name,
      uploadedFile.originalname,
      rows.length
    );

    for (let i = 0; i < rows.length; i++) {
      await DatabaseService.createBulkUploadItem(
        bulkUpload.id,
        i + 1,
        rows[i]
      );
    }

    res.json({
      success: true,
      message: 'Bulk upload created successfully',
      bulkUpload: {
        id: bulkUpload.id,
        totalRows: rows.length,
        serviceName: template.service_name,
        fileName: uploadedFile.originalname
      }
    });

    setImmediate(() => {
      processBulkUploadAsync(bulkUpload.id, serviceId, userId, rows);
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Bulk upload failed'
    });
  }
});

async function processBulkUploadAsync(bulkUploadId, serviceId, userId, rows) {
  try {
    await DatabaseService.updateBulkUpload(bulkUploadId, { status: 'processing' });

    let successCount = 0;
    let failCount = 0;
    let totalCredits = 0;
    const resultFiles = [];

    const items = await DatabaseService.getBulkUploadItems(bulkUploadId);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowData = typeof item.row_data === 'string' ? JSON.parse(item.row_data) : item.row_data;

      await DatabaseService.updateBulkUploadItem(item.id, { status: 'processing' });

      const result = await BulkUploadService.processRow(
        serviceId,
        rowData,
        item.row_number,
        userId,
        DatabaseService
      );

      if (result.success) {
        const template = await DatabaseService.getServiceTemplate(serviceId);
        const creditsUsed = template.credit_cost || 1;

        const workHistory = await DatabaseService.addWorkHistory(userId, {
          serviceId,
          serviceName: template.service_name,
          fileName: `Row ${item.row_number}`,
          creditsUsed,
          status: 'completed',
          resultFiles: result.resultFiles || [],
          downloadUrl: result.resultFiles && result.resultFiles[0]
            ? `/api/download/${result.resultFiles[0]}`
            : null
        });

        await DatabaseService.updateBulkUploadItem(item.id, {
          status: 'completed',
          workHistoryId: workHistory.id,
          creditsUsed,
          resultFilePath: result.resultFiles && result.resultFiles[0] || null,
          processedAt: new Date()
        });

        await DatabaseService.updateCredits(userId, creditsUsed, 'subtract');

        successCount++;
        totalCredits += creditsUsed;

        if (result.resultFiles && result.resultFiles.length > 0) {
          resultFiles.push(...result.resultFiles.map(f => ({
            path: path.join(__dirname, '../results/pdfs', f),
            name: f
          })));
        }
      } else {
        await DatabaseService.updateBulkUploadItem(item.id, {
          status: 'failed',
          errorMessage: result.error,
          creditsUsed: 0,
          processedAt: new Date()
        });
        failCount++;
      }

      await DatabaseService.updateBulkUpload(bulkUploadId, {
        processedRows: i + 1,
        successfulRows: successCount,
        failedRows: failCount,
        creditsUsed: totalCredits
      });
    }

    let zipPath = null;
    if (resultFiles.length > 0) {
      const zipFileName = `bulk_${bulkUploadId}_results.zip`;
      zipPath = path.join(__dirname, '../results', zipFileName);
      await BulkUploadService.createResultZip(resultFiles, zipPath);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await DatabaseService.updateBulkUpload(bulkUploadId, {
      status: 'completed',
      successfulRows: successCount,
      failedRows: failCount,
      creditsUsed: totalCredits,
      resultZipPath: zipPath ? `results/${path.basename(zipPath)}` : null,
      expiresAt,
      completedAt: new Date()
    });

    console.log(`Bulk upload ${bulkUploadId} completed: ${successCount} success, ${failCount} failed`);

  } catch (error) {
    console.error(`Error processing bulk upload ${bulkUploadId}:`, error);
    await DatabaseService.updateBulkUpload(bulkUploadId, {
      status: 'failed',
      errorMessage: error.message
    });
  }
}

app.get('/api/bulk-uploads/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bulkUploads = await DatabaseService.getBulkUploads(userId);

    const uploadsWithExpiration = bulkUploads.map(upload => ({
      ...upload,
      daysUntilExpiration: BulkUploadService.getDaysUntilExpiration(upload.expires_at),
      expirationStatus: BulkUploadService.getExpirationStatus(upload.expires_at)
    }));

    res.json({
      success: true,
      bulkUploads: uploadsWithExpiration
    });
  } catch (error) {
    console.error('Get bulk uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk uploads'
    });
  }
});

app.get('/api/bulk-uploads/:bulkUploadId/details', async (req, res) => {
  try {
    const { bulkUploadId } = req.params;
    const bulkUpload = await DatabaseService.getBulkUpload(bulkUploadId);

    if (!bulkUpload) {
      return res.status(404).json({
        success: false,
        message: 'Bulk upload not found'
      });
    }

    const items = await DatabaseService.getBulkUploadItems(bulkUploadId);

    res.json({
      success: true,
      bulkUpload: {
        ...bulkUpload,
        daysUntilExpiration: BulkUploadService.getDaysUntilExpiration(bulkUpload.expires_at),
        expirationStatus: BulkUploadService.getExpirationStatus(bulkUpload.expires_at)
      },
      items
    });
  } catch (error) {
    console.error('Get bulk upload details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk upload details'
    });
  }
});

app.get('/api/bulk-uploads/:bulkUploadId/download', async (req, res) => {
  try {
    const { bulkUploadId } = req.params;
    const bulkUpload = await DatabaseService.getBulkUpload(bulkUploadId);

    if (!bulkUpload) {
      return res.status(404).json({
        success: false,
        message: 'Bulk upload not found'
      });
    }

    if (!bulkUpload.result_zip_path) {
      return res.status(404).json({
        success: false,
        message: 'No results available for download'
      });
    }

    const zipPath = path.join(__dirname, '..', bulkUpload.result_zip_path);

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        message: 'Result file not found or has expired'
      });
    }

    res.download(zipPath);
  } catch (error) {
    console.error('Download bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download results'
    });
  }
});

app.post('/api/cleanup/run', async (req, res) => {
  try {
    const result = await BulkUploadService.cleanupExpiredFiles(DatabaseService);
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      result
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

app.get('/api/cleanup/logs', async (req, res) => {
  try {
    const logs = await DatabaseService.getCleanupLogs(50);
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get cleanup logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cleanup logs'
    });
  }
});

app.post('/api/queue/submit', upload.single('file'), async (req, res) => {
  try {
    const { serviceId, userId } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'Service ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const serviceNames = {
      'damco-tracking-maersk': 'Damco Tracking (Maersk)',
      'ctg-port-tracking': 'CTG Port Tracking',
      'pdf-excel-converter': 'PDF to Excel Converter'
    };

    const serviceName = serviceNames[serviceId] || serviceId;
    const creditsRequired = getServiceCredits(serviceId);

    const result = await QueueService.addJobToQueue(
      userId,
      serviceId,
      serviceName,
      uploadedFile.path,
      uploadedFile.originalname,
      creditsRequired,
      0
    );

    if (result.success) {
      const queueInfo = await QueueService.getQueueInfo();

      res.json({
        success: true,
        message: 'Job added to queue successfully',
        jobId: result.job.id,
        queuePosition: result.job.queue_position,
        queueLength: queueInfo.pendingJobs,
        estimatedWaitTime: queueInfo.estimatedWaitTimeSeconds
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add job to queue',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Queue submit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/queue/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.query;

    const result = await QueueService.getJobStatus(jobId, userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/queue/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const result = await QueueService.getUserJobs(userId, limit ? parseInt(limit) : 50);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get user jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/queue/cancel/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const result = await QueueService.cancelJob(jobId, userId);

    if (result.success) {
      res.json({ success: true, message: 'Job cancelled successfully' });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/queue/info', async (req, res) => {
  try {
    const result = await QueueService.getQueueInfo();
    res.json(result);
  } catch (error) {
    console.error('Queue info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/queue/results/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const result = await QueueService.getJobResults(jobId, userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get job results error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/queue/all', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      userId: req.query.userId,
      serviceId: req.query.serviceId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const result = await QueueService.getAllJobs(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/workers', async (req, res) => {
  try {
    const result = await QueueService.getWorkerStatus();

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/queue/cleanup', async (req, res) => {
  try {
    const result = await QueueService.cleanupExpiredJobs();

    if (result.success) {
      res.json({
        success: true,
        message: 'Cleanup completed successfully',
        ...result
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Queue cleanup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;