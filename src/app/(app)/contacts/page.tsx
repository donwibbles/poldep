"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/use-debounce";

const CONTACT_TYPES = [
  { value: "", label: "All" },
  { value: "CANDIDATE", label: "Candidates" },
  { value: "ELECTED_OFFICIAL", label: "Elected Officials" },
  { value: "STAFF", label: "Staff" },
  { value: "ORGANIZATION", label: "Organizations" },
];

const TYPE_COLORS: Record<string, "default" | "secondary" | "success" | "warning"> = {
  CANDIDATE: "default",
  ELECTED_OFFICIAL: "success",
  STAFF: "secondary",
  ORGANIZATION: "warning",
};

const TAX_STATUS_LABELS: Record<string, string> = {
  C501C3: "501(c)(3)",
  C501C4: "501(c)(4)",
  C501C5: "501(c)(5)",
  C501C6: "501(c)(6)",
  FOR_PROFIT: "For-Profit",
  GOVERNMENT: "Government",
  OTHER: "Other",
};

function getRoleAssignment(contact: any): string {
  if (contact.type === "STAFF") {
    const assignment = contact.staffAssignments?.[0];
    if (assignment?.parentContact) {
      return `Staff for ${assignment.parentContact.firstName} ${assignment.parentContact.lastName}`;
    }
    return "Unassigned";
  }
  if (contact.type === "CANDIDATE" || contact.type === "ELECTED_OFFICIAL") {
    const position = contact.positionAssignments?.[0];
    if (position) {
      return position.jurisdiction
        ? `${position.positionTitle} (${position.jurisdiction})`
        : position.positionTitle;
    }
    return "-";
  }
  if (contact.type === "ORGANIZATION") {
    if (contact.taxStatus) {
      return TAX_STATUS_LABELS[contact.taxStatus] || contact.taxStatus;
    }
    return "-";
  }
  return contact.organization || "-";
}

export default function ContactsPage() {
  const router = useRouter();

  const [contacts, setContacts] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const debouncedSearch = useDebounce(search);

  const fetchContacts = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", pagination.page.toString());

    const res = await fetch(`/api/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [debouncedSearch, typeFilter, pagination.page]);

  React.useEffect(() => { fetchContacts(); }, [fetchContacts]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
          </Link>
          <Link href="/contacts/new">
            <Button><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CONTACT_TYPES.map((t) => (
            <Button
              key={t.value}
              variant={typeFilter === t.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setTypeFilter(t.value); setPagination((p) => ({ ...p, page: 1 })); }}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Role / Assignment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {contacts.map((contact: any) => (
                    <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/contacts/${contact.id}`)}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <Badge variant={TYPE_COLORS[contact.type] || "secondary"}>
                          {contact.type.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={getRoleAssignment(contact)}>{getRoleAssignment(contact)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{contact.email || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{contact.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                          {contact.tags?.length > 3 && <span className="text-xs text-gray-400">+{contact.tags.length - 3}</span>}
                        </div>
                      </td>
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
