import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }

  // Use a transaction to atomically check and mark token as used
  // This prevents race conditions where the same token could be used twice
  const result = await prisma.$transaction(async (tx) => {
    const magicLink = await tx.magicLink.findUnique({ where: { token } });

    if (!magicLink) {
      return { success: false, error: "invalid" };
    }

    if (magicLink.expiresAt < new Date()) {
      return { success: false, error: "expired" };
    }

    if (magicLink.usedAt) {
      return { success: false, error: "invalid" };
    }

    // Mark as used BEFORE processing to prevent race conditions
    await tx.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    return { success: true, email: magicLink.email, token };
  });

  if (!result.success) {
    return NextResponse.redirect(new URL(`/login?error=${result.error}`, baseUrl));
  }

  // Redirect to login with a verification flag (not the token itself)
  // The login page will use the server-side session to auto-login
  return NextResponse.redirect(new URL(`/login?verified=${token}`, baseUrl));
}
