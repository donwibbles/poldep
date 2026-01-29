"use client";

import { Mail, Eye, MousePointer } from "lucide-react";

interface CampaignStatsCardProps {
  totalSent: number;
  openRate: number;
  clickRate: number;
}

export function CampaignStatsCard({
  totalSent,
  openRate,
  clickRate,
}: CampaignStatsCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-gray-600">Total Sent</span>
        </div>
        <span className="text-lg font-semibold">{totalSent.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-green-500" />
          <span className="text-sm text-gray-600">Open Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${openRate}%` }}
            />
          </div>
          <span className="text-sm font-medium">{openRate}%</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MousePointer className="h-4 w-4 text-purple-500" />
          <span className="text-sm text-gray-600">Click Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${clickRate}%` }}
            />
          </div>
          <span className="text-sm font-medium">{clickRate}%</span>
        </div>
      </div>
    </div>
  );
}
