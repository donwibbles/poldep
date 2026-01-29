import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  // Get initiatives where this contact is a target
  const targets = await prisma.initiativeTarget.findMany({
    where: { contactId: id },
    include: {
      initiative: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          goalDate: true,
          createdAt: true,
          _count: {
            select: { targets: true, communications: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // For elected officials, also get communications to their staff that are linked to initiatives
  const contact = await prisma.contact.findUnique({
    where: { id },
    select: {
      type: true,
      parentAssignments: {
        where: { endDate: null },
        select: {
          staffContact: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  let staffCommunicationsByInitiative: Record<
    string,
    { staffName: string; count: number }[]
  > = {};

  if (
    contact &&
    ["ELECTED_OFFICIAL", "CANDIDATE"].includes(contact.type) &&
    contact.parentAssignments.length > 0
  ) {
    const staffIds = contact.parentAssignments.map((a) => a.staffContact.id);

    // Get communications to staff that are linked to initiatives where this contact is a target
    const initiativeIds = targets.map((t) => t.initiativeId);

    if (initiativeIds.length > 0) {
      const staffComms = await prisma.communication.findMany({
        where: {
          initiativeId: { in: initiativeIds },
          contacts: {
            some: { contactId: { in: staffIds } },
          },
        },
        select: {
          initiativeId: true,
          contacts: {
            where: { contactId: { in: staffIds } },
            select: {
              contact: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      // Group by initiative
      for (const comm of staffComms) {
        if (!comm.initiativeId) continue;
        if (!staffCommunicationsByInitiative[comm.initiativeId]) {
          staffCommunicationsByInitiative[comm.initiativeId] = [];
        }
        for (const cc of comm.contacts) {
          const staffName = `${cc.contact.firstName} ${cc.contact.lastName}`;
          const existing = staffCommunicationsByInitiative[
            comm.initiativeId
          ].find((s) => s.staffName === staffName);
          if (existing) {
            existing.count++;
          } else {
            staffCommunicationsByInitiative[comm.initiativeId].push({
              staffName,
              count: 1,
            });
          }
        }
      }
    }
  }

  // Combine target data with staff communications
  const initiatives = targets.map((target) => ({
    target: {
      id: target.id,
      responseStatus: target.responseStatus,
      responseDate: target.responseDate,
      responseNotes: target.responseNotes,
      priority: target.priority,
      touchCount: target.touchCount,
      firstContactDate: target.firstContactDate,
      lastContactDate: target.lastContactDate,
    },
    initiative: target.initiative,
    staffCommunications:
      staffCommunicationsByInitiative[target.initiativeId] || [],
  }));

  return NextResponse.json({ initiatives });
}
