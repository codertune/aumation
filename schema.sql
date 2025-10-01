-- ==============================================
-- schema.sql : Smart Process Flow Database Schema
-- Includes bulk upload system
-- ==============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ======================
-- blog_posts
-- ======================
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar(500) NOT NULL,
    slug varchar(500) UNIQUE NOT NULL,
    content text NOT NULL,
    excerpt text,
    author varchar(255) NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    featured boolean DEFAULT false,
    status varchar(20) DEFAULT 'draft',
    views integer DEFAULT 0,
    meta_title varchar(500),
    meta_description text,
    meta_keywords text,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ======================
-- system_settings
-- ======================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    credits_per_bdt numeric(5,2) DEFAULT 2.0,
    free_trial_credits integer DEFAULT 100,
    min_purchase_credits integer DEFAULT 200,
    enabled_services jsonb DEFAULT '[]'::jsonb,
    service_credits_config jsonb DEFAULT '{}'::jsonb,
    system_notification jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ======================
-- users
-- ======================
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email varchar(255) UNIQUE NOT NULL,
    name varchar(255) NOT NULL,
    company varchar(255) NOT NULL,
    mobile varchar(50) NOT NULL,
    password_hash varchar(255) NOT NULL,
    credits integer DEFAULT 100,
    is_admin boolean DEFAULT false,
    status varchar(20) DEFAULT 'active',
    email_verified boolean DEFAULT false,
    member_since date DEFAULT CURRENT_DATE,
    trial_ends_at date,
    total_spent numeric(10,2) DEFAULT 0,
    last_activity date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ======================
-- work_history
-- ======================
CREATE TABLE IF NOT EXISTS public.work_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    service_id varchar(100) NOT NULL,
    service_name varchar(255) NOT NULL,
    file_name text NOT NULL,
    credits_used integer NOT NULL,
    status varchar(20) DEFAULT 'completed',
    result_files jsonb DEFAULT '[]'::jsonb,
    download_url text,
    expires_at timestamptz, -- added for 7-day cleanup
    created_at timestamptz DEFAULT now()
);

-- ======================
-- bulk_uploads
-- ======================
CREATE TABLE IF NOT EXISTS public.bulk_uploads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id varchar(100) NOT NULL,
    file_name text NOT NULL,
    status varchar(20) DEFAULT 'pending',
    total_rows integer DEFAULT 0,
    success_rows integer DEFAULT 0,
    failed_rows integer DEFAULT 0,
    result_zip_path text,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ======================
-- bulk_upload_items
-- ======================
CREATE TABLE IF NOT EXISTS public.bulk_upload_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bulk_upload_id uuid NOT NULL REFERENCES public.bulk_uploads(id) ON DELETE CASCADE,
    row_number integer NOT NULL,
    input_data jsonb NOT NULL,
    status varchar(20) DEFAULT 'pending',
    error_message text,
    result_file text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ======================
-- service_templates
-- ======================
CREATE TABLE IF NOT EXISTS public.service_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id varchar(100) UNIQUE NOT NULL,
    service_name varchar(255) NOT NULL,
    description text,
    credit_cost numeric(5,2) DEFAULT 1.0,
    template_path text,
    automation_script_path text,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ======================
-- cleanup_logs
-- ======================
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type varchar(50) NOT NULL,
    details text,
    run_at timestamptz DEFAULT now(),
    deleted_count integer DEFAULT 0
);

-- ======================
-- Indexes
-- ======================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_work_history_expires_at ON public.work_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_user_id ON public.bulk_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_items_bulk_id ON public.bulk_upload_items(bulk_upload_id);

-- ======================
-- Enable RLS
-- ======================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust later in app)
CREATE POLICY users_read ON public.users FOR SELECT USING (true);
CREATE POLICY wh_read ON public.work_history FOR SELECT USING (true);
CREATE POLICY bulk_uploads_read ON public.bulk_uploads FOR SELECT USING (true);
CREATE POLICY bulk_upload_items_read ON public.bulk_upload_items FOR SELECT USING (true);
