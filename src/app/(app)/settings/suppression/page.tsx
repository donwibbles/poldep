"use client";

import * as React from "react";
import { Trash2, Plus, Upload, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface Suppression {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  createdAt: string;
}

const reasonLabels: Record<string, string> = {
  UNSUBSCRIBE: "Unsubscribed",
  BOUNCE: "Bounced",
  COMPLAINT: "Complaint",
  MANUAL: "Manual",
};

const reasonColors: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  UNSUBSCRIBE: "secondary",
  BOUNCE: "destructive",
  COMPLAINT: "destructive",
  MANUAL: "default",
};

export default function SuppressionSettingsPage() {
  const { toast } = useToast();
  const [suppressions, setSuppressions] = React.useState<Suppression[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [reasonFilter, setReasonFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const [addOpen, setAddOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [newEmail, setNewEmail] = React.useState("");
  const [newReason, setNewReason] = React.useState<string>("MANUAL");
  const [bulkEmails, setBulkEmails] = React.useState("");
  const [bulkReason, setBulkReason] = React.useState<string>("MANUAL");
  const [adding, setAdding] = React.useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchSuppressions = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (reasonFilter) params.set("reason", reasonFilter);

    const res = await fetch(`/api/suppression?${params}`);
    const data = await res.json();
    setSuppressions(data.suppressions || []);
    setPagination(data.pagination || pagination);
    setLoading(false);
  }, [pagination.page, pagination.limit, debouncedSearch, reasonFilter]);

  React.useEffect(() => {
    fetchSuppressions();
  }, [fetchSuppressions]);

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setAdding(true);

    const res = await fetch("/api/suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), reason: newReason }),
    });

    if (res.ok) {
      toast({ title: "Email added to suppression list", variant: "success" });
      setAddOpen(false);
      setNewEmail("");
      setNewReason("MANUAL");
      fetchSuppressions();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleBulkAdd() {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));

    if (emails.length === 0) {
      toast({ title: "No valid emails found", variant: "destructive" });
      return;
    }

    setAdding(true);
    const res = await fetch("/api/suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails, reason: bulkReason }),
    });

    if (res.ok) {
      const result = await res.json();
      toast({
        title: "Bulk add complete",
        description: `Added ${result.added} emails${result.skipped > 0 ? `, ${result.skipped} already existed` : ""}`,
        variant: "success",
      });
      setBulkOpen(false);
      setBulkEmails("");
      setBulkReason("MANUAL");
      fetchSuppressions();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);

    const suppression = suppressions.find((s) => s.id === deleteId);
    const res = await fetch("/api/suppression", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: suppression?.email }),
    });

    if (res.ok) {
      toast({ title: "Email removed from suppression list", variant: "success" });
      fetchSuppressions();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setDeleting(false);
    setDeleteId(null);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Suppression List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage emails that should be excluded from campaign sends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Add
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Email
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            About Suppression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Suppressed emails are automatically excluded from all campaign sends. Emails are
            auto-added when they bounce or mark an email as spam (complaint). You can also
            manually add emails to prevent sending to specific addresses.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All reasons</SelectItem>
                <SelectItem value="UNSUBSCRIBE">Unsubscribed</SelectItem>
                <SelectItem value="BOUNCE">Bounced</SelectItem>
                <SelectItem value="COMPLAINT">Complaint</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : suppressions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {debouncedSearch || reasonFilter
                ? "No matching suppressions found."
                : "No suppressed emails yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {suppressions.map((suppression) => (
                <div
                  key={suppression.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{suppression.email}</p>
                      <p className="text-xs text-gray-500">
                        Added {formatDateTime(suppression.createdAt)}
                        {suppression.source && suppression.source !== "manual" && (
                          <span> from campaign</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={reasonColors[suppression.reason] || "default"}>
                      {reasonLabels[suppression.reason] || suppression.reason}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(suppression.id)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page - 1 })
                      }
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page + 1 })
                      }
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Single Email Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email to Suppression List</DialogTitle>
            <DialogDescription>
              This email will be excluded from all future campaign sends.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={newReason} onValueChange={setNewReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="UNSUBSCRIBE">Unsubscribed</SelectItem>
                  <SelectItem value="BOUNCE">Bounced</SelectItem>
                  <SelectItem value="COMPLAINT">Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newEmail.trim() || adding}>
              {adding ? "Adding..." : "Add Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Add Emails</DialogTitle>
            <DialogDescription>
              Add multiple emails at once. Enter one email per line, or separate with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={bulkReason} onValueChange={setBulkReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="UNSUBSCRIBE">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={!bulkEmails.trim() || adding}>
              {adding ? "Adding..." : "Add Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove from Suppression List"
        description="This will allow emails to be sent to this address again. Are you sure?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
