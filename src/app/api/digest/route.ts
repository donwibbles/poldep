import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { checkDigestRateLimit } from "@/lib/rate-limit";
import { format, subDays, subWeeks } from "date-fns";
import { buildDigestHtml } from "@/lib/email-templates/digest";

export async function POST(request: NextRequest) {
  // Bearer token auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.DIGEST_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkDigestRateLimit("digest-endpoint");
  if (rateLimitResponse) return rateLimitResponse;

  const searchParams = request.nextUrl.searchParams;
  const frequency = searchParams.get("frequency");

  if (frequency !== "DAILY" && frequency !== "WEEKLY") {
    return NextResponse.json({ error: "Invalid frequency. Use DAILY or WEEKLY." }, { status: 400 });
  }

  const users = await prisma.digestPreference.findMany({
    where: { frequency },
    include: { user: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ message: "No users subscribed to this digest frequency." });
  }

  const now = new Date();
  const since = frequency === "DAILY" ? subDays(now, 1) : subWeeks(now, 1);
  const dateRange = `${format(since, "MMM d")} – ${format(now, "MMM d, yyyy")}`;

  const [recentActivity, upcomingTasks, pipelineSummary] = await Promise.all([
    prisma.activityLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { status: "PENDING", dueDate: { lte: subDays(new Date(), -7) } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: { assignedTo: { select: { name: true } } },
    }),
    prisma.pipelineStage.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { endorsements: true } } },
    }),
  ]);

  // Plain text fallback
  const activityList = recentActivity.map((a) => `- ${a.summary} (${a.user.name})`).join("\n") || "No recent activity.";
  const taskList = upcomingTasks.map((t) => `- ${t.title}${t.dueDate ? ` (due ${format(t.dueDate, "MMM d")})` : ""}`).join("\n") || "No upcoming tasks.";
  const pipelineList = pipelineSummary.map((s) => `- ${s.name}: ${s._count.endorsements}`).join("\n");
  const emailBody = `UFW CRM ${frequency.toLowerCase()} Digest - ${format(now, "MMM d, yyyy")}\n\nRecent Activity:\n${activityList}\n\nUpcoming Tasks:\n${taskList}\n\nEndorsement Pipeline:\n${pipelineList}`;

  // Structured HTML email
  const htmlBody = buildDigestHtml({
    frequency: frequency === "DAILY" ? "Daily" : "Weekly",
    dateRange,
    activities: recentActivity.map((a) => ({
      summary: a.summary,
      userName: a.user.name,
      action: a.action,
      createdAt: a.createdAt,
    })),
    tasks: upcomingTasks.map((t) => ({
      title: t.title,
      dueDate: t.dueDate,
      assigneeName: t.assignedTo?.name ?? null,
    })),
    pipelineStages: pipelineSummary.map((s) => ({
      name: s.name,
      color: s.color,
      count: s._count.endorsements,
    })),
  });

  const results = [];
  for (const pref of users) {
    try {
      await getResend().emails.send({
        from: "UFW CRM <info@bigperro.dev>",
        to: pref.user.email,
        subject: `UFW CRM ${frequency.toLowerCase()} digest - ${format(now, "MMM d, yyyy")}`,
        html: htmlBody,
        text: emailBody,
      });
      results.push({ email: pref.user.email, status: "sent" });
    } catch (err) {
      results.push({ email: pref.user.email, status: "failed" });
    }
  }

  return NextResponse.json({ results });
}
