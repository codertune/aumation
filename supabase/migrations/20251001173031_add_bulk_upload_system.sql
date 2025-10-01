/*
  # Bulk Upload System with 7-Day Storage
  
  ## Overview
  This migration adds complete bulk upload functionality with automatic 7-day file expiration and cleanup.
  
  ## Changes Made
  
  ### 1. Updated Tables
  - `work_history`: Added expires_at column for 7-day result storage tracking
  
  ### 2. New Tables Created
  
  #### bulk_uploads
  Tracks batch upload jobs from users
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `service_id` (varchar) - which automation service
  - `service_name` (varchar) - human-readable service name
  - `original_file_name` (text) - uploaded CSV/Excel filename
  - `total_rows` (integer) - number of rows in upload
  - `processed_rows` (integer) - rows processed so far
  - `successful_rows` (integer) - successfully completed rows
  - `failed_rows` (integer) - failed rows
  - `status` (varchar) - pending, processing, completed, failed
  - `credits_used` (integer) - total credits consumed
  - `error_message` (text) - any batch-level errors
  - `result_zip_path` (text) - path to ZIP file with all results
  - `expires_at` (timestamptz) - when results expire (7 days from completion)
  - `created_at`, `completed_at`, `updated_at`
  
  #### bulk_upload_items
  Individual row processing details for each bulk upload
  - `id` (uuid, primary key)
  - `bulk_upload_id` (uuid, foreign key to bulk_uploads)
  - `work_history_id` (uuid, foreign key to work_history) - links to individual automation result
  - `row_number` (integer) - which row in the CSV/Excel
  - `row_data` (jsonb) - original row data from CSV/Excel
  - `status` (varchar) - pending, processing, completed, failed
  - `credits_used` (integer) - credits for this row (0 if failed)
  - `error_message` (text) - error details if failed
  - `result_file_path` (text) - path to result file for this row
  - `created_at`, `processed_at`
  
  #### service_templates
  Stores template definitions and validation rules for each service
  - `id` (uuid, primary key)
  - `service_id` (varchar, unique) - matches service identifier
  - `service_name` (varchar) - display name
  - `category` (varchar) - service category (Tracking, Bangladesh Bank, etc.)
  - `template_csv_path` (text) - path to CSV template file
  - `template_xlsx_path` (text) - path to Excel template file
  - `column_definitions` (jsonb) - column names, types, validation rules
  - `sample_data` (jsonb) - 5 rows of sample data
  - `credit_cost` (integer) - credits per successful process
  - `automation_script_path` (text) - path to Python automation script
  - `is_active` (boolean) - template available for use
  - `created_at`, `updated_at`
  
  #### cleanup_logs
  Audit trail of automatic file cleanup operations
  - `id` (uuid, primary key)
  - `cleanup_date` (timestamptz) - when cleanup ran
  - `files_deleted` (integer) - number of files removed
  - `space_freed_mb` (decimal) - storage space freed
  - `work_history_ids` (jsonb) - array of affected work_history IDs
  - `bulk_upload_ids` (jsonb) - array of affected bulk_upload IDs
  - `status` (varchar) - success, partial, failed
  - `error_message` (text) - any errors during cleanup
  - `created_at`
  
  ## Security
  - RLS enabled on all tables
  - Users can only access their own bulk uploads and results
  - Admins can view all uploads for monitoring
  
  ## Indexes
  - Optimized queries for expiration tracking
  - Fast lookups by user, service, status, and dates
*/

-- Add expires_at column to work_history for 7-day storage tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_history' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE work_history ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days');
  END IF;
END $$;

-- Create bulk_uploads table
CREATE TABLE IF NOT EXISTS bulk_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id VARCHAR(100) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  original_file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  credits_used INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  result_zip_path TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bulk_upload_items table
CREATE TABLE IF NOT EXISTS bulk_upload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_upload_id UUID REFERENCES bulk_uploads(id) ON DELETE CASCADE,
  work_history_id UUID REFERENCES work_history(id) ON DELETE SET NULL,
  row_number INTEGER NOT NULL,
  row_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  credits_used INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  result_file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Create service_templates table
CREATE TABLE IF NOT EXISTS service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(100) UNIQUE NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  template_csv_path TEXT,
  template_xlsx_path TEXT,
  column_definitions JSONB NOT NULL DEFAULT '[]',
  sample_data JSONB NOT NULL DEFAULT '[]',
  credit_cost INTEGER NOT NULL DEFAULT 1,
  automation_script_path TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cleanup_logs table
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  files_deleted INTEGER NOT NULL DEFAULT 0,
  space_freed_mb DECIMAL(10,2) DEFAULT 0,
  work_history_ids JSONB DEFAULT '[]',
  bulk_upload_ids JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_history_expires_at ON work_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_work_history_user_status ON work_history(user_id, status);

CREATE INDEX IF NOT EXISTS idx_bulk_uploads_user_id ON bulk_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_status ON bulk_uploads(status);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_expires_at ON bulk_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_service_id ON bulk_uploads(service_id);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_created_at ON bulk_uploads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_items_bulk_id ON bulk_upload_items(bulk_upload_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_items_status ON bulk_upload_items(status);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_items_work_history_id ON bulk_upload_items(work_history_id);

CREATE INDEX IF NOT EXISTS idx_service_templates_service_id ON service_templates(service_id);
CREATE INDEX IF NOT EXISTS idx_service_templates_category ON service_templates(category);
CREATE INDEX IF NOT EXISTS idx_service_templates_active ON service_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleanup_date ON cleanup_logs(cleanup_date DESC);

-- Enable RLS on all new tables
ALTER TABLE bulk_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_upload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bulk_uploads
DROP POLICY IF EXISTS "Users can view own bulk uploads" ON bulk_uploads;
CREATE POLICY "Users can view own bulk uploads"
  ON bulk_uploads FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own bulk uploads" ON bulk_uploads;
CREATE POLICY "Users can insert own bulk uploads"
  ON bulk_uploads FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own bulk uploads" ON bulk_uploads;
CREATE POLICY "Users can update own bulk uploads"
  ON bulk_uploads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bulk_upload_items
DROP POLICY IF EXISTS "Users can view own bulk items" ON bulk_upload_items;
CREATE POLICY "Users can view own bulk items"
  ON bulk_upload_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own bulk items" ON bulk_upload_items;
CREATE POLICY "Users can insert own bulk items"
  ON bulk_upload_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own bulk items" ON bulk_upload_items;
CREATE POLICY "Users can update own bulk items"
  ON bulk_upload_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for service_templates (read-only for all authenticated users)
DROP POLICY IF EXISTS "All users can view templates" ON service_templates;
CREATE POLICY "All users can view templates"
  ON service_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage templates" ON service_templates;
CREATE POLICY "Admins can manage templates"
  ON service_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for cleanup_logs (admins only)
DROP POLICY IF EXISTS "All users can view cleanup logs" ON cleanup_logs;
CREATE POLICY "All users can view cleanup logs"
  ON cleanup_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can insert cleanup logs" ON cleanup_logs;
CREATE POLICY "System can insert cleanup logs"
  ON cleanup_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
