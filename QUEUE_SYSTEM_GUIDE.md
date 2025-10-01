# Automation Queue System Guide

## Overview

The automation queue system ensures that all automation jobs are processed sequentially, eliminating Chrome WebDriver conflicts and preventing resource exhaustion under high traffic.

## Architecture

### Components

1. **Supabase Database Tables**
   - `automation_jobs`: Stores all automation job requests
   - `automation_workers`: Tracks active queue worker processes
   - `job_execution_metrics`: Logs performance metrics for each job

2. **Queue Worker** (`server/queueWorker.cjs`)
   - Polls the database for pending jobs every 5 seconds
   - Processes one job at a time
   - Sends heartbeat signals to detect stuck jobs
   - Automatically retries failed jobs (up to 3 attempts)
   - Cleans up orphaned Chrome processes before each job

3. **Queue Service** (`server/queueService.cjs`)
   - Provides helper functions for queue operations
   - Manages job submission, status tracking, and results retrieval
   - Handles queue information and statistics

4. **API Endpoints** (in `server/index.cjs`)
   - `POST /api/queue/submit` - Submit a new automation job
   - `GET /api/queue/status/:jobId` - Get job status
   - `GET /api/queue/user/:userId` - Get user's jobs
   - `POST /api/queue/cancel/:jobId` - Cancel a pending job
   - `GET /api/queue/info` - Get queue statistics
   - `GET /api/queue/results/:jobId` - Get completed job results
   - Admin endpoints for monitoring and management

5. **Frontend Component** (`src/components/QueueStatus.tsx`)
   - Real-time job status display
   - Queue position and estimated wait time
   - Visual progress indicators

## Fixed Chrome Issues

### Problem
The error "user data directory is already in use" occurred when multiple Chrome instances tried to use the same:
- Remote debugging port (9222)
- User data directory in /tmp

### Solutions Implemented

1. **Removed Hardcoded Debugging Port**
   - No longer using `--remote-debugging-port=9222`
   - Each Chrome instance now uses a unique port automatically

2. **Unique User Data Directories**
   - Each automation run creates a unique temp directory: `chrome_user_data_{pid}_{timestamp}_`
   - Directories are properly cleaned up after each job

3. **Sequential Processing**
   - Only one automation runs at a time via the queue system
   - Eliminates all concurrency-related Chrome conflicts

4. **Orphaned Process Cleanup**
   - Worker kills any orphaned Chrome processes before starting new jobs
   - Cleanup utility removes stale temp directories

## Usage

### Starting the System

#### Development Mode
```bash
# Start server, worker, and frontend together
npm run dev:full
```

#### Production Mode
```bash
# Start server and worker together
npm run start:all

# Or start them separately
npm run start        # Start Express server
npm run start:worker # Start queue worker
```

### Submitting Jobs

**Old Way (Direct Execution - Deprecated)**
```javascript
POST /api/run-automation
// Job runs immediately, can cause conflicts
```

**New Way (Queue System - Recommended)**
```javascript
POST /api/queue/submit
// Job is added to queue and processed sequentially
```

Example:
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('serviceId', 'ctg-port-tracking');
formData.append('userId', user.id);

const response = await axios.post('/api/queue/submit', formData);
// Returns: { jobId, queuePosition, estimatedWaitTime }
```

### Monitoring Jobs

**Check Job Status**
```javascript
GET /api/queue/status/:jobId?userId=xxx
```

**Get User's Jobs**
```javascript
GET /api/queue/user/:userId
```

**Get Queue Information**
```javascript
GET /api/queue/info
// Returns: pending count, processing count, active workers, etc.
```

### Using the QueueStatus Component

```tsx
import { QueueStatus } from '../components/QueueStatus';

function MyComponent() {
  const [jobId, setJobId] = useState(null);

  const handleUpload = async (file) => {
    const response = await submitJob(file);
    setJobId(response.jobId);
  };

  return (
    <div>
      {jobId && (
        <QueueStatus
          jobId={jobId}
          userId={user.id}
          onComplete={(job) => {
            if (job.status === 'completed') {
              // Handle completed job
            }
          }}
        />
      )}
    </div>
  );
}
```

## Maintenance

### Cleanup Commands

**Run Manual Cleanup**
```bash
npm run cleanup
```

This removes:
- Orphaned Chrome processes
- Stale Chrome user data directories
- Old temporary upload files

**Cleanup Expired Jobs**
```bash
curl -X POST http://localhost:3001/api/admin/queue/cleanup
```

### Monitoring

**Check Worker Status**
```bash
curl http://localhost:3001/api/admin/workers
```

**View All Jobs**
```bash
curl http://localhost:3001/api/admin/queue/all
```

**Filter by Status**
```bash
curl "http://localhost:3001/api/admin/queue/all?status=failed&limit=10"
```

## Job States

- **pending**: Job is waiting in queue
- **processing**: Job is currently running
- **completed**: Job finished successfully
- **failed**: Job failed (after max retries)
- **cancelled**: User cancelled the job

## Queue Features

### Automatic Retry
Failed jobs are automatically retried up to 3 times before being marked as failed.

### Heartbeat Monitoring
Jobs send heartbeat signals every 30 seconds. If no heartbeat for 10 minutes, the job is marked as failed and returned to queue.

### Priority System
Jobs can have different priorities (0=normal, 1=high, 2=urgent). Higher priority jobs are processed first.

### Result Expiration
Job results are kept for 7 days by default, then automatically cleaned up.

## Troubleshooting

### Worker Not Processing Jobs

1. Check if worker is running:
   ```bash
   ps aux | grep queueWorker
   ```

2. Check worker status:
   ```bash
   curl http://localhost:3001/api/admin/workers
   ```

3. Restart worker:
   ```bash
   npm run start:worker
   ```

### Jobs Stuck in Processing

The system automatically detects stuck jobs (no heartbeat for 10 minutes) and marks them as failed. You can also manually run:

```bash
# Run cleanup utility
npm run cleanup
```

### Chrome Processes Accumulating

Run the cleanup utility periodically:
```bash
npm run cleanup
```

Or set up a cron job to run it every hour:
```bash
0 * * * * cd /path/to/project && npm run cleanup
```

## Performance Tuning

### Adjusting Poll Interval

Edit `server/queueWorker.cjs`:
```javascript
this.pollInterval = 5000; // Check for new jobs every 5 seconds
```

### Adjusting Heartbeat Interval

Edit `server/queueWorker.cjs`:
```javascript
this.heartbeatInterval = 30000; // Send heartbeat every 30 seconds
```

### Adjusting Job Timeout

Edit `server/queueWorker.cjs`:
```javascript
this.jobTimeout = 600000; // Kill job after 10 minutes
```

## Database Schema

See `supabase/migrations/20251001_add_automation_job_queue.sql` for the complete schema including:
- Table definitions
- Indexes for performance
- RLS policies for security
- Helper functions for queue management

## Migration from Old System

To migrate from the old immediate execution system:

1. Update frontend to use `/api/queue/submit` instead of `/api/run-automation`
2. Replace direct status checks with queue status polling
3. Update UI to show queue position and wait times
4. Start the queue worker process
5. Test with low-priority traffic first

## Security Considerations

- RLS policies ensure users can only see their own jobs
- Admin endpoints require admin privileges
- File paths are validated to prevent directory traversal
- Worker authenticates with service role key

## Future Enhancements

Potential improvements for the future:
- Multiple workers for parallel processing (with semaphore/lock system)
- WebSocket for real-time status updates
- Job scheduling (run at specific time)
- Job dependencies (run job B after job A completes)
- Resource-based queuing (different queues for different resources)
