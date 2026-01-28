interface TaskAssignmentData {
  taskTitle: string;
  taskDescription: string | null;
  dueDate: Date | string | null;
  assignerName: string;
  assigneeName: string;
}

function formatDate(d: Date | string | null): string {
  if (!d) return "No due date";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTaskAssignmentHtml(data: TaskAssignmentData): string {
  const { taskTitle, taskDescription, dueDate, assignerName, assigneeName } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Task Assigned: ${escapeHtml(taskTitle)}</title>
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
                Task Assignment
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.5;">
                Hi ${escapeHtml(assigneeName)},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.5;">
                <strong>${escapeHtml(assignerName)}</strong> has assigned you a new task:
              </p>

              <!-- Task Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #111827;">
                      ${escapeHtml(taskTitle)}
                    </h2>
                    ${taskDescription ? `
                    <p style="margin: 0 0 16px; font-size: 14px; color: #6B7280; line-height: 1.5;">
                      ${escapeHtml(taskDescription)}
                    </p>
                    ` : ""}
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 8px;">
                          <span style="display: inline-block; padding: 6px 12px; background-color: ${dueDate ? "#FEF3C7" : "#E5E7EB"}; color: ${dueDate ? "#92400E" : "#6B7280"}; font-size: 13px; font-weight: 500; border-radius: 4px;">
                            ${formatDate(dueDate)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXTAUTH_URL || ""}/tasks" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                      View Tasks
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                You are receiving this because a task was assigned to you in UFW CRM.
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

export function buildTaskAssignmentText(data: TaskAssignmentData): string {
  const { taskTitle, taskDescription, dueDate, assignerName, assigneeName } = data;

  let text = `Hi ${assigneeName},\n\n`;
  text += `${assignerName} has assigned you a new task:\n\n`;
  text += `Task: ${taskTitle}\n`;
  if (taskDescription) text += `Description: ${taskDescription}\n`;
  text += `Due: ${formatDate(dueDate)}\n\n`;
  text += `View your tasks at: ${process.env.NEXTAUTH_URL || ""}/tasks`;

  return text;
}
