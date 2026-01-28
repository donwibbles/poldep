"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatRelative } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  type: "ONE_TIME" | "DRIP_SEQUENCE";
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED";
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  template?: { id: string; name: string } | null;
  createdAt: string;
  _count: { recipients: number };
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  SCHEDULED: "default",
  SENDING: "default",
  SENT: "success",
  PAUSED: "destructive",
};

const typeLabels: Record<string, string> = {
  ONE_TIME: "One-time",
  DRIP_SEQUENCE: "Drip Sequence",
};

export default function CampaignsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const fetchCampaigns = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", page.toString());

    try {
      const res = await fetch(`/api/campaigns?${params}`);
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Please log in" : "Failed to load campaigns");
      }
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter, page, toast]);

  React.useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  function getOpenRate(campaign: Campaign) {
    if (campaign.totalSent === 0) return "-";
    return Math.round((campaign.totalOpened / campaign.totalSent) * 100) + "%";
  }

  function getClickRate(campaign: Campaign) {
    if (campaign.totalSent === 0) return "-";
    return (
      Math.round((campaign.totalClicked / campaign.totalSent) * 100) + "%"
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="SENDING">Sending</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="ONE_TIME">One-time</SelectItem>
            <SelectItem value="DRIP_SEQUENCE">Drip Sequence</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchCampaigns} variant="outline" className="mt-2">Retry</Button>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-gray-500">
            No campaigns found. Create one to get started.
          </p>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Campaign
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Recipients
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Open Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Click Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`View campaign: ${campaign.name}`}
                    className="hover:bg-gray-50 cursor-pointer focus:bg-blue-50 focus:outline-none"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/campaigns/${campaign.id}`);
                      }
                    }}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </p>
                        {campaign.template && (
                          <p className="text-xs text-gray-500">
                            Template: {campaign.template.name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {typeLabels[campaign.type]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Badge
                        variant={
                          statusColors[campaign.status] as
                            | "default"
                            | "secondary"
                            | "success"
                            | "destructive"
                        }
                      >
                        {campaign.status}
                      </Badge>
                      {campaign.status === "SCHEDULED" && campaign.scheduledAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRelative(campaign.scheduledAt)}
                        </p>
                      )}
                      {campaign.status === "SENT" && campaign.sentAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRelative(campaign.sentAt)}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {campaign.totalRecipients}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {getOpenRate(campaign)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {getClickRate(campaign)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(campaign.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
