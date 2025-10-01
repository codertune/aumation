require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
      const { data, error } = await supabase
        .from('automation_workers')
        .upsert({
          worker_name: this.workerName,
          status: 'idle',
          last_heartbeat: new Date().toISOString(),
          started_at: new Date().toISOString()
        }, {
          onConflict: 'worker_name'
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Worker registered with ID: ${data.id}`);
      this.workerId = data.id;
    } catch (error) {
      console.error('Failed to register worker:', error);
      throw error;
    }
  }

  async sendHeartbeat() {
    if (!this.isRunning) return;

    try {
      const updateData = {
        last_heartbeat: new Date().toISOString(),
        status: this.currentJobId ? 'busy' : 'idle'
      };

      if (this.currentJobId) {
        updateData.current_job_id = this.currentJobId;
      }

      await supabase
        .from('automation_workers')
        .update(updateData)
        .eq('worker_name', this.workerName);

      if (this.currentJobId) {
        await supabase
          .from('automation_jobs')
          .update({ heartbeat_at: new Date().toISOString() })
          .eq('id', this.currentJobId);
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
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: stuckJobs } = await supabase
        .from('automation_jobs')
        .select('id')
        .eq('status', 'processing')
        .lt('heartbeat_at', tenMinutesAgo);

      if (stuckJobs && stuckJobs.length > 0) {
        console.log(`⚠️ Found ${stuckJobs.length} stuck jobs, marking as failed`);

        await supabase
          .from('automation_jobs')
          .update({
            status: 'failed',
            error_message: 'Job timed out - no heartbeat received',
            completed_at: new Date().toISOString()
          })
          .in('id', stuckJobs.map(j => j.id));
      }
    } catch (error) {
      console.error('Error marking stuck jobs:', error);
    }
  }

  async getNextJob() {
    try {
      const { data: jobs, error } = await supabase
        .from('automation_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;

      return jobs && jobs.length > 0 ? jobs[0] : null;
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
        started_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
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
      const { error } = await supabase
        .from('automation_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error(`Failed to update job ${jobId}:`, error);
    }
  }

  async handleJobSuccess(job, result, executionTime) {
    console.log(`\n✅ Job ${job.id} completed successfully`);
    console.log(`   Execution time: ${executionTime}s`);
    console.log(`   Result files: ${result.resultFiles.length}`);

    try {
      await supabase
        .from('automation_jobs')
        .update({
          status: 'completed',
          result_files: JSON.stringify(result.resultFiles),
          output_log: result.output,
          credits_charged: job.credits_required,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      await supabase
        .from('automation_workers')
        .update({
          jobs_processed: supabase.raw('jobs_processed + 1')
        })
        .eq('worker_name', this.workerName);

      await supabase
        .from('job_execution_metrics')
        .insert({
          job_id: job.id,
          service_id: job.service_id,
          execution_time_seconds: executionTime,
          success: true
        });

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

        await supabase
          .from('automation_jobs')
          .update({
            status: 'pending',
            retry_count: job.retry_count + 1,
            error_message: errorMessage
          })
          .eq('id', job.id);
      } else {
        console.log(`❌ Max retries reached, marking as failed`);

        await supabase
          .from('automation_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }

      await supabase
        .from('job_execution_metrics')
        .insert({
          job_id: job.id,
          service_id: job.service_id,
          execution_time_seconds: executionTime,
          success: false
        });

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
      await supabase
        .from('automation_workers')
        .update({
          status: 'stopped',
          stopped_at: new Date().toISOString(),
          current_job_id: null
        })
        .eq('worker_name', this.workerName);

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
