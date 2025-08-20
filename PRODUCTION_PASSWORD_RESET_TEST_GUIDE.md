# Production Password Reset Test Guide 🧪

## Prerequisites
1. Deploy with environment variables set in **Replit Deployment Secrets**:
   ```
   APP_URL=https://shopgokul.com
   NODE_ENV=production
   CORS_ALLOWED_ORIGINS=https://shopgokul.com
   ```

## Testing Workflow

### Step 1: Deploy & Monitor Logs
1. **Deploy the application** with updated configuration
2. **Open server logs** in Replit deployment dashboard
3. **Keep logs visible** during testing to monitor URL generation

### Step 2: Trigger Password Reset
1. **Go to**: `https://shopgokul.com`
2. **Navigate to login page** (or password reset form)
3. **Enter a valid user identifier** (email/username/phone)
4. **Submit password reset request**

### Step 3: Verify Server Logs
**Expected log output:**
```
[RESET] sending URL -> https://shopgokul.com/reset-password?token=ABC123XYZ...
```

**❌ FAIL if you see:**
- `localhost:3000` or `localhost:5000`
- Replit development URLs
- Missing token parameter
- Error messages about missing environment variables

### Step 4: Test Raw URL (Bypasses Tracking)
1. **Copy the exact URL** from server logs: 
   `https://shopgokul.com/reset-password?token=ABC123XYZ...`
2. **Open in new tab/incognito window**
3. **Verify page loads** properly at shopgokul.com domain
4. **Test password reset functionality**

**✅ SUCCESS if:**
- Page loads on shopgokul.com (not localhost)
- Token is recognized and valid
- Password reset form works
- No CORS errors in browser console

### Step 5: Test Email Button (With Tracking)
1. **Check email inbox** for password reset email
2. **Click the blue "Reset your password" button**
3. **Verify final destination** after any SendGrid redirects

**✅ SUCCESS if:**
- Email button eventually lands on `shopgokul.com/reset-password?token=...`
- Same token as server logs
- Functionality works identically to raw URL test

### Step 6: SMS Testing (If Applicable)
1. **Test SMS password reset** if phone numbers are configured
2. **Verify SMS contains**: `https://shopgokul.com/reset-password?token=...`
3. **Click SMS link** and verify functionality

## Troubleshooting Common Issues

### Issue: Still getting localhost URLs
**Solution**: Environment variables not set in deployment (only workspace)
- Set `APP_URL=https://shopgokul.com` in **Deployment Secrets**
- Redeploy application

### Issue: CORS errors
**Solution**: Missing CORS configuration
- Set `CORS_ALLOWED_ORIGINS=https://shopgokul.com` in **Deployment Secrets**
- Verify production origin matching

### Issue: Token not working
**Solution**: Clock/session issues
- Verify server time is correct
- Check token expiration (15 minutes)
- Test with fresh token

### Issue: SendGrid tracking breaks links
**Solution**: Already implemented
- `disableTracking: true` is configured
- Should work properly now

## Expected Results Summary

**✅ All tests should show:**
1. Server logs: `[RESET] sending URL -> https://shopgokul.com/...`
2. Raw URL test: Works perfectly on shopgokul.com
3. Email button: Eventually redirects to shopgokul.com
4. SMS links: Point directly to shopgokul.com
5. No localhost references anywhere
6. No CORS errors in browser console

**🎉 Success Criteria Met:**
- Password reset emails/SMS generate correct production URLs
- Links work from both email and SMS channels
- No development artifacts in production
- Secure, professional user experience

## Next Steps After Successful Testing
- Remove debug logging if desired
- Monitor for any edge cases
- Document any domain-specific configurations needed
- Update user-facing documentation with correct reset flow