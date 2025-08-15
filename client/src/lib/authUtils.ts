// Authentication utility functions for error handling and user checks

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Error) {
    return isUnauthorizedError(error);
  }
  return false;
}

export function handleAuthError(error: unknown, redirectToLogin = true): boolean {
  if (isAuthenticationError(error)) {
    if (redirectToLogin) {
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
    return true;
  }
  return false;
}