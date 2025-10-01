const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class QueueService {
  static async addJobToQueue(userId, serviceId, serviceName, filePath, fileName, creditsRequired, priority = 0) {
    try {
      const { data, error } = await supabase
        .from('automation_jobs')
        .insert({
          user_id: userId,
          service_id: serviceId,
          service_name: serviceName,
          file_path: filePath,
          file_name: fileName,
          credits_required: creditsRequired,
          priority,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Job ${data.id} added to queue`);
      return { success: true, job: data };
    } catch (error) {
      console.error('Failed to add job to queue:', error);
      return { success: false, error: error.message };
    }
  }

  static async getJobStatus(jobId, userId = null) {
    try {
      let query = supabase
        .from('automation_jobs')
        .select('*')
        .eq('id', jobId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      const queueInfo = await this.getQueueInfo();

      return {
        success: true,
        job: data,
        queuePosition: data.queue_position,
        queueLength: queueInfo.pendingJobs
      };
    } catch (error) {
      console.error('Failed to get job status:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserJobs(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('automation_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, jobs: data };
    } catch (error) {
      console.error('Failed to get user jobs:', error);
      return { success: false, error: error.message };
    }
  }

  static async cancelJob(jobId, userId) {
    try {
      const { data: job, error: fetchError } = await supabase
        .from('automation_jobs')
        .select('status')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (job.status !== 'pending') {
        return {
          success: false,
          error: 'Can only cancel pending jobs'
        };
      }

      const { error: updateError } = await supabase
        .from('automation_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log(`✅ Job ${jobId} cancelled by user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return { success: false, error: error.message };
    }
  }

  static async getQueueInfo() {
    try {
      const { data: pendingJobs, error: pendingError } = await supabase
        .from('automation_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const { data: processingJobs, error: processingError } = await supabase
        .from('automation_jobs')
        .select('id, started_at', { count: 'exact' })
        .eq('status', 'processing');

      if (processingError) throw processingError;

      const { data: workers, error: workersError } = await supabase
        .from('automation_workers')
        .select('*')
        .eq('status', 'busy')
        .gte('last_heartbeat', new Date(Date.now() - 2 * 60 * 1000).toISOString());

      if (workersError) throw workersError;

      const { data: recentJobs, error: recentError } = await supabase
        .from('automation_jobs')
        .select('*')
        .in('status', ['completed', 'failed'])
        .gte('completed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(100);

      if (recentError) throw recentError;

      const completedCount = recentJobs.filter(j => j.status === 'completed').length;
      const avgExecutionTime = completedCount > 0
        ? recentJobs
            .filter(j => j.status === 'completed' && j.started_at && j.completed_at)
            .reduce((sum, j) => {
              const duration = new Date(j.completed_at) - new Date(j.started_at);
              return sum + duration / 1000;
            }, 0) / completedCount
        : 60;

      let estimatedWaitTime = null;
      if (pendingJobs && pendingJobs.length > 0 && workers && workers.length > 0) {
        estimatedWaitTime = Math.ceil((pendingJobs.length * avgExecutionTime) / workers.length);
      }

      return {
        success: true,
        pendingJobs: pendingJobs ? pendingJobs.length : 0,
        processingJobs: processingJobs ? processingJobs.length : 0,
        activeWorkers: workers ? workers.length : 0,
        avgExecutionTimeSeconds: Math.round(avgExecutionTime),
        estimatedWaitTimeSeconds: estimatedWaitTime,
        queueHealthy: workers && workers.length > 0
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
      const { data: job, error } = await supabase
        .from('automation_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

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
      let query = supabase
        .from('automation_jobs')
        .select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.serviceId) {
        query = query.eq('service_id', filters.serviceId);
      }

      if (filters.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      query = query.order('created_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, jobs: data };
    } catch (error) {
      console.error('Failed to get all jobs:', error);
      return { success: false, error: error.message };
    }
  }

  static async getWorkerStatus() {
    try {
      const { data, error } = await supabase
        .from('automation_workers')
        .select('*')
        .order('last_heartbeat', { ascending: false });

      if (error) throw error;

      const activeWorkers = data.filter(w =>
        w.status !== 'stopped' &&
        new Date(w.last_heartbeat) > new Date(Date.now() - 2 * 60 * 1000)
      );

      return {
        success: true,
        workers: data,
        activeWorkers: activeWorkers.length
      };
    } catch (error) {
      console.error('Failed to get worker status:', error);
      return { success: false, error: error.message };
    }
  }

  static async cleanupExpiredJobs() {
    try {
      const { data: expiredJobs, error: fetchError } = await supabase
        .from('automation_jobs')
        .select('id, result_files')
        .lt('expires_at', new Date().toISOString())
        .in('status', ['completed', 'failed', 'cancelled']);

      if (fetchError) throw fetchError;

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

      const { error: deleteError } = await supabase
        .from('automation_jobs')
        .delete()
        .in('id', expiredJobs.map(j => j.id));

      if (deleteError) throw deleteError;

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

module.exports = QueueService;
