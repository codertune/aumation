/*
  Smart Process Flow - Seed Data
  -------------------------------
  
  # Initial Seed Data
  
  ## Data Inserted:
  - Default system settings with all services enabled
  - Sample blog posts for the blog section
  
  ## Configuration:
  - Credits per BDT: 2.0
  - Free trial credits: 100
  - Minimum purchase credits: 200
  - All automation services are enabled by default
*/

INSERT INTO system_settings (
    credits_per_bdt, free_trial_credits, min_purchase_credits,
    enabled_services, service_credits_config, system_notification
) 
SELECT 
    2.0, 100, 200,
    '["pdf-excel-converter","webcontainer-demo","ctg-port-tracking","exp-issue","exp-correction","exp-duplicate-reporting","exp-search","damco-booking","damco-booking-download","damco-fcr-submission","damco-fcr-extractor","damco-edoc-upload","hm-einvoice-create","hm-einvoice-download","hm-einvoice-correction","hm-packing-list","bepza-ep-issue","bepza-ep-submission","bepza-ep-download","bepza-ip-issue","bepza-ip-submit","bepza-ip-download","cash-incentive-application","damco-tracking-maersk","myshipment-tracking","egm-download","custom-tracking"]'::jsonb,
    '{"pdf-excel-converter":1,"ctg-port-tracking":1,"exp-issue":2,"exp-correction":1.5,"exp-duplicate-reporting":2,"exp-search":0.5,"damco-booking":3,"damco-booking-download":1,"damco-fcr-submission":2,"damco-fcr-extractor":1.5,"damco-edoc-upload":1,"hm-einvoice-create":2,"hm-einvoice-download":1,"hm-einvoice-correction":1.5,"hm-packing-list":1,"bepza-ep-issue":2.5,"bepza-ep-submission":2,"bepza-ep-download":1,"bepza-ip-issue":2.5,"bepza-ip-submit":2,"bepza-ip-download":1,"cash-incentive-application":3,"damco-tracking-maersk":1,"myshipment-tracking":1,"egm-download":1,"custom-tracking":1.5}'::jsonb,
    '{"enabled": false, "message": "", "type": "info", "showToAll": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

INSERT INTO blog_posts (
    title, slug, content, excerpt, author, tags, featured, status, views,
    meta_title, meta_description, meta_keywords, published_at
) 
SELECT 
    'Welcome to Smart Process Flow Blog',
    'welcome-to-smart-process-flow',
    '<div class="blog-content"><h2>Welcome</h2><p>Smart Process Flow is revolutionizing automation.</p></div>',
    'Discover how Smart Process Flow is transforming business automation in Bangladesh.',
    'Smart Process Flow Team',
    ARRAY['automation', 'bangladesh', 'business', 'processes'],
    true, 'published', 245,
    'Welcome to Smart Process Flow',
    'Learn about Smart Process Flow automation.',
    'automation, bangladesh, export',
    now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'welcome-to-smart-process-flow');

INSERT INTO blog_posts (
    title, slug, content, excerpt, author, tags, featured, status, views,
    meta_title, meta_description, meta_keywords, published_at
) 
SELECT 
    'How to Automate Your Export Documentation',
    'automate-export-documentation',
    '<div class="blog-content"><h2>Export Docs</h2><p>Automation saves time and reduces errors.</p></div>',
    'Learn how to automate export documentation.',
    'Automation Expert',
    ARRAY['export', 'documentation', 'automation', 'tutorial'],
    false, 'published', 189,
    'How to Automate Export Documentation',
    'Step-by-step automation guide.',
    'export, documentation, automation',
    now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'automate-export-documentation');