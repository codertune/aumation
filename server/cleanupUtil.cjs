const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = util.promisify(exec);

class CleanupUtil {
  static async killOrphanedChromeProcesses() {
    try {
      console.log('🧹 Checking for orphaned Chrome processes...');

      try {
        const { stdout } = await execPromise('pgrep -f "chrome.*--headless"');
        const pids = stdout.trim().split('\n').filter(pid => pid);

        if (pids.length > 0) {
          console.log(`⚠️ Found ${pids.length} orphaned Chrome processes`);

          for (const pid of pids) {
            try {
              await execPromise(`kill -9 ${pid}`);
              console.log(`   ✅ Killed Chrome process ${pid}`);
            } catch (e) {
              console.log(`   ⚠️ Process ${pid} already terminated`);
            }
          }

          return {
            success: true,
            processesKilled: pids.length
          };
        } else {
          console.log('✅ No orphaned Chrome processes found');
          return {
            success: true,
            processesKilled: 0
          };
        }
      } catch (error) {
        console.log('✅ No Chrome processes running');
        return {
          success: true,
          processesKilled: 0
        };
      }
    } catch (error) {
      console.error('Error killing Chrome processes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async cleanupTempChromeDirectories() {
    try {
      console.log('🧹 Cleaning up temporary Chrome directories...');

      const tmpDir = '/tmp';
      let directoriesRemoved = 0;
      let spaceFreed = 0;

      if (fs.existsSync(tmpDir)) {
        const entries = fs.readdirSync(tmpDir);

        for (const entry of entries) {
          if (entry.startsWith('chrome_user_data_')) {
            const dirPath = path.join(tmpDir, entry);

            try {
              const stats = fs.statSync(dirPath);
              if (stats.isDirectory()) {
                const size = await this.getDirectorySize(dirPath);
                spaceFreed += size;

                fs.rmSync(dirPath, { recursive: true, force: true });
                directoriesRemoved++;
                console.log(`   ✅ Removed ${entry} (${(size / 1024 / 1024).toFixed(2)} MB)`);
              }
            } catch (e) {
              console.log(`   ⚠️ Could not remove ${entry}: ${e.message}`);
            }
          }
        }
      }

      console.log(`✅ Cleanup complete: ${directoriesRemoved} directories removed, ${(spaceFreed / 1024 / 1024).toFixed(2)} MB freed`);

      return {
        success: true,
        directoriesRemoved,
        spaceFreedMb: (spaceFreed / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('Error cleaning up Chrome directories:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          try {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          } catch (e) {

          }
        }
      }
    } catch (e) {

    }

    return totalSize;
  }

  static async cleanupOldTempFiles(daysOld = 1) {
    try {
      console.log(`🧹 Cleaning up temp files older than ${daysOld} days...`);

      const uploadsDir = path.join(__dirname, '../uploads');
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let filesRemoved = 0;
      let spaceFreed = 0;

      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);

        for (const file of files) {
          const filePath = path.join(uploadsDir, file);

          try {
            const stats = fs.statSync(filePath);

            if (stats.isFile() && stats.mtimeMs < cutoffTime) {
              spaceFreed += stats.size;
              fs.unlinkSync(filePath);
              filesRemoved++;
              console.log(`   ✅ Removed old temp file: ${file}`);
            }
          } catch (e) {
            console.log(`   ⚠️ Could not process ${file}: ${e.message}`);
          }
        }
      }

      console.log(`✅ Temp file cleanup complete: ${filesRemoved} files removed, ${(spaceFreed / 1024 / 1024).toFixed(2)} MB freed`);

      return {
        success: true,
        filesRemoved,
        spaceFreedMb: (spaceFreed / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async performFullCleanup() {
    console.log('\n' + '='.repeat(60));
    console.log('🧹 Starting Full System Cleanup');
    console.log('='.repeat(60) + '\n');

    const results = {
      chromeProcesses: await this.killOrphanedChromeProcesses(),
      chromeDirectories: await this.cleanupTempChromeDirectories(),
      tempFiles: await this.cleanupOldTempFiles()
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`Chrome Processes Killed: ${results.chromeProcesses.processesKilled || 0}`);
    console.log(`Chrome Directories Removed: ${results.chromeDirectories.directoriesRemoved || 0}`);
    console.log(`Temp Files Removed: ${results.tempFiles.filesRemoved || 0}`);
    console.log(`Total Space Freed: ${
      (
        parseFloat(results.chromeDirectories.spaceFreedMb || 0) +
        parseFloat(results.tempFiles.spaceFreedMb || 0)
      ).toFixed(2)
    } MB`);
    console.log('='.repeat(60) + '\n');

    return results;
  }
}

if (require.main === module) {
  CleanupUtil.performFullCleanup()
    .then(() => {
      console.log('✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = CleanupUtil;
