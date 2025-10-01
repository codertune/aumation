-- ==============================================
-- seed.sql : Initial Data
-- ==============================================

-- Insert default system settings
INSERT INTO public.system_settings (
    credits_per_bdt, free_trial_credits, min_purchase_credits,
    enabled_services, service_credits_config, system_notification
) VALUES (
    2.0, 100, 200,
    '["ctg-port-tracking","exp-issue","exp-correction","exp-duplicate-reporting","exp-search","damco-booking","damco-booking-download","damco-fcr-submission","damco-fcr-extractor","damco-edoc-upload","hm-einvoice-create","hm-einvoice-download","hm-einvoice-correction","hm-packing-list","bepza-ep-issue","bepza-ep-submission","bepza-ep-download","bepza-ip-issue","bepza-ip-submit","bepza-ip-download","cash-incentive-application","damco-tracking-maersk","myshipment-tracking","egm-download","custom-tracking","pdf-excel-converter"]',
    '{"exp-issue":2,"exp-search":0.5,"egm-download":1,"damco-booking":3,"bepza-ep-issue":2.5,"bepza-ip-issue":2.5,"exp-correction":1.5,"bepza-ip-submit":2,"custom-tracking":1.5,"hm-packing-list":1,"bepza-ep-download":1,"bepza-ip-download":1,"ctg-port-tracking":1,"damco-edoc-upload":1,"hm-einvoice-create":2,"bepza-ep-submission":2,"damco-fcr-extractor":1.5,"myshipment-tracking":1,"pdf-excel-converter":1,"damco-fcr-submission":2,"hm-einvoice-download":1,"damco-tracking-maersk":1,"damco-booking-download":1,"hm-einvoice-correction":1.5,"exp-duplicate-reporting":2,"cash-incentive-application":3}',
    '{"type":"info","enabled":false,"message":"","showToAll":true}'
) ON CONFLICT DO NOTHING;

-- Insert sample service templates
INSERT INTO public.service_templates (service_id, service_name, description, credit_cost, template_path)
VALUES
('damco-tracking-maersk', 'Damco Tracking - Maersk', 'Track FCR numbers from Maersk portal', 1, '/public/templates/damco-tracking-maersk-template.csv'),
('ctg-port-tracking', 'CTG Port Tracking', 'Track shipments in Chittagong Port', 1, '/public/templates/ctg-port-tracking-template.csv'),
('myshipment-tracking', 'My Shipment Tracking', 'Track shipments globally', 1, '/public/templates/myshipment-tracking-template.csv'),
('egm-download', 'EGM Download', 'Download Export General Manifest', 1, '/public/templates/egm-download-template.csv'),
('custom-tracking', 'Custom Tracking', 'Track customs data', 1.5, '/public/templates/custom-tracking-template.csv'),
('bb-exp-issue', 'Bangladesh Bank EXP Issue', 'Issue EXP from BB Online', 2, '/public/templates/bb-exp-issue-template.csv'),
('bb-exp-correction', 'Bangladesh Bank EXP Correction', 'Correct EXP entries', 1.5, '/public/templates/bb-exp-correction-template.csv'),
('bb-exp-duplicate', 'Bangladesh Bank EXP Duplicate', 'Duplicate EXP entries', 2, '/public/templates/bb-exp-duplicate-template.csv'),
('bb-exp-search', 'Bangladesh Bank EXP Search', 'Search EXP entries', 0.5, '/public/templates/bb-exp-search-template.csv'),
('damco-booking', 'Damco Booking', 'Manage Damco booking automation', 3, '/public/templates/damco-booking-template.csv'),
('cash-incentive-application', 'Cash Incentive Application', 'Submit Cash Incentive request', 3, '/public/templates/cash-incentive-application-template.csv'),
('pdf-excel-converter', 'PDF to Excel Converter', 'Convert PDF documents to Excel', 1, '/public/templates/pdf-to-excel-template.csv')
ON CONFLICT (service_id) DO NOTHING;

-- Insert demo admin user (replace password_hash with bcrypt hash of your choice)
INSERT INTO public.users (email, name, company, mobile, password_hash, is_admin, status, email_verified)
VALUES ('admin@smartprocessflow.com', 'Admin User', 'Smart Process Flow', '0123456789', '$2a$10$abcdefghijklmnopqrstuv', true, 'active', true)
ON CONFLICT (email) DO NOTHING;
