import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.DATABASE_URL || "";
  try {
    const u = new URL(raw);
    // redact sensitive bits
    const user = u.username ? "***" : "";
    const host = u.hostname;
    const port = u.port || "(default)";
    const dbname = u.pathname;
    const sslmode = new URLSearchParams(u.search).get("sslmode");
    return NextResponse.json({
      ok: true,
      hasEnv: Boolean(raw),
      parsed: { user, host, port, dbname, sslmode }
    });
  } catch {
    return NextResponse.json({
      ok: false,
      hasEnv: Boolean(raw),
      error: "DATABASE_URL is not a valid URL (or empty)"
    });
  }
}
