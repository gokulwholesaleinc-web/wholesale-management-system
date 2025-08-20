# Production Deployment Environment Variables

## Required Environment Variables for Production

Set these in your **Replit Deployment Secrets** panel (not just the workspace):

### Basic Configuration
```ini
# Core application settings
APP_URL=https://shopgokul.com
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://shopgokul.com

# Database and authentication
DATABASE_URL=[your production database URL]
SESSION_SECRET=[secure random string]

# Email service
SENDGRID_API_KEY=[your SendGrid API key]
```

### Alternative Deployment Scenarios

#### Single Domain Deployment (Most Common)
```ini
APP_URL=https://shopgokul.com
FRONTEND_PUBLIC_URL=https://shopgokul.com
NODE_ENV=production
```

#### Separate Frontend/Backend Domains
```ini
BACKEND_PUBLIC_URL=https://api.shopgokul.com
FRONTEND_PUBLIC_URL=https://shopgokul.com
NODE_ENV=production
```

## Fail-Fast Security

The system will **throw an error on startup** in production if required environment variables are missing. This prevents:
- Accidentally sending localhost links in production emails
- Silent fallback to development configurations
- Security vulnerabilities from misconfiguration

## Testing the Configuration

After deployment, trigger a password reset to verify:
1. Console logs show: `[RESET] sending URL -> https://shopgokul.com/reset-password?token=...`
2. Email links point to your production domain
3. No localhost URLs appear anywhere

## Current Implementation

The URL builder follows this priority:
1. `FRONTEND_PUBLIC_URL` (for separate frontend hosting)
2. `APP_URL` (for single-domain deployments)  
3. **Production**: Throws error if neither is set
4. **Development**: Falls back to shopgokul.com for testing