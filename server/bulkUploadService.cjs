const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');

class BulkUploadService {
  static async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', (error) => reject(error));
    });
  }

  static async parseExcelFile(filePath) {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  static async parseUploadedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      return await this.parseCSVFile(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return await this.parseExcelFile(filePath);
    } else {
      throw new Error('Unsupported file type. Please upload CSV or Excel file.');
    }
  }

  static async processRow(serviceId, rowData, rowNumber, userId, DatabaseService) {
    try {
      const scriptMap = {
        'damco-tracking-maersk': 'automation_scripts/damco_tracking_maersk.py',
        'ctg-port-tracking': 'automation_scripts/ctg_port_tracking.py'
      };

      const scriptPath = scriptMap[serviceId];
      if (!scriptPath) {
        throw new Error(`No automation script found for service: ${serviceId}`);
      }

      const fullScriptPath = path.join(__dirname, '..', scriptPath);

      if (!fs.existsSync(fullScriptPath)) {
        throw new Error(`Automation script not found: ${scriptPath}`);
      }

      const tempFile = path.join(
        __dirname,
        '../uploads/temp',
        `bulk_row_${userId}_${Date.now()}_${rowNumber}.csv`
      );

      fs.mkdirSync(path.dirname(tempFile), { recursive: true });

      const headers = Object.keys(rowData);
      const values = Object.values(rowData);
      const csvContent = `${headers.join(',')}\n${values.join(',')}`;
      fs.writeFileSync(tempFile, csvContent);

      const result = await this.runAutomationScript(fullScriptPath, tempFile, rowData);

      fs.unlinkSync(tempFile);

      return result;
    } catch (error) {
      console.error(`Error processing row ${rowNumber}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async runAutomationScript(scriptPath, inputFile, rowData) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, inputFile]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          const resultsDir = path.join(__dirname, '../results/pdfs');
          const resultFiles = fs.existsSync(resultsDir)
            ? fs.readdirSync(resultsDir)
                .filter(f => f.includes(Date.now().toString().substring(0, 8)))
                .sort((a, b) => {
                  const statA = fs.statSync(path.join(resultsDir, a));
                  const statB = fs.statSync(path.join(resultsDir, b));
                  return statB.mtimeMs - statA.mtimeMs;
                })
            : [];

          resolve({
            success: true,
            resultFiles: resultFiles.slice(0, 1),
            output: outputData
          });
        } else {
          resolve({
            success: false,
            error: errorData || 'Script execution failed'
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  static async createResultZip(files, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => {
        resolve({
          success: true,
          size: archive.pointer(),
          filePath: outputPath
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          archive.file(file.path, { name: file.name });
        }
      });

      archive.finalize();
    });
  }

  static async cleanupExpiredFiles(DatabaseService) {
    try {
      const expiredWorkHistory = await DatabaseService.getExpiredWorkHistory();
      const expiredBulkUploads = await DatabaseService.getExpiredBulkUploads();

      let filesDeleted = 0;
      let spaceFreed = 0;
      const workHistoryIds = [];
      const bulkUploadIds = [];

      for (const work of expiredWorkHistory) {
        if (work.result_files) {
          const files = typeof work.result_files === 'string'
            ? JSON.parse(work.result_files)
            : work.result_files;
          for (const file of files) {
            // Try both results/ and results/pdfs/ directories
            const possiblePaths = [
              path.join(__dirname, '../results', file),
              path.join(__dirname, '../results/pdfs', file)
            ];

            for (const filePath of possiblePaths) {
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                spaceFreed += stats.size;
                fs.unlinkSync(filePath);
                filesDeleted++;
                console.log(`Deleted expired file: ${filePath}`);
              }
            }
          }
        }
        workHistoryIds.push(work.id);
      }

      for (const bulk of expiredBulkUploads) {
        if (bulk.result_zip_path) {
          const zipPath = path.join(__dirname, '..', bulk.result_zip_path);
          if (fs.existsSync(zipPath)) {
            const stats = fs.statSync(zipPath);
            spaceFreed += stats.size;
            fs.unlinkSync(zipPath);
            filesDeleted++;
          }
        }
        bulkUploadIds.push(bulk.id);
      }

      await DatabaseService.logCleanup({
        filesDeleted,
        spaceFreedMb: (spaceFreed / (1024 * 1024)).toFixed(2),
        workHistoryIds: JSON.stringify(workHistoryIds),
        bulkUploadIds: JSON.stringify(bulkUploadIds),
        status: 'success'
      });

      return {
        filesDeleted,
        spaceFreedMb: (spaceFreed / (1024 * 1024)).toFixed(2),
        workHistoryCount: expiredWorkHistory.length,
        bulkUploadCount: expiredBulkUploads.length
      };
    } catch (error) {
      await DatabaseService.logCleanup({
        filesDeleted: 0,
        spaceFreedMb: 0,
        workHistoryIds: JSON.stringify([]),
        bulkUploadIds: JSON.stringify([]),
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  static getDaysUntilExpiration(expiresAt) {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  static getExpirationStatus(expiresAt) {
    const days = this.getDaysUntilExpiration(expiresAt);
    if (days === null) return null;
    if (days < 0) return 'expired';
    if (days <= 2) return 'expiring-soon';
    return 'active';
  }
}

module.exports = BulkUploadService;
