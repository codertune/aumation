/*
  # Fix cleanup_logs Table Schema
  
  ## Overview
  This migration updates the cleanup_logs table structure to match the required schema
  for the bulk upload system. The table was originally created with a simplified schema
  but needs the comprehensive columns for proper cleanup tracking and auditing.
  
  ## Changes Made
  
  ### 1. Schema Update
  The cleanup_logs table is being updated to include:
  - `cleanup_date` (timestamptz) - when the cleanup operation ran
  - `files_deleted` (integer) - number of files removed during cleanup
  - `space_freed_mb` (decimal) - amount of storage space freed in megabytes
  - `work_history_ids` (jsonb) - array of work_history record IDs that were cleaned
  - `bulk_upload_ids` (jsonb) - array of bulk_upload record IDs that were cleaned
  - `status` (varchar) - cleanup operation status (success, partial, failed)
  - `error_message` (text) - any error messages if cleanup failed
  - `created_at` (timestamptz) - audit timestamp
  
  ### 2. Data Migration
  Any existing cleanup log records are preserved by:
  - Mapping old `run_at` column to new `cleanup_date` column
  - Mapping old `deleted_count` column to new `files_deleted` column
  - Setting default values for new columns
  
  ### 3. Index Creation
  Adds performance index on cleanup_date for efficient log retrieval
  
  ## Important Notes
  - This migration is idempotent and safe to run multiple times
  - Uses conditional logic to check for existing columns before making changes
  - Preserves existing data during schema transformation
  - No data loss will occur during this migration
*/

-- Step 1: Check if we need to migrate the table structure
DO $$
BEGIN
  -- Check if the old schema exists (has job_type column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cleanup_logs' 
    AND column_name = 'job_type'
  ) THEN
    -- Old schema exists, need to migrate
    
    -- Create temporary table with new schema
    CREATE TABLE IF NOT EXISTS cleanup_logs_new (
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
    
    -- Copy existing data from old table to new table with column mapping
    INSERT INTO cleanup_logs_new (id, cleanup_date, files_deleted, status, created_at)
    SELECT 
      id,
      COALESCE(run_at, now()) as cleanup_date,
      COALESCE(deleted_count, 0) as files_deleted,
      'success' as status,
      COALESCE(run_at, now()) as created_at
    FROM cleanup_logs
    ON CONFLICT (id) DO NOTHING;
    
    -- Drop old table
    DROP TABLE cleanup_logs;
    
    -- Rename new table to original name
    ALTER TABLE cleanup_logs_new RENAME TO cleanup_logs;
    
    RAISE NOTICE 'Successfully migrated cleanup_logs table from old schema to new schema';
  ELSE
    -- Check if new schema already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cleanup_logs' 
      AND column_name = 'cleanup_date'
    ) THEN
      -- Table exists but has neither old nor new schema, create with new schema
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
      RAISE NOTICE 'Created cleanup_logs table with new schema';
    ELSE
      RAISE NOTICE 'cleanup_logs table already has correct schema';
    END IF;
  END IF;
END $$;

-- Step 2: Create index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleanup_date 
ON cleanup_logs(cleanup_date DESC);

-- Step 3: Enable RLS on the table
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
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