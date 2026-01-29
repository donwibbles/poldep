"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Award,
  CheckSquare,
  Calendar,
  Mail,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative, getCurrentCycle } from "@/lib/utils";
import { CycleSelector } from "@/components/cycle-selector";
import { ContactGrowthChart } from "@/components/charts/contact-growth-chart";
import { EndorsementPipelineChart } from "@/components/charts/endorsement-pipeline-chart";
import { CampaignStatsCard } from "@/components/charts/campaign-stats-card";

interface DashboardStats {
  cycle: string;
  contacts: {
    total: number;
    byType: Record<string, number>;
    thisWeek: number;
    growth: { date: string; count: number }[];
  };
  endorsements: {
    total: number;
    active: number;
    byDecision: Record<string, number>;
    pipeline: { name: string; color: string; count: number; isFinal: boolean }[];
  };
  campaigns: {
    totalCampaigns: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  };
  tasks: {
    pending: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  upcomingElections: {
    id: string;
    name: string;
    type: string;
    date: string;
    totalRaces: number;
    endorsedRaces: number;
    pendingRaces: number;
    coveragePercent: number;
  }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    summary: string;
    userName: string;
    createdAt: string;
  }[];
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconColor = "text-gray-400",
  href,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  iconColor?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "hover:bg-gray-50 transition-colors" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <span className="text-sm text-gray-500">{title}</span>
          </div>
          {href && <ArrowUpRight className="h-3 w-3 text-gray-400" />}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtext && (
          <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [cycles, setCycles] = React.useState<string[]>([]);
  const [selectedCycle, setSelectedCycle] = React.useState(getCurrentCycle());
  const [loading, setLoading] = React.useState(true);

  // Fetch available cycles
  React.useEffect(() => {
    fetch("/api/elections/cycles")
      .then((r) => r.json())
      .then((data) => {
        const fetchedCycles = data.cycles || [];
        // Ensure current cycle is in the list
        if (!fetchedCycles.includes(selectedCycle)) {
          fetchedCycles.unshift(selectedCycle);
        }
        setCycles(fetchedCycles);
      });
  }, [selectedCycle]);

  // Fetch dashboard data when cycle changes
  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard/stats?cycle=${selectedCycle}`).then((r) => r.json()),
      fetch("/api/tasks?status=PENDING&limit=10").then((r) => r.json()),
    ]).then(([statsData, tasksData]) => {
      setStats(statsData);
      setTasks(tasksData.tasks || []);
      setLoading(false);
    });
  }, [selectedCycle]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading dashboard...</p>;
  }

  if (!stats) {
    return <p className="text-sm text-gray-500">Failed to load dashboard data.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {cycles.length > 0 && (
          <CycleSelector
            value={selectedCycle}
            onChange={setSelectedCycle}
            cycles={cycles}
          />
        )}
      </div>

      {/* Top Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={stats.contacts.total.toLocaleString()}
          subtext={stats.contacts.thisWeek > 0 ? `+${stats.contacts.thisWeek} this week` : undefined}
          icon={Users}
          iconColor="text-blue-500"
          href="/contacts"
        />
        <StatCard
          title="Active Endorsements"
          value={stats.endorsements.active}
          subtext={`${stats.endorsements.total} total`}
          icon={Award}
          iconColor="text-amber-500"
          href="/endorsements"
        />
        <StatCard
          title="Emails Sent"
          value={stats.campaigns.totalSent.toLocaleString()}
          subtext={`${stats.campaigns.openRate}% open rate`}
          icon={Mail}
          iconColor="text-green-500"
          href="/campaigns"
        />
        <StatCard
          title="Tasks Pending"
          value={stats.tasks.pending}
          subtext={stats.tasks.overdue > 0 ? `${stats.tasks.overdue} overdue` : "None overdue"}
          icon={stats.tasks.overdue > 0 ? AlertCircle : CheckSquare}
          iconColor={stats.tasks.overdue > 0 ? "text-red-500" : "text-purple-500"}
          href="/tasks"
        />
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Contact Growth (30 days)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <ContactGrowthChart data={stats.contacts.growth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Endorsement Pipeline</CardTitle>
            <Award className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <EndorsementPipelineChart data={stats.endorsements.pipeline} />
          </CardContent>
        </Card>
      </div>

      {/* Tasks and Activity Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No pending tasks.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.slice(0, 8).map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{t.title}</span>
                    {t.dueDate && (
                      <span
                        className={`text-xs ml-2 ${
                          new Date(t.dueDate) < new Date()
                            ? "text-red-500 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/tasks"
              className="mt-3 block text-xs text-blue-600 hover:underline"
            >
              View all tasks
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recentActivity.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="text-gray-700">{a.summary}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatRelative(a.createdAt)} &middot; {a.userName}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Elections and Campaign Stats Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Elections</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {stats.upcomingElections.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming elections.</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingElections.map((e) => (
                  <Link
                    key={e.id}
                    href={`/elections/${e.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{e.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {e.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{formatDate(e.date)}</span>
                      <span>
                        {e.endorsedRaces}/{e.totalRaces} races endorsed
                        {e.totalRaces > 0 && ` (${e.coveragePercent}%)`}
                      </span>
                    </div>
                    {e.totalRaces > 0 && (
                      <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${e.coveragePercent}%` }}
                        />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/elections"
              className="mt-3 block text-xs text-blue-600 hover:underline"
            >
              View all elections
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Campaign Performance</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <CampaignStatsCard
              totalSent={stats.campaigns.totalSent}
              openRate={stats.campaigns.openRate}
              clickRate={stats.campaigns.clickRate}
            />
            <Link
              href="/campaigns"
              className="mt-4 block text-xs text-blue-600 hover:underline"
            >
              View all campaigns
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
