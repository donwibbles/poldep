"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

const COMM_TYPES = [
  { value: "", label: "All" },
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "MEETING_IN_PERSON", label: "In Person" },
  { value: "MEETING_VIRTUAL", label: "Virtual" },
  { value: "EMAIL", label: "Email" },
  { value: "LETTER_MAILER", label: "Letter/Mailer" },
  { value: "EVENT_ACTION", label: "Event/Action" },
  { value: "TEXT", label: "Text" },
  { value: "LEFT_VOICEMAIL", label: "Left Voicemail" },
];

export default function CommunicationsPage() {
  const router = useRouter();
  const [comms, setComms] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", pagination.page.toString());
    fetch(`/api/communications?${params}`)
      .then((r) => r.json())
      .then((data) => { setComms(data.communications || []); setPagination(data.pagination); setLoading(false); });
  }, [typeFilter, pagination.page]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <Link href="/communications/new"><Button><Plus className="h-4 w-4 mr-2" />Log Communication</Button></Link>
      </div>
      <div className="mt-4 flex gap-1 flex-wrap">
        {COMM_TYPES.map((t) => (
          <Button key={t.value} variant={typeFilter === t.value ? "default" : "outline"} size="sm" onClick={() => { setTypeFilter(t.value); setPagination((p) => ({ ...p, page: 1 })); }}>{t.label}</Button>
        ))}
      </div>
      <div className="mt-6">
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : comms.length === 0 ? <p className="text-sm text-gray-500">No communications yet.</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contacts</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {comms.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/communications/${c.id}`)}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(c.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm"><Badge variant="outline">{c.type.replace(/_/g, " ")}</Badge></td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.subject}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.contacts?.map((cc: any) => `${cc.contact.firstName} ${cc.contact.lastName}`).join(", ") || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{c.followUpDate ? formatDate(c.followUpDate) : "-"}</td>
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
