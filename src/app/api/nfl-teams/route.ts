import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const teams = await db.nflTeam.findMany({ orderBy: { abbr: "asc" } });
  return NextResponse.json({ ok: true, teams });
}
