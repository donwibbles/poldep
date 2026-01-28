import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({ users });
}
