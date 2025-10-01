/*
  # Create Automation Job Queue System

  ## Overview
  This migration creates a comprehensive job queue system for managing automation tasks sequentially.
  It ensures that automation scripts run one at a time to prevent Chrome WebDriver conflicts and resource exhaustion.

  ## New Tables

  ### `automation_jobs`
  Core table for managing automation job queue with sequential processing:
  - `id` (uuid, primary key) - Unique job identifier
  - `user_id` (uuid, foreign key) - User who submitted the job
  - `service_id` (varchar) - Service being requested (e.g., 'ctg-port-tracking')
  - `service_name` (varchar) - Human-readable service name
  - `file_path` (text) - Path to uploaded input file
  - `file_name` (text) - Original filename
  - `priority` (integer) - Job priority (0=normal, 1=high, 2=urgent)
  - `status` (varchar) - Job status: pending, processing, completed, failed, cancelled
  - `queue_position` (integer) - Position in queue for display purposes
  - `credits_required` (integer) - Credits needed to process this job
  - `credits_charged` (integer) - Actual credits charged after completion
  - `result_files` (jsonb) - Array of generated result file paths
  - `result_zip_path` (text) - Path to combined results zip file
  - `error_message` (text) - Error details if job failed
  - `output_log` (text) - Captured output from automation script
  - `retry_count` (integer) - Number of times job has been retried
  - `max_retries` (integer) - Maximum retry attempts allowed
  - `worker_id` (varchar) - ID of worker processing this job
  - `heartbeat_at` (timestamptz) - Last heartbeat from worker
  - `created_at` (timestamptz) - Job submission time
  - `started_at` (timestamptz) - Job processing start time
  - `completed_at` (timestamptz) - Job completion/failure time
  - `expires_at` (timestamptz) - When result files will be deleted

  ### `automation_workers`
  Table for tracking active queue worker processes:
  - `id` (uuid, primary key) - Worker instance identifier
  - `worker_name` (varchar) - Human-readable worker name
  - `status` (varchar) - Worker status: idle, busy, stopped
  - `current_job_id` (uuid) - Job currently being processed
  - `jobs_processed` (integer) - Total jobs completed by this worker
  - `last_heartbeat` (timestamptz) - Last activity timestamp
  - `started_at` (timestamptz) - When worker started
  - `stopped_at` (timestamptz) - When worker stopped

  ### `job_execution_metrics`
  Table for tracking job performance and system health:
  - `id` (uuid, primary key)
  - `job_id` (uuid, foreign key) - Related job
  - `service_id` (varchar) - Service type
  - `execution_time_seconds` (integer) - How long job took
  - `chrome_startup_time_ms` (integer) - Chrome initialization time
  - `processing_time_ms` (integer) - Actual processing time
  - `memory_usage_mb` (numeric) - Peak memory usage
  - `success` (boolean) - Whether job succeeded
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Users can only view their own jobs
  - Only admins can view all jobs and worker status
  - Only system/workers can update job status and metrics

  ## Indexes
  - Index on status + priority + created_at for efficient queue polling
  - Index on user_id for user job history
  - Index on created_at for cleanup operations
  - Index on heartbeat_at for detecting stuck jobs
*/

-- Create automation_jobs table
CREATE TABLE IF NOT EXISTS automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service_id varchar(100) NOT NULL,
  service_name varchar(255) NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  priority integer DEFAULT 0,
  status varchar(50) DEFAULT 'pending',
  queue_position integer,
  credits_required integer DEFAULT 0,
  credits_charged integer DEFAULT 0,
  result_files jsonb DEFAULT '[]'::jsonb,
  result_zip_path text,
  error_message text,
  output_log text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  worker_id varchar(100),
  heartbeat_at timestamptz,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Create automation_workers table
CREATE TABLE IF NOT EXISTS automation_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name varchar(100) NOT NULL UNIQUE,
  status varchar(50) DEFAULT 'idle',
  current_job_id uuid REFERENCES automation_jobs(id) ON DELETE SET NULL,
  jobs_processed integer DEFAULT 0,
  last_heartbeat timestamptz DEFAULT now(),
  started_at timestamptz DEFAULT now(),
  stopped_at timestamptz
);

-- Create job_execution_metrics table
CREATE TABLE IF NOT EXISTS job_execution_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES automation_jobs(id) ON DELETE CASCADE,
  service_id varchar(100) NOT NULL,
  execution_time_seconds integer,
  chrome_startup_time_ms integer,
  processing_time_ms integer,
  memory_usage_mb numeric(10, 2),
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient queue operations
CREATE INDEX IF NOT EXISTS idx_automation_jobs_queue 
  ON automation_jobs(status, priority DESC, created_at ASC) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_automation_jobs_user 
  ON automation_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_heartbeat 
  ON automation_jobs(heartbeat_at) 
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_automation_jobs_expires 
  ON automation_jobs(expires_at) 
  WHERE status IN ('completed', 'failed');

CREATE INDEX IF NOT EXISTS idx_automation_workers_status 
  ON automation_workers(status, last_heartbeat DESC);

CREATE INDEX IF NOT EXISTS idx_job_metrics_service 
  ON job_execution_metrics(service_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_execution_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_jobs

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON automation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can create own jobs"
  ON automation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending jobs
CREATE POLICY "Users can cancel own pending jobs"
  ON automation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Admins can view all jobs
CREATE POLICY "Admins can view all jobs"
  ON automation_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Admins can update all jobs
CREATE POLICY "Admins can update all jobs"
  ON automation_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- RLS Policies for automation_workers

-- Only admins can view workers
CREATE POLICY "Admins can view workers"
  ON automation_workers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Only admins can manage workers
CREATE POLICY "Admins can manage workers"
  ON automation_workers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- RLS Policies for job_execution_metrics

-- Users can view metrics for their own jobs
CREATE POLICY "Users can view own job metrics"
  ON job_execution_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM automation_jobs 
      WHERE automation_jobs.id = job_execution_metrics.job_id 
      AND automation_jobs.user_id = auth.uid()
    )
  );

-- Admins can view all metrics
CREATE POLICY "Admins can view all metrics"
  ON job_execution_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Function to update queue positions
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered_jobs AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY priority DESC, created_at ASC) as position
    FROM automation_jobs
    WHERE status = 'pending'
  )
  UPDATE automation_jobs
  SET queue_position = numbered_jobs.position
  FROM numbered_jobs
  WHERE automation_jobs.id = numbered_jobs.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update queue positions
CREATE TRIGGER update_queue_positions_trigger
  AFTER INSERT OR UPDATE OF status ON automation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_positions();

-- Function to detect and mark stuck jobs
CREATE OR REPLACE FUNCTION mark_stuck_jobs()
RETURNS void AS $$
BEGIN
  UPDATE automation_jobs
  SET 
    status = 'failed',
    error_message = 'Job timed out - no heartbeat received',
    completed_at = now()
  WHERE 
    status = 'processing'
    AND heartbeat_at < (now() - interval '10 minutes');
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired jobs
CREATE OR REPLACE FUNCTION cleanup_expired_automation_jobs()
RETURNS TABLE(jobs_deleted integer, files_deleted integer) AS $$
DECLARE
  deleted_count integer;
  files_count integer := 0;
BEGIN
  -- Count and delete expired jobs
  WITH deleted AS (
    DELETE FROM automation_jobs
    WHERE expires_at < now()
    AND status IN ('completed', 'failed', 'cancelled')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  jobs_deleted := deleted_count;
  files_deleted := files_count;
  
  RETURN QUERY SELECT jobs_deleted, files_deleted;
END;
$$ LANGUAGE plpgsql;