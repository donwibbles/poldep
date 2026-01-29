import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  // Get distinct cycles from elections
  const elections = await prisma.election.findMany({
    select: { cycle: true },
    distinct: ["cycle"],
    orderBy: { cycle: "desc" },
  });

  const cycles = elections.map((e) => e.cycle);

  return NextResponse.json({ cycles });
}
