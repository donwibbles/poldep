"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Target } from "lucide-react";
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

interface Initiative {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  goalDate: string | null;
  createdAt: string;
  targetCount: number;
  respondedCount: number;
  responseRate: number;
  lastActivity: string | null;
  _count: { targets: number; communications: number };
}

const statusColors: Record<string, string> = {
  ACTIVE: "success",
  PAUSED: "secondary",
  COMPLETED: "default",
  ARCHIVED: "outline",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export default function InitiativesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [initiatives, setInitiatives] = React.useState<Initiative[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const fetchInitiatives = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", page.toString());

    try {
      const res = await fetch(`/api/initiatives?${params}`);
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? "Please log in" : "Failed to load initiatives"
        );
      }
      const data = await res.json();
      setInitiatives(data.initiatives || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page, toast]);

  React.useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900">Initiatives</h1>
        </div>
        <Link href="/initiatives/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Initiative
          </Button>
        </Link>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        Track outreach campaigns to elected officials and candidates. Monitor
        response rates and communication history.
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search initiatives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchInitiatives} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        ) : initiatives.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-sm text-gray-500 mt-4">
              No initiatives found. Create one to start tracking outreach.
            </p>
            <Link href="/initiatives/new">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Initiative
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Initiative
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Targets
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Response Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Last Activity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Goal Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {initiatives.map((initiative) => (
                  <tr
                    key={initiative.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`View initiative: ${initiative.name}`}
                    className="hover:bg-gray-50 cursor-pointer focus:bg-blue-50 focus:outline-none"
                    onClick={() => router.push(`/initiatives/${initiative.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/initiatives/${initiative.id}`);
                      }
                    }}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {initiative.name}
                        </p>
                        {initiative.description && (
                          <p className="text-xs text-gray-500 truncate max-w-[300px]">
                            {initiative.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Badge
                        variant={
                          statusColors[initiative.status] as
                            | "default"
                            | "secondary"
                            | "success"
                            | "outline"
                        }
                      >
                        {statusLabels[initiative.status]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {initiative.targetCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {initiative.targetCount > 0 ? (
                        <span
                          className={
                            initiative.responseRate >= 50
                              ? "text-green-600 font-medium"
                              : initiative.responseRate > 0
                                ? "text-amber-600"
                                : "text-gray-500"
                          }
                        >
                          {initiative.responseRate}%
                          <span className="text-gray-400 text-xs ml-1">
                            ({initiative.respondedCount}/{initiative.targetCount})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {initiative.lastActivity
                        ? formatRelative(initiative.lastActivity)
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {initiative.goalDate
                        ? formatDate(initiative.goalDate)
                        : "-"}
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
