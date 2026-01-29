import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";

// Communication types that expect responses (outbound communications)
const TRACKABLE_TYPES = [
  "EMAIL",
  "PHONE_CALL",
  "LEFT_VOICEMAIL",
  "LETTER_MAILER",
  "TEXT",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  // Get all communications for this contact
  const communicationContacts = await prisma.communicationContact.findMany({
    where: { contactId: id },
    include: {
      communication: {
        select: {
          type: true,
          responseStatus: true,
        },
      },
    },
  });

  // Filter to trackable outbound communications
  const trackable = communicationContacts.filter(
    (cc) => TRACKABLE_TYPES.includes(cc.communication.type)
  );

  const totalOutreach = trackable.length;
  const responded = trackable.filter(
    (cc) => cc.communication.responseStatus === "RESPONDED"
  ).length;
  const noResponse = trackable.filter(
    (cc) => cc.communication.responseStatus === "NO_RESPONSE"
  ).length;
  const awaiting = trackable.filter(
    (cc) => cc.communication.responseStatus === "AWAITING"
  ).length;

  // Response rate = responded / (responded + noResponse) * 100
  // Only calculate if we have definitive outcomes
  const definitiveOutcomes = responded + noResponse;
  const responseRate = definitiveOutcomes > 0
    ? Math.round((responded / definitiveOutcomes) * 100)
    : null;

  return NextResponse.json({
    totalOutreach,
    responded,
    noResponse,
    awaiting,
    responseRate,
  });
}
