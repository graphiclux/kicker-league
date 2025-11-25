// src/lib/redirect.ts
// Small helper for safely constraining callback URLs to internal paths.

export function getSafeCallbackUrl(
  raw: string | null | undefined,
  defaultPath: string = "/dashboard"
): string {
  if (!raw) return defaultPath;

  try {
    // Only allow simple path-style callback URLs like "/dashboard" or "/leagues/123"
    // No protocol, no "//", no API auth paths.
    if (!raw.startsWith("/") || raw.startsWith("//")) {
      return defaultPath;
    }

    // Optional: block auth API paths as callback destinations
    if (raw.startsWith("/api/auth")) {
      return defaultPath;
    }

    return raw;
  } catch {
    return defaultPath;
  }
}
