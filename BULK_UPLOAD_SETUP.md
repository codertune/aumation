# Bulk Upload System - Setup Guide

## Overview
Complete bulk automation system with 7-day storage, automatic cleanup, and row-by-row processing.

## Features Implemented

### 1. Database Schema (Supabase)
- **bulk_uploads** - Tracks batch upload jobs
- **bulk_upload_items** - Individual row processing details
- **service_templates** - Template definitions and validation rules
- **cleanup_logs** - Audit trail for automatic file deletions
- **work_history** - Updated with `expires_at` for 7-day tracking

### 2. Sample Templates (12 Services)
Located in `/public/templates/`:
- damco-tracking-maersk-template.csv
- ctg-port-tracking-template.csv
- myshipment-tracking-template.csv
- egm-download-template.csv
- custom-tracking-template.csv
- bb-exp-issue-template.csv
- bb-exp-correction-template.csv
- bb-exp-duplicate-template.csv
- bb-exp-search-template.csv
- damco-booking-template.csv
- cash-incentive-application-template.csv
- pdf-to-excel-template.csv

### 3. Backend Services

**BulkUploadService** (`server/bulkUploadService.cjs`):
- CSV and Excel file parsing
- Row-by-row automation processing
- ZIP file generation for results
- Automatic cleanup for expired files
- Expiration status calculation

**DatabaseService** - 15 new methods:
- `getServiceTemplates()` - List all templates
- `getServiceTemplate(serviceId)` - Get specific template
- `createBulkUpload()` - Create new bulk job
- `updateBulkUpload()` - Update job status
- `getBulkUploads(userId)` - User's bulk uploads
- `getBulkUpload(id)` - Get job details
- `createBulkUploadItem()` - Add row to job
- `updateBulkUploadItem()` - Update row status
- `getBulkUploadItems(bulkUploadId)` - Get all rows
- `getExpiredWorkHistory()` - Find expired files
- `getExpiredBulkUploads()` - Find expired bulk jobs
- `logCleanup()` - Log cleanup operation
- `getCleanupLogs()` - Get cleanup history

### 4. API Endpoints (9 New)

**Template Management:**
- `GET /api/templates` - List all service templates
- `GET /api/templates/:serviceId` - Get template details
- `GET /api/templates/:serviceId/download` - Download CSV template

**Bulk Upload:**
- `POST /api/bulk-upload` - Upload file and start processing
- `GET /api/bulk-uploads/:userId` - Get user's bulk uploads
- `GET /api/bulk-uploads/:bulkUploadId/details` - Get job details
- `GET /api/bulk-uploads/:bulkUploadId/download` - Download ZIP results

**Cleanup:**
- `POST /api/cleanup/run` - Manually trigger cleanup
- `GET /api/cleanup/logs` - Get cleanup audit logs

### 5. Frontend Components

**BulkUploadPage** (`src/pages/BulkUploadPage.tsx`):
- Drag-and-drop file upload
- Service selection with category filter
- Template download functionality
- Real-time progress tracking
- Expiration countdown display
- ZIP download for completed jobs
- Auto-refresh every 5 seconds

**Navigation:**
- Added route `/bulk-upload` in App.tsx
- Added menu item in Header dropdown

## How It Works

### Upload Process
1. User selects a service from dropdown
2. User downloads template (optional)
3. User uploads CSV/Excel file
4. System validates file and creates bulk_upload record
5. System creates bulk_upload_items for each row
6. Background processing starts immediately
7. Each row is processed individually:
   - Success: Credits deducted, result saved
   - Failure: No credits charged, error logged
8. After completion, ZIP file is generated
9. Expiration date set to 7 days from completion

### Credit System
- Credits deducted ONLY for successful rows
- Failed rows = 0 credits
- Credit cost defined per service in service_templates
- Real-time credit balance updates

### Storage & Expiration
- All result files stored for exactly 7 days
- Expiration status:
  - **Active**: 3+ days remaining (gray)
  - **Expiring Soon**: 1-2 days remaining (orange)
  - **Expired**: Past expiration date (red)
- Automatic cleanup removes expired files

## Setup Instructions

### 1. Environment Variables
Already configured in `.env`:
```
DB_HOST=your_supabase_host
DB_USER=postgres
DB_NAME=postgres
DB_PASSWORD=your_password
DB_PORT=5432
DB_SSL=true
```

### 2. Database Migration
Already applied via Supabase MCP:
- Migration file: `supabase/migrations/20251001173031_add_bulk_upload_system.sql`
- Service templates seeded automatically

### 3. NPM Packages
Already installed:
```bash
npm install csv-parser archiver xlsx
```

### 4. Automatic Cleanup (Optional)

#### Option A: Node Cron Job
Add to `package.json`:
```json
{
  "scripts": {
    "cleanup": "node cleanup-cron.js"
  }
}
```

Run manually:
```bash
npm run cleanup
```

#### Option B: System Cron (Linux/Mac)
```bash
crontab -e
```

Add line to run daily at 2 AM:
```
0 2 * * * cd /path/to/project && node cleanup-cron.js >> /var/log/cleanup.log 2>&1
```

#### Option C: PM2 Cron
```bash
pm2 start cleanup-cron.js --cron "0 2 * * *"
```

#### Option D: Manual Trigger via API
```bash
curl -X POST http://localhost:3001/api/cleanup/run
```

## Testing the System

### 1. Start the Server
```bash
npm run server
```

### 2. Access Bulk Upload
- Navigate to: http://localhost:5173/bulk-upload
- Login with your account
- Select a service (e.g., "Damco Tracking - Maersk")

### 3. Download Template
- Click "Download Template" button
- Review the CSV structure

### 4. Upload File
- Drag and drop your CSV/Excel file
- Or click "Browse Files"
- Click "Start Bulk Processing"

### 5. Monitor Progress
- Watch real-time progress updates
- See success/failure counts
- Check credit deductions

### 6. Download Results
- Wait for "completed" status
- Click "Download ZIP" button
- Extract and review result files

### 7. Check Expiration
- Results expire in 7 days
- Warning appears 2 days before expiration
- Expired files automatically deleted

## File Structure
```
project/
├── server/
│   ├── index.cjs (9 new API endpoints)
│   ├── database.cjs (15 new methods)
│   └── bulkUploadService.cjs (processing logic)
├── src/
│   ├── pages/
│   │   └── BulkUploadPage.tsx (UI component)
│   ├── App.tsx (route added)
│   └── components/
│       └── Header.tsx (menu link added)
├── public/
│   └── templates/ (12 CSV templates)
├── supabase/
│   └── migrations/
│       └── 20251001173031_add_bulk_upload_system.sql
└── cleanup-cron.js (automatic cleanup script)
```

## API Usage Examples

### Upload Bulk File
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('serviceId', 'damco-tracking-maersk');
formData.append('userId', userId);

const response = await fetch('http://localhost:3001/api/bulk-upload', {
  method: 'POST',
  body: formData
});
```

### Get User's Bulk Uploads
```javascript
const response = await fetch(`http://localhost:3001/api/bulk-uploads/${userId}`);
const data = await response.json();
// Returns bulk uploads with expiration status
```

### Download Results
```javascript
const response = await fetch(
  `http://localhost:3001/api/bulk-uploads/${bulkUploadId}/download`
);
const blob = await response.blob();
// Save as ZIP file
```

## Troubleshooting

### Issue: File upload fails
- Check file format (CSV or Excel only)
- Verify service_id exists in database
- Check user has sufficient credits

### Issue: Processing stuck
- Check Python scripts are accessible
- Verify automation_script_path in service_templates
- Check server logs for errors

### Issue: Download fails
- Results may have expired (check expires_at)
- ZIP file may not exist (check result_zip_path)
- File permissions issue

### Issue: Cleanup not running
- Verify cron job is configured
- Check cleanup-cron.js has correct permissions
- Review cleanup_logs table for errors

## Performance Notes

- Processing is asynchronous (doesn't block API response)
- Each row processed sequentially to avoid overwhelming system
- ZIP generation happens after all rows complete
- Cleanup runs independently without affecting active jobs
- 5-second auto-refresh in UI for progress updates

## Security Considerations

- RLS policies protect user data
- Users can only access their own bulk uploads
- Template downloads are public (no sensitive data)
- Result files deleted after 7 days automatically
- Credit validation prevents abuse

## Future Enhancements

Potential improvements:
- Parallel row processing for faster completion
- Email notifications when jobs complete
- Webhook support for job status updates
- Resume failed jobs functionality
- Export detailed error reports
- Admin dashboard for monitoring all jobs
- Configurable expiration periods
- Bulk operation retry mechanism

## Support

For issues or questions:
1. Check server logs: `npm run server`
2. Review cleanup logs: `GET /api/cleanup/logs`
3. Check database: Query bulk_uploads and bulk_upload_items tables
4. Verify file permissions in uploads/ and results/ directories
