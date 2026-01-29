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
  const searchParams = request.nextUrl.searchParams;
  const targetId = searchParams.get("targetId") || "";

  const initiative = await prisma.outreachInitiative.findUnique({
    where: { id },
    include: {
      targets: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              // Get staff assigned to this official
              parentAssignments: {
                where: { endDate: null },
                select: {
                  staffContact: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  // Build a map of official IDs to their staff IDs
  const targets = targetId
    ? initiative.targets.filter((t) => t.id === targetId)
    : initiative.targets;

  const targetContactIds = targets.map((t) => t.contactId);
  const staffContactIds: string[] = [];
  const staffToOfficialMap: Record<string, string> = {};

  for (const target of targets) {
    for (const assignment of target.contact.parentAssignments) {
      staffContactIds.push(assignment.staffContact.id);
      staffToOfficialMap[assignment.staffContact.id] = target.contactId;
    }
  }

  // Get all relevant contact IDs (officials + their staff)
  const allContactIds = [...targetContactIds, ...staffContactIds];

  // Get all communications linked to this initiative that involve these contacts
  const communications = await prisma.communication.findMany({
    where: {
      initiativeId: id,
      contacts: {
        some: {
          contactId: { in: allContactIds },
        },
      },
    },
    include: {
      contacts: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  // Annotate communications with "via" information for staff roll-up
  const annotatedComms = communications.map((comm) => {
    const commContacts = comm.contacts.map((cc) => cc.contact);
    const directOfficials = commContacts.filter((c) =>
      targetContactIds.includes(c.id)
    );
    const staffContacts = commContacts.filter((c) =>
      staffContactIds.includes(c.id)
    );

    // Determine which official this communication rolls up to
    let rolledUpTo: string | null = null;
    let viaStaff: { id: string; name: string } | null = null;

    if (directOfficials.length > 0) {
      rolledUpTo = directOfficials[0].id;
    } else if (staffContacts.length > 0) {
      const staffContact = staffContacts[0];
      rolledUpTo = staffToOfficialMap[staffContact.id] || null;
      viaStaff = {
        id: staffContact.id,
        name: `${staffContact.firstName} ${staffContact.lastName}`,
      };
    }

    return {
      ...comm,
      rolledUpToContactId: rolledUpTo,
      viaStaff,
    };
  });

  // Group by target if requested
  if (targetId) {
    return NextResponse.json({ communications: annotatedComms });
  }

  // Group communications by target
  const commsByTarget: Record<string, typeof annotatedComms> = {};
  for (const target of targets) {
    commsByTarget[target.contactId] = [];
  }

  for (const comm of annotatedComms) {
    if (comm.rolledUpToContactId && commsByTarget[comm.rolledUpToContactId]) {
      commsByTarget[comm.rolledUpToContactId].push(comm);
    }
  }

  return NextResponse.json({
    communications: annotatedComms,
    communicationsByTarget: commsByTarget,
    targetContactIds,
    staffContactIds,
  });
}
