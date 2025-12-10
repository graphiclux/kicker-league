// src/lib/cronAuth.ts
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If no secret configured, allow everything (optional: you can change this to false)
    return true;
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  return token === secret;
}
