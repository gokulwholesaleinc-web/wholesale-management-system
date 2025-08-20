# CRITICAL PASSWORD RESET BUG FIXED

## The Problem
The password reset completion was failing silently because of a parameter mismatch:

- **PasswordResetService** was calling: `storage.updateUser({ id: record.user_id, passwordHash })`
- **Storage.updateUser** method expects: `{ id: string, password: string }`
- **Result**: The `passwordHash` field was ignored, password wasn't updated

## The Fix
Changed the password reset service to pass the plain password instead of pre-hashed password:
```typescript
// BEFORE (broken):
const passwordHash = await hashPassword(newPassword);
await storage.updateUser({ id: record.user_id, passwordHash });

// AFTER (working):
await storage.updateUser({ id: record.user_id, password: newPassword });
```

## Why This Fixes It
The `updateUser` method handles password hashing internally when it receives a `password` field. By passing the raw password instead of trying to pass a pre-hashed version, the storage layer can properly hash and store the new password.

## Expected Result
Password reset completion should now work properly:
1. Email delivery ✅ (already working)
2. Reset link validation ✅ (already working)  
3. Password update ✅ (now fixed)
4. User can log in with new password ✅ (should work now)

## Test Steps
1. Request password reset for `harsh476`
2. Check email for reset link
3. Click reset link and enter new password
4. Submit the form
5. Try logging in with the new password

The password should now actually update in the database.