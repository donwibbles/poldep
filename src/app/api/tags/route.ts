import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  // Get all unique tags from contacts
  const contacts = await prisma.contact.findMany({
    where: {
      tags: { isEmpty: false },
    },
    select: { tags: true },
  });

  // Flatten and dedupe tags
  const tagSet = new Set<string>();
  for (const contact of contacts) {
    for (const tag of contact.tags) {
      tagSet.add(tag);
    }
  }

  const tags = Array.from(tagSet).sort();

  return NextResponse.json({ tags });
}
