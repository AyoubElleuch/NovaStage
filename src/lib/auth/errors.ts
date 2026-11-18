/** Provider/network failures are retryable; they are not evidence of a bad password. */
export function signInErrorMessage(error: { name?: string; status?: number; code?: string }): string {
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || (error.status ?? 0) >= 500) {
    return "Sign-in is temporarily unavailable. Please try again shortly. Your password has not been checked.";
  }
  if (error.status === 429) return "Too many sign-in requests. Please wait a moment and try again.";
  return "The email or password you entered is incorrect.";
}
