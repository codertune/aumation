const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const DatabaseService = require('./database.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

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

DatabaseService.initDatabase().catch(console.error);

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