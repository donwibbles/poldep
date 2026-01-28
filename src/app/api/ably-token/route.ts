import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth-helpers";
import Ably from "ably";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json({ error: "Ably not configured" }, { status: 503 });
  }

  const client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: session!.user.id,
    capability: { "crm:*": ["subscribe"] },
  });

  return NextResponse.json(tokenRequest);
}
