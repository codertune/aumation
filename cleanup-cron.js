import 'dotenv/config';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const { initDatabase, DatabaseService } = require('./server/database.cjs');
const BulkUploadService = require('./server/bulkUploadService.cjs');

async function runCleanup() {
  try {
    console.log('Starting automatic cleanup job...');
    console.log('Current time:', new Date().toISOString());

    await initDatabase();

    const result = await BulkUploadService.cleanupExpiredFiles(DatabaseService);

    console.log('Cleanup completed successfully:');
    console.log(`- Files deleted: ${result.filesDeleted}`);
    console.log(`- Space freed: ${result.spaceFreedMb} MB`);
    console.log(`- Work history items cleaned: ${result.workHistoryCount}`);
    console.log(`- Bulk uploads cleaned: ${result.bulkUploadCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

runCleanup();
