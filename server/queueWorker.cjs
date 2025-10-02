require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

if (!dbConfig.host || !dbConfig.user || !dbConfig.database) {
  console.error('Missing PostgreSQL configuration');
  process.exit(1);
}

const pool = new Pool(dbConfig);

class AutomationQueueWorker {
  constructor() {
    this.workerId = `worker-${process.pid}-${Date.now()}`;
    this.workerName = `AutomationWorker-${process.pid}`;
    this.isRunning = false;
    this.currentJobId = null;
    this.pollInterval = 5000;
    this.heartbeatInterval = 30000;
    this.jobTimeout = 600000;
    this.scriptMap = {
      'damco-tracking-maersk': 'automation_scripts/damco_tracking_maersk.py',
      'ctg-port-tracking': 'automation_scripts/ctg_port_tracking.py'
    };
  }

  async start() {
    console.log(`🚀 Starting ${this.workerName}...`);

    await this.registerWorker();

    this.isRunning = true;

    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);

    this.pollForJobs();

    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    console.log(`✅ ${this.workerName} started and polling for jobs`);
  }

  async registerWorker() {
    try {
      const result = await pool.query(
        `INSERT INTO automation_workers (worker_name, status, last_heartbeat, started_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (worker_name)
         DO UPDATE SET status = $2, last_heartbeat = $3, started_at = $4
         RETURNING *`,
        [this.workerName, 'idle', new Date(), new Date()]
      );

      const worker = result.rows[0];
      console.log(`✅ Worker registered with ID: ${worker.id}`);
      this.workerId = worker.id;
    } catch (error) {
      console.error('Failed to register worker:', error);
      throw error;
    }
  }

  async sendHeartbeat() {
    if (!this.isRunning) return;

    try {
      const status = this.currentJobId ? 'busy' : 'idle';

      await pool.query(
        'UPDATE automation_workers SET last_heartbeat = $1, status = $2, current_job_id = $3 WHERE worker_name = $4',
        [new Date(), status, this.currentJobId, this.workerName]
      );

      if (this.currentJobId) {
        await pool.query(
          'UPDATE automation_jobs SET heartbeat_at = $1 WHERE id = $2',
          [new Date(), this.currentJobId]
        );
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  async pollForJobs() {
    if (!this.isRunning) return;

    try {
      await this.markStuckJobs();

      const nextJob = await this.getNextJob();

      if (nextJob) {
        await this.processJob(nextJob);
      }
    } catch (error) {
      console.error('Error in poll cycle:', error);
    } finally {
      if (this.isRunning) {
        setTimeout(() => this.pollForJobs(), this.pollInterval);
      }
    }
  }

  async markStuckJobs() {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const result = await pool.query(
        "SELECT id FROM automation_jobs WHERE status = 'processing' AND heartbeat_at < $1",
        [tenMinutesAgo]
      );

      const stuckJobs = result.rows;

      if (stuckJobs && stuckJobs.length > 0) {
        console.log(`⚠️ Found ${stuckJobs.length} stuck jobs, marking as failed`);

        await pool.query(
          `UPDATE automation_jobs
           SET status = 'failed', error_message = $1, completed_at = $2
           WHERE id = ANY($3)`,
          ['Job timed out - no heartbeat received', new Date(), stuckJobs.map(j => j.id)]
        );
      }
    } catch (error) {
      console.error('Error marking stuck jobs:', error);
    }
  }

  async getNextJob() {
    try {
      const result = await pool.query(
        "SELECT * FROM automation_jobs WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching next job:', error);
      return null;
    }
  }

  async processJob(job) {
    this.currentJobId = job.id;
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Processing Job: ${job.id}`);
    console.log(`   Service: ${job.service_name}`);
    console.log(`   File: ${job.file_name}`);
    console.log(`   User: ${job.user_id}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      await this.updateJobStatus(job.id, {
        status: 'processing',
        started_at: new Date(),
        heartbeat_at: new Date(),
        worker_id: this.workerName
      });

      const scriptPath = this.scriptMap[job.service_id];
      if (!scriptPath) {
        throw new Error(`No automation script found for service: ${job.service_id}`);
      }

      const fullScriptPath = path.join(__dirname, '..', scriptPath);
      if (!fs.existsSync(fullScriptPath)) {
        throw new Error(`Automation script not found: ${scriptPath}`);
      }

      if (!fs.existsSync(job.file_path)) {
        throw new Error(`Input file not found: ${job.file_path}`);
      }

      await this.killOrphanedChromeProcesses();

      const result = await this.runAutomationScript(fullScriptPath, job.file_path, job);

      const executionTime = Math.floor((Date.now() - startTime) / 1000);

      if (result.success) {
        await this.handleJobSuccess(job, result, executionTime);
      } else {
        await this.handleJobFailure(job, result.error, executionTime);
      }

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error.message);

      const executionTime = Math.floor((Date.now() - startTime) / 1000);
      await this.handleJobFailure(job, error.message, executionTime);
    } finally {
      this.currentJobId = null;
      await this.sendHeartbeat();
    }
  }

  async runAutomationScript(scriptPath, inputFile, job) {
    return new Promise((resolve) => {
      console.log(`🐍 Executing Python script: ${scriptPath}`);
      console.log(`📁 Input file: ${inputFile}`);

      const pythonProcess = spawn('python3', [scriptPath, inputFile]);

      let outputData = '';
      let errorData = '';

      const timeout = setTimeout(() => {
        console.log(`⏱️ Job ${job.id} exceeded timeout, terminating...`);
        pythonProcess.kill('SIGTERM');

        setTimeout(() => {
          if (!pythonProcess.killed) {
            pythonProcess.kill('SIGKILL');
          }
        }, 5000);
      }, this.jobTimeout);

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputData += output;
        console.log(`[Python] ${output.trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorData += error;
        console.error(`[Python Error] ${error.trim()}`);
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);

        console.log(`\n🏁 Python process exited with code: ${code}`);

        if (code === 0) {
          const resultsDir = path.join(__dirname, '../results/pdfs');
          const resultFiles = fs.existsSync(resultsDir)
            ? fs.readdirSync(resultsDir)
                .filter(f => {
                  const stat = fs.statSync(path.join(resultsDir, f));
                  const fileAge = Date.now() - stat.mtimeMs;
                  return fileAge < 60000;
                })
                .sort((a, b) => {
                  const statA = fs.statSync(path.join(resultsDir, a));
                  const statB = fs.statSync(path.join(resultsDir, b));
                  return statB.mtimeMs - statA.mtimeMs;
                })
            : [];

          console.log(`✅ Found ${resultFiles.length} result files`);

          resolve({
            success: true,
            resultFiles,
            output: outputData
          });
        } else {
          resolve({
            success: false,
            error: errorData || outputData || 'Script execution failed',
            output: outputData
          });
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ Failed to start Python process:`, error);
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  async killOrphanedChromeProcesses() {
    try {
      console.log('🧹 Checking for orphaned Chrome processes...');

      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      try {
        const { stdout } = await execPromise('pgrep -f "chrome.*--headless"');
        const pids = stdout.trim().split('\n').filter(pid => pid);

        if (pids.length > 0) {
          console.log(`⚠️ Found ${pids.length} orphaned Chrome processes, terminating...`);
          for (const pid of pids) {
            try {
              await execPromise(`kill -9 ${pid}`);
              console.log(`   Killed process ${pid}`);
            } catch (e) {

            }
          }
        } else {
          console.log('✅ No orphaned Chrome processes found');
        }
      } catch (error) {

      }
    } catch (error) {
      console.error('Error cleaning up Chrome processes:', error.message);
    }
  }

  async updateJobStatus(jobId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      values.push(jobId);

      await pool.query(
        `UPDATE automation_jobs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    } catch (error) {
      console.error(`Failed to update job ${jobId}:`, error);
    }
  }

  async handleJobSuccess(job, result, executionTime) {
    console.log(`\n✅ Job ${job.id} completed successfully`);
    console.log(`   Execution time: ${executionTime}s`);
    console.log(`   Result files: ${result.resultFiles.length}`);

    try {
      await pool.query(
        `UPDATE automation_jobs
         SET status = $1, result_files = $2, output_log = $3, credits_charged = $4, completed_at = $5
         WHERE id = $6`,
        ['completed', JSON.stringify(result.resultFiles), result.output, job.credits_required, new Date(), job.id]
      );

      await pool.query(
        'UPDATE automation_workers SET jobs_processed = jobs_processed + 1 WHERE worker_name = $1',
        [this.workerName]
      );

      await pool.query(
        'INSERT INTO job_execution_metrics (job_id, service_id, execution_time_seconds, success) VALUES ($1, $2, $3, $4)',
        [job.id, job.service_id, executionTime, true]
      );

      console.log('✅ Job status updated in database');
    } catch (error) {
      console.error('Failed to update job success:', error);
    }
  }

  async handleJobFailure(job, errorMessage, executionTime) {
    console.log(`\n❌ Job ${job.id} failed`);
    console.log(`   Error: ${errorMessage}`);
    console.log(`   Execution time: ${executionTime}s`);

    try {
      const shouldRetry = job.retry_count < job.max_retries;

      if (shouldRetry) {
        console.log(`🔄 Scheduling retry ${job.retry_count + 1}/${job.max_retries}`);

        await pool.query(
          'UPDATE automation_jobs SET status = $1, retry_count = $2, error_message = $3 WHERE id = $4',
          ['pending', job.retry_count + 1, errorMessage, job.id]
        );
      } else {
        console.log(`❌ Max retries reached, marking as failed`);

        await pool.query(
          'UPDATE automation_jobs SET status = $1, error_message = $2, completed_at = $3 WHERE id = $4',
          ['failed', errorMessage, new Date(), job.id]
        );
      }

      await pool.query(
        'INSERT INTO job_execution_metrics (job_id, service_id, execution_time_seconds, success) VALUES ($1, $2, $3, $4)',
        [job.id, job.service_id, executionTime, false]
      );

    } catch (error) {
      console.error('Failed to update job failure:', error);
    }
  }

  async shutdown() {
    console.log('\n🛑 Shutting down worker...');
    this.isRunning = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    try {
      await pool.query(
        'UPDATE automation_workers SET status = $1, stopped_at = $2, current_job_id = $3 WHERE worker_name = $4',
        ['stopped', new Date(), null, this.workerName]
      );

      console.log('✅ Worker shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }

    process.exit(0);
  }
}

if (require.main === module) {
  const worker = new AutomationQueueWorker();
  worker.start().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AutomationQueueWorker;
