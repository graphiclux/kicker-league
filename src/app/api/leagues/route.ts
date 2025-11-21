// app/api/leagues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust if you use a different client name
import { requireUserId } from "@/lib/session-user";

export async function POST(req: NextRequest) {
  const { userId } = await requireUserId();

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body?.name ? String(body.name).trim() : "";
  const seasonRaw = body?.seasonYear ?? body?.season;
  const seasonYear =
    typeof seasonRaw === "number"
      ? seasonRaw
      : parseInt(String(seasonRaw || ""), 10) || new Date().getFullYear();

  if (!name) {
    return NextResponse.json(
      { error: "League name is required." },
      { status: 400 }
    );
  }

  try {
    const league = await prisma.league.create({
      data: {
        name,
        seasonYear,
        commissionerId: userId,
        // Add the commissioner as a member as well
        members: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json({ id: league.id });
  } catch (error) {
    console.error("[API] Error creating league:", error);
    return NextResponse.json(
      { error: "Failed to create league." },
      { status: 500 }
    );
  }
}
