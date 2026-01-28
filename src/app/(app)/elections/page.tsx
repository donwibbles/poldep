"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

const TYPE_COLORS: Record<string, "default" | "warning" | "destructive"> = {
  PRIMARY: "default",
  GENERAL: "warning",
  SPECIAL: "destructive",
};

export default function ElectionsPage() {
  const router = useRouter();
  const [elections, setElections] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/elections?page=${pagination.page}`)
      .then((r) => r.json())
      .then((data) => {
        setElections(data.elections || []);
        setPagination(data.pagination);
        setLoading(false);
      });
  }, [pagination.page]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Elections</h1>
        <Link href="/elections/new"><Button><Plus className="h-4 w-4 mr-2" />Add Election</Button></Link>
      </div>
      <div className="mt-6">
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : elections.length === 0 ? <p className="text-sm text-gray-500">No elections yet.</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cycle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Races</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {elections.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/elections/${e.id}`)}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{e.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm"><Badge variant={TYPE_COLORS[e.type]}>{e.type}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(e.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{e.cycle}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{e._count?.races || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
          </>
        )}
      </div>
    </div>
  );
}
