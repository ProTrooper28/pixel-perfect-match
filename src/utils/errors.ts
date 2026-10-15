/** Error thrown by auth/data services, carrying a user-safe message. */
export class AuthError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuthError";
  }
}

/** Shape of a typical Supabase error payload. */
interface SupabaseErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

function isSupabaseErrorLike(error: unknown): error is SupabaseErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    ("message" in error || "code" in error || "status" in error)
  );
}

/**
 * Map raw Supabase/auth errors to messages that are safe and useful to show in
 * the UI. Unknown errors fall back to a generic message so internals never leak.
 */
export function toAuthMessage(error: unknown): string {
  if (error instanceof AuthError) return error.message;

  if (isSupabaseErrorLike(error)) {
    const message = error.message ?? "";
    const code = error.code ?? "";

    switch (code) {
      case "invalid_credentials":
        return "Incorrect email or password.";
      case "user_already_exists":
        return "An account with this email already exists.";
      case "weak_password":
        return "Password is too weak. Use at least 8 characters.";
      case "email_not_confirmed":
        return "Please confirm your email address before signing in.";
      case "over_email_send_rate_limit":
        return "Too many attempts. Please wait a moment and try again.";
      case "signup_disabled":
        return "Sign-ups are currently disabled.";
      default:
        break;
    }

    // Fall back to well-known message substrings (Supabase varies these).
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials")) return "Incorrect email or password.";
    if (lower.includes("already registered")) return "An account with this email already exists.";
    if (lower.includes("password should be at least")) return "Password is too weak.";
    if (lower.includes("email not confirmed"))
      return "Please confirm your email address before signing in.";
    if (lower.includes("provider is not enabled"))
      return "This sign-in provider is not enabled. Check your Supabase auth settings.";
    if (lower.includes("fetch failed") || lower.includes("network"))
      return "Network error. Check your connection and try again.";
    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;

  return "Something went wrong. Please try again.";
}
