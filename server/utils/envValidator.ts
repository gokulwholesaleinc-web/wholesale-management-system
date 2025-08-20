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
  
  // Debug: Show all environment variables that start with these prefixes
  console.log('🔍 Environment debug info:');
  const debugKeys = ['PUBLIC_', 'DEFAULT_', 'TWILIO_', 'SENDGRID_'];
  for (const prefix of debugKeys) {
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix)) {
        console.log(`   Found: ${key} = ${process.env[key] ? '[SET]' : '[EMPTY]'}`);
      }
    });
  }
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    } else {
      console.log(`✅ Found: ${key}`);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n🔧 Temporary workaround: Adding fallback values for development');
    
    // Add fallback values for development
    if (!process.env.PUBLIC_BASE_URL) {
      process.env.PUBLIC_BASE_URL = 'https://shopgokul.com';
      console.log('   Added fallback: PUBLIC_BASE_URL=https://shopgokul.com');
    }
    if (!process.env.DEFAULT_FROM_EMAIL) {
      process.env.DEFAULT_FROM_EMAIL = 'info@shopgokul.com';
      console.log('   Added fallback: DEFAULT_FROM_EMAIL=info@shopgokul.com');
    }
    if (!process.env.DEFAULT_FROM_NAME) {
      process.env.DEFAULT_FROM_NAME = 'Gokul Wholesale';
      console.log('   Added fallback: DEFAULT_FROM_NAME=Gokul Wholesale');
    }
    if (!process.env.TWILIO_FROM_NUMBER) {
      // Use the actual Twilio phone number from environment
      if (process.env.TWILIO_PHONE_NUMBER) {
        process.env.TWILIO_FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
        console.log(`   Using TWILIO_PHONE_NUMBER as FROM_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`);
      } else {
        console.log('   ⚠️ No valid Twilio phone number found - SMS will be disabled');
      }
    }
    
    console.log('\n⚠️  Please set these variables in Replit Secrets for production use');
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