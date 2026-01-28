"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Award, MessageSquare, CheckSquare, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = React.useState<any>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/tasks?status=PENDING&limit=10").then((r) => r.json()),
      fetch("/api/activity?limit=15").then((r) => r.json()),
      fetch("/api/pipeline-stages").then((r) => r.json()),
      fetch("/api/elections?limit=5").then((r) => r.json()),
    ]).then(([tasks, activity, stages, elections]) => {
      setData({ tasks: tasks.tasks, activities: activity.activities, stages: stages.stages, elections: elections.elections });
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading dashboard...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {data.tasks?.length === 0 ? <p className="text-sm text-gray-500">No pending tasks.</p> : (
              <ul className="space-y-2">
                {data.tasks?.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span>{t.title}</span>
                    {t.dueDate && <span className="text-xs text-gray-500">{formatDate(t.dueDate)}</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/tasks" className="mt-3 block text-xs text-blue-600 hover:underline">View all tasks</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activities?.length === 0 ? <p className="text-sm text-gray-500">No recent activity.</p> : (
              <ul className="space-y-2">
                {data.activities?.slice(0, 10).map((a: any) => (
                  <li key={a.id} className="text-sm">
                    <span className="text-gray-700">{a.summary}</span>
                    <span className="text-xs text-gray-400 ml-2">{formatRelative(a.createdAt)} &middot; {a.user?.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Endorsement Pipeline</CardTitle>
            <Award className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.stages?.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm">{s.name}</span>
                  </div>
                  <span className="text-sm font-medium">{s._count?.endorsements || 0}</span>
                </div>
              ))}
            </div>
            <Link href="/endorsements" className="mt-3 block text-xs text-blue-600 hover:underline">View pipeline</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Elections</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {data.elections?.length === 0 ? <p className="text-sm text-gray-500">No upcoming elections.</p> : (
              <ul className="space-y-2">
                {data.elections?.map((e: any) => (
                  <li key={e.id}>
                    <Link href={`/elections/${e.id}`} className="flex items-center justify-between text-sm hover:text-blue-600">
                      <span>{e.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{e.type}</Badge>
                        <span className="text-xs text-gray-500">{formatDate(e.date)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/elections" className="mt-3 block text-xs text-blue-600 hover:underline">View all elections</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
