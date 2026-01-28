import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }

  const magicLink = await prisma.magicLink.findUnique({ where: { token } });

  if (!magicLink) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }

  if (magicLink.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired", baseUrl));
  }

  if (magicLink.usedAt) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  // Redirect to login with token for auto-login
  return NextResponse.redirect(new URL(`/login?token=${token}`, baseUrl));
}
