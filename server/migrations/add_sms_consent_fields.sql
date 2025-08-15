-- Add SMS consent and privacy policy compliance fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sms_consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_consent_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS sms_consent_method VARCHAR(255),
ADD COLUMN IF NOT EXISTS sms_consent_ip_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS sms_opt_out_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS sms_opt_out_method VARCHAR(255),
ADD COLUMN IF NOT EXISTS marketing_sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transactional_sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(255),
ADD COLUMN IF NOT EXISTS privacy_policy_accepted_date TIMESTAMP;

-- Create indexes for performance on SMS consent lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_consent ON users(phone, sms_consent_given);
CREATE INDEX IF NOT EXISTS idx_users_sms_consent_date ON users(sms_consent_date);
CREATE INDEX IF NOT EXISTS idx_users_privacy_policy ON users(privacy_policy_accepted);