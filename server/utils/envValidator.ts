// Boot-time environment validation - fail fast if critical vars missing

const REQUIRED_ENV_VARS = [
  'PUBLIC_BASE_URL',
  'SENDGRID_API_KEY', 
  'DEFAULT_FROM_EMAIL',
  'DEFAULT_FROM_NAME',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_FROM_NUMBER',
  'DATABASE_URL'
] as const;

const OPTIONAL_ENV_VARS = [
  'RESET_TOKEN_TTL_MINUTES', // defaults to 30
  'FEAT_RESET_SMS' // defaults to true
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing required environment variables:');
    missing.forEach(key => console.warn(`   - ${key}`));
    console.warn('Setting fallback values for development...');
    
    // Set fallback values for development
    if (!process.env.PUBLIC_BASE_URL) process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
    if (!process.env.DEFAULT_FROM_EMAIL) process.env.DEFAULT_FROM_EMAIL = 'noreply@example.com';
    if (!process.env.DEFAULT_FROM_NAME) process.env.DEFAULT_FROM_NAME = 'Gokul Wholesale';
    if (!process.env.TWILIO_FROM_NUMBER) process.env.TWILIO_FROM_NUMBER = '+1234567890';
    if (!process.env.SENDGRID_API_KEY) process.env.SENDGRID_API_KEY = 'test_key';
    if (!process.env.TWILIO_ACCOUNT_SID) process.env.TWILIO_ACCOUNT_SID = 'test_sid';
    if (!process.env.TWILIO_AUTH_TOKEN) process.env.TWILIO_AUTH_TOKEN = 'test_token';
    
    console.log('✅ Fallback environment variables set for development');
  }
  
  // Validate PUBLIC_BASE_URL format
  const baseUrl = process.env.PUBLIC_BASE_URL!;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    console.error('❌ PUBLIC_BASE_URL must start with http:// or https://');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
  console.log(`   - Base URL: ${baseUrl}`);
  console.log(`   - Reset TTL: ${process.env.RESET_TOKEN_TTL_MINUTES || '30'} minutes`);
}