interface ActivityItem {
  summary: string;
  userName: string;
  action: string;
  createdAt: Date | string;
}

interface TaskItem {
  title: string;
  dueDate: Date | string | null;
  assigneeName: string | null;
}

interface PipelineStageItem {
  name: string;
  color: string;
  count: number;
}

interface DigestData {
  frequency: string;
  dateRange: string;
  activities: ActivityItem[];
  tasks: TaskItem[];
  pipelineStages: PipelineStageItem[];
}

function actionColor(action: string): string {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "#22C55E";
    case "UPDATE":
      return "#3B82F6";
    case "DELETE":
      return "#EF4444";
    case "REORDER":
      return "#F59E0B";
    default:
      return "#6B7280";
  }
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildDigestHtml(data: DigestData): string {
  const { frequency, dateRange, activities, tasks, pipelineStages } = data;

  const activityRows = activities.length > 0
    ? activities
        .map(
          (a) => `
        <tr>
          <td style="padding: 8px 12px; vertical-align: top; width: 24px;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${actionColor(a.action)}; margin-top: 4px;"></div>
          </td>
          <td style="padding: 8px 12px; font-size: 14px; color: #374151; line-height: 1.5;">
            ${escapeHtml(a.summary)}
            <br/>
            <span style="font-size: 12px; color: #9CA3AF;">${escapeHtml(a.userName)} &middot; ${formatDate(a.createdAt)}</span>
          </td>
        </tr>`
        )
        .join("")
    : `<tr><td style="padding: 12px; font-size: 14px; color: #9CA3AF;">No recent activity.</td></tr>`;

  const taskRows = tasks.length > 0
    ? tasks
        .map(
          (t) => `
        <tr>
          <td style="padding: 8px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #F3F4F6;">
            ${escapeHtml(t.title)}
          </td>
          <td style="padding: 8px 12px; font-size: 14px; color: #6B7280; border-bottom: 1px solid #F3F4F6; white-space: nowrap;">
            ${t.dueDate ? formatDate(t.dueDate) : "&mdash;"}
          </td>
          <td style="padding: 8px 12px; font-size: 14px; color: #6B7280; border-bottom: 1px solid #F3F4F6;">
            ${t.assigneeName ? escapeHtml(t.assigneeName) : "&mdash;"}
          </td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="padding: 12px; font-size: 14px; color: #9CA3AF;">No upcoming tasks.</td></tr>`;

  const pipelineRows = pipelineStages
    .map(
      (s) => `
      <tr>
        <td style="padding: 6px 12px; vertical-align: middle; width: 24px;">
          <div style="width: 12px; height: 12px; border-radius: 3px; background-color: ${escapeHtml(s.color)};"></div>
        </td>
        <td style="padding: 6px 12px; font-size: 14px; color: #374151;">
          ${escapeHtml(s.name)}
        </td>
        <td style="padding: 6px 12px; font-size: 14px; color: #374151; text-align: right; font-weight: 600;">
          ${s.count}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>UFW CRM ${frequency} Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                UFW CRM
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #9CA3AF;">
                ${escapeHtml(frequency)} Digest &middot; ${escapeHtml(dateRange)}
              </p>
            </td>
          </tr>

          <!-- Activity Feed -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
                Recent Activity
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 6px;">
                ${activityRows}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <div style="border-top: 1px solid #E5E7EB;"></div>
            </td>
          </tr>

          <!-- Upcoming Tasks -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
                Upcoming Tasks
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr style="background-color: #F9FAFB;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Task</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Due</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Assigned To</th>
                </tr>
                ${taskRows}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <div style="border-top: 1px solid #E5E7EB;"></div>
            </td>
          </tr>

          <!-- Pipeline Summary -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
                Endorsement Pipeline
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 6px;">
                ${pipelineRows || `<tr><td style="padding: 12px; font-size: 14px; color: #9CA3AF;">No pipeline stages configured.</td></tr>`}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                You are receiving this because you subscribed to ${escapeHtml(frequency.toLowerCase())} digests.
                <br/>
                <a href="${process.env.NEXTAUTH_URL || ""}/settings/digests" style="color: #3B82F6; text-decoration: underline;">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
