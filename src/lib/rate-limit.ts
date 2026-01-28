import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { NextResponse } from "next/server";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, remaining, reset } = await ratelimit.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }
  return null;
}

const digestRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "digest",
  analytics: true,
});

export async function checkDigestRateLimit(identifier: string) {
  const { success } = await digestRatelimit.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429 }
    );
  }
  return null;
}
