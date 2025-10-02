const path = require('path');
const fs = require('fs');

let pool;

function setPool(dbPool) {
  pool = dbPool;
}

class QueueService {
  static async addJobToQueue(userId, serviceId, serviceName, filePath, fileName, creditsRequired, priority = 0) {
    try {
      const result = await pool.query(
        `INSERT INTO automation_jobs (user_id, service_id, service_name, file_path, file_name, credits_required, priority, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [userId, serviceId, serviceName, filePath, fileName, creditsRequired, priority, 'pending', new Date()]
      );

      const job = result.rows[0];
      console.log(`✅ Job ${job.id} added to queue`);
      return { success: true, job };
    } catch (error) {
      console.error('Failed to add job to queue:', error);
      return { success: false, error: error.message };
    }
  }

  static async getJobStatus(jobId, userId = null) {
    try {
      let query = 'SELECT * FROM automation_jobs WHERE id = $1';
      const params = [jobId];

      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = result.rows[0];
      const queueInfo = await this.getQueueInfo();

      return {
        success: true,
        job,
        queuePosition: job.queue_position,
        queueLength: queueInfo.pendingJobs
      };
    } catch (error) {
      console.error('Failed to get job status:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserJobs(userId, limit = 50) {
    try {
      const result = await pool.query(
        'SELECT * FROM automation_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );

      return { success: true, jobs: result.rows };
    } catch (error) {
      console.error('Failed to get user jobs:', error);
      return { success: false, error: error.message };
    }
  }

  static async cancelJob(jobId, userId) {
    try {
      const jobResult = await pool.query(
        'SELECT status FROM automation_jobs WHERE id = $1 AND user_id = $2',
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];

      if (job.status !== 'pending') {
        return {
          success: false,
          error: 'Can only cancel pending jobs'
        };
      }

      await pool.query(
        'UPDATE automation_jobs SET status = $1, completed_at = $2 WHERE id = $3 AND user_id = $4',
        ['cancelled', new Date(), jobId, userId]
      );

      console.log(`✅ Job ${jobId} cancelled by user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return { success: false, error: error.message };
    }
  }

  static async getQueueInfo() {
    try {
      const pendingResult = await pool.query(
        "SELECT COUNT(*) as count FROM automation_jobs WHERE status = 'pending'"
      );

      const processingResult = await pool.query(
        "SELECT id, started_at FROM automation_jobs WHERE status = 'processing'"
      );

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const workersResult = await pool.query(
        "SELECT * FROM automation_workers WHERE status = 'busy' AND last_heartbeat >= $1",
        [twoMinutesAgo]
      );

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentResult = await pool.query(
        "SELECT * FROM automation_jobs WHERE status IN ('completed', 'failed') AND completed_at >= $1 ORDER BY completed_at DESC LIMIT 100",
        [oneHourAgo]
      );

      const recentJobs = recentResult.rows;
      const completedJobs = recentJobs.filter(j => j.status === 'completed');
      const completedCount = completedJobs.length;

      const avgExecutionTime = completedCount > 0
        ? completedJobs
            .filter(j => j.started_at && j.completed_at)
            .reduce((sum, j) => {
              const duration = new Date(j.completed_at) - new Date(j.started_at);
              return sum + duration / 1000;
            }, 0) / completedCount
        : 60;

      const pendingCount = parseInt(pendingResult.rows[0].count);
      const processingCount = processingResult.rows.length;
      const activeWorkersCount = workersResult.rows.length;

      let estimatedWaitTime = null;
      if (pendingCount > 0 && activeWorkersCount > 0) {
        estimatedWaitTime = Math.ceil((pendingCount * avgExecutionTime) / activeWorkersCount);
      }

      return {
        success: true,
        pendingJobs: pendingCount,
        processingJobs: processingCount,
        activeWorkers: activeWorkersCount,
        avgExecutionTimeSeconds: Math.round(avgExecutionTime),
        estimatedWaitTimeSeconds: estimatedWaitTime,
        queueHealthy: activeWorkersCount > 0
      };
    } catch (error) {
      console.error('Failed to get queue info:', error);
      return {
        success: false,
        error: error.message,
        pendingJobs: 0,
        processingJobs: 0,
        activeWorkers: 0,
        queueHealthy: false
      };
    }
  }

  static async getJobResults(jobId, userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM automation_jobs WHERE id = $1 AND user_id = $2',
        [jobId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = result.rows[0];

      if (job.status !== 'completed') {
        return {
          success: false,
          error: 'Job is not completed yet'
        };
      }

      let resultFiles = [];
      try {
        resultFiles = typeof job.result_files === 'string'
          ? JSON.parse(job.result_files)
          : job.result_files || [];
      } catch (e) {
        resultFiles = [];
      }

      const files = resultFiles.map(filename => ({
        name: filename,
        path: path.join(__dirname, '../results/pdfs', filename),
        exists: fs.existsSync(path.join(__dirname, '../results/pdfs', filename))
      }));

      return {
        success: true,
        job,
        files: files.filter(f => f.exists)
      };
    } catch (error) {
      console.error('Failed to get job results:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllJobs(filters = {}) {
    try {
      let query = 'SELECT * FROM automation_jobs WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.serviceId) {
        query += ` AND service_id = $${paramIndex}`;
        params.push(filters.serviceId);
        paramIndex++;
      }

      if (filters.fromDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.fromDate);
        paramIndex++;
      }

      if (filters.toDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.toDate);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const result = await pool.query(query, params);

      return { success: true, jobs: result.rows };
    } catch (error) {
      console.error('Failed to get all jobs:', error);
      return { success: false, error: error.message };
    }
  }

  static async getWorkerStatus() {
    try {
      const result = await pool.query(
        'SELECT * FROM automation_workers ORDER BY last_heartbeat DESC'
      );

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const activeWorkers = result.rows.filter(w =>
        w.status !== 'stopped' &&
        new Date(w.last_heartbeat) > twoMinutesAgo
      );

      return {
        success: true,
        workers: result.rows,
        activeWorkers: activeWorkers.length
      };
    } catch (error) {
      console.error('Failed to get worker status:', error);
      return { success: false, error: error.message };
    }
  }

  static async cleanupExpiredJobs() {
    try {
      const result = await pool.query(
        "SELECT id, result_files FROM automation_jobs WHERE expires_at < $1 AND status IN ('completed', 'failed', 'cancelled')",
        [new Date()]
      );

      const expiredJobs = result.rows;

      if (!expiredJobs || expiredJobs.length === 0) {
        return {
          success: true,
          jobsDeleted: 0,
          filesDeleted: 0
        };
      }

      let filesDeleted = 0;
      for (const job of expiredJobs) {
        let resultFiles = [];
        try {
          resultFiles = typeof job.result_files === 'string'
            ? JSON.parse(job.result_files)
            : job.result_files || [];
        } catch (e) {
          resultFiles = [];
        }

        for (const filename of resultFiles) {
          const filePath = path.join(__dirname, '../results/pdfs', filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              filesDeleted++;
            } catch (e) {
              console.error(`Failed to delete file ${filename}:`, e);
            }
          }
        }
      }

      await pool.query(
        'DELETE FROM automation_jobs WHERE id = ANY($1)',
        [expiredJobs.map(j => j.id)]
      );

      console.log(`✅ Cleaned up ${expiredJobs.length} expired jobs and ${filesDeleted} files`);

      return {
        success: true,
        jobsDeleted: expiredJobs.length,
        filesDeleted
      };
    } catch (error) {
      console.error('Failed to cleanup expired jobs:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { QueueService, setPool };
