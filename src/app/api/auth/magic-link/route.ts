import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { magicLinkSchema } from "@/lib/validations/user";
import { EMAIL_FROM } from "@/lib/email-config";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = magicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({ success: true });

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return successResponse;
  }

  // Rate limit: 1 token per email per minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentToken = await prisma.magicLink.findFirst({
    where: {
      email,
      createdAt: { gte: oneMinuteAgo },
    },
  });
  if (recentToken) {
    return successResponse;
  }

  // Generate token and store
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.magicLink.create({
    data: { token, email, expiresAt },
  });

  // Build verify URL
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;

  // Send email via Resend
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Sign in to UFW CRM",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Sign in to UFW CRM</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes.</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Sign in
        </a>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return successResponse;
}
