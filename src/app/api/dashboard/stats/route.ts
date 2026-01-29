import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { subDays, addDays, startOfDay, format } from "date-fns";
import { getCurrentCycle } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const cycle = searchParams.get("cycle") || getCurrentCycle();

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sevenDaysAgo = subDays(now, 7);

  // Parallel queries for performance
  const [
    // Contact stats
    contactCounts,
    contactsThisWeek,
    contactGrowth,
    // Endorsement stats
    endorsementCounts,
    pipelineCounts,
    // Campaign stats
    campaignStats,
    // Task stats
    taskStats,
    overdueTaskCount,
    // Upcoming elections
    upcomingElections,
    // Recent activity
    recentActivity,
  ] = await Promise.all([
    // Total contacts by type
    prisma.contact.groupBy({
      by: ["type"],
      _count: true,
    }),

    // Contacts created this week
    prisma.contact.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),

    // Contact growth by day (last 30 days)
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Contact"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,

    // Endorsement counts by decision (filtered by cycle)
    prisma.endorsement.groupBy({
      by: ["decision"],
      where: {
        race: {
          election: { cycle },
        },
      },
      _count: true,
    }),

    // Pipeline stage counts (filtered by cycle)
    prisma.pipelineStage.findMany({
      orderBy: { order: "asc" },
      include: {
        endorsements: {
          where: {
            race: {
              election: { cycle },
            },
          },
          select: { id: true },
        },
      },
    }),

    // Campaign aggregate stats
    prisma.campaign.aggregate({
      _sum: {
        totalSent: true,
        totalOpened: true,
        totalClicked: true,
        totalBounced: true,
      },
      _count: true,
    }),

    // Task counts by status
    prisma.task.groupBy({
      by: ["status"],
      _count: true,
    }),

    // Overdue tasks
    prisma.task.count({
      where: {
        status: "PENDING",
        dueDate: { lt: now },
      },
    }),

    // Upcoming elections (next 90 days)
    prisma.election.findMany({
      where: {
        date: {
          gte: now,
          lte: addDays(now, 90),
        },
      },
      orderBy: { date: "asc" },
      take: 5,
      include: {
        races: {
          include: {
            endorsements: {
              select: { decision: true },
            },
          },
        },
      },
    }),

    // Recent activity
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
      },
    }),
  ]);

  // Format contact counts by type
  const contactsByType: Record<string, number> = {};
  contactCounts.forEach((c) => {
    contactsByType[c.type] = c._count;
  });
  const totalContacts = Object.values(contactsByType).reduce((a, b) => a + b, 0);

  // Format contact growth for chart
  const contactGrowthData = contactGrowth.map((row) => ({
    date: format(new Date(row.date), "MMM d"),
    count: Number(row.count),
  }));

  // Format endorsement counts
  const endorsementsByDecision: Record<string, number> = {};
  endorsementCounts.forEach((e) => {
    endorsementsByDecision[e.decision] = e._count;
  });
  const activeEndorsements =
    (endorsementsByDecision["PENDING"] || 0);
  const totalEndorsements = Object.values(endorsementsByDecision).reduce(
    (a, b) => a + b,
    0
  );

  // Format pipeline data
  const pipelineData = pipelineCounts.map((stage) => ({
    name: stage.name,
    color: stage.color,
    count: stage.endorsements.length,
    isFinal: stage.isFinal,
  }));

  // Calculate campaign stats
  const totalSent = campaignStats._sum.totalSent || 0;
  const totalOpened = campaignStats._sum.totalOpened || 0;
  const totalClicked = campaignStats._sum.totalClicked || 0;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  // Format task counts
  const tasksByStatus: Record<string, number> = {};
  taskStats.forEach((t) => {
    tasksByStatus[t.status] = t._count;
  });
  const pendingTasks = tasksByStatus["PENDING"] || 0;
  const completedTasks = tasksByStatus["DONE"] || 0;
  const completionRate =
    pendingTasks + completedTasks > 0
      ? Math.round((completedTasks / (pendingTasks + completedTasks)) * 100)
      : 0;

  // Format upcoming elections
  const electionsData = upcomingElections.map((election) => {
    const totalRaces = election.races.length;
    const endorsedRaces = election.races.filter(
      (r) => r.endorsements.some((e) => e.decision === "ENDORSED")
    ).length;
    const pendingRaces = election.races.filter(
      (r) => r.endorsements.some((e) => e.decision === "PENDING")
    ).length;

    return {
      id: election.id,
      name: election.name,
      type: election.type,
      date: election.date,
      totalRaces,
      endorsedRaces,
      pendingRaces,
      coveragePercent:
        totalRaces > 0 ? Math.round((endorsedRaces / totalRaces) * 100) : 0,
    };
  });

  // Format recent activity
  const activityData = recentActivity.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    summary: a.summary,
    userName: a.user.name,
    createdAt: a.createdAt,
  }));

  return NextResponse.json({
    cycle,
    contacts: {
      total: totalContacts,
      byType: contactsByType,
      thisWeek: contactsThisWeek,
      growth: contactGrowthData,
    },
    endorsements: {
      total: totalEndorsements,
      active: activeEndorsements,
      byDecision: endorsementsByDecision,
      pipeline: pipelineData,
    },
    campaigns: {
      totalCampaigns: campaignStats._count,
      totalSent,
      totalOpened,
      totalClicked,
      openRate,
      clickRate,
    },
    tasks: {
      pending: pendingTasks,
      completed: completedTasks,
      overdue: overdueTaskCount,
      completionRate,
    },
    upcomingElections: electionsData,
    recentActivity: activityData,
  });
}
