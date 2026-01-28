"use client";

import * as React from "react";
import { formatRelative } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
  user: { name: string };
}

interface ActivityFeedProps {
  entityType?: string;
  limit?: number;
}

export function ActivityFeed({ entityType, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    params.set("limit", limit.toString());

    fetch(`/api/activity?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setActivities(data.activities || []);
        setLoading(false);
      });
  }, [entityType, limit]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  if (activities.length === 0) {
    return <p className="text-sm text-gray-500">No recent activity.</p>;
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <li key={a.id} className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-blue-400 shrink-0" />
          <div>
            <p className="text-sm text-gray-700">{a.summary}</p>
            <p className="text-xs text-gray-400">
              {a.user.name} &middot; {formatRelative(a.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
