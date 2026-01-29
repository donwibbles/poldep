"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Target,
  MessageSquare,
  Search,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, formatRelative } from "@/lib/utils";
import { TARGET_RESPONSE_LABELS } from "@/lib/validations/initiative";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  party?: string;
  district?: string;
}

interface InitiativeTarget {
  id: string;
  contactId: string;
  contact: Contact;
  responseStatus: string;
  responseDate: string | null;
  responseNotes: string | null;
  priority: number;
  touchCount: number;
  firstContactDate: string | null;
  lastContactDate: string | null;
}

interface Communication {
  id: string;
  type: string;
  date: string;
  subject: string;
  notes: string | null;
  responseStatus: string;
  contacts: Array<{
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      type: string;
    };
  }>;
  rolledUpToContactId: string | null;
  viaStaff: { id: string; name: string } | null;
}

interface Initiative {
  id: string;
  name: string;
  description: string | null;
  status: string;
  goalDate: string | null;
  createdAt: string;
  targets: InitiativeTarget[];
  stats: {
    targetCount: number;
    respondedCount: number;
    responseRate: number;
    totalTouches: number;
    avgTouches: number;
  };
}

const responseStatusColors: Record<string, string> = {
  NOT_CONTACTED: "secondary",
  AWAITING_RESPONSE: "default",
  RESPONDED_POSITIVE: "success",
  RESPONDED_NEGATIVE: "destructive",
  RESPONDED_NEUTRAL: "outline",
  NO_RESPONSE: "secondary",
};

const statusColors: Record<string, string> = {
  ACTIVE: "success",
  PAUSED: "secondary",
  COMPLETED: "default",
  ARCHIVED: "outline",
};

export default function InitiativeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [initiative, setInitiative] = React.useState<Initiative | null>(null);
  const [communications, setCommunications] = React.useState<Communication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [addTargetOpen, setAddTargetOpen] = React.useState(false);
  const [editTargetOpen, setEditTargetOpen] = React.useState(false);
  const [selectedTarget, setSelectedTarget] = React.useState<InitiativeTarget | null>(null);
  const [expandedTargets, setExpandedTargets] = React.useState<Set<string>>(new Set());
  const [commsByTarget, setCommsByTarget] = React.useState<Record<string, Communication[]>>({});

  // Add target dialog state
  const [contactSearch, setContactSearch] = React.useState("");
  const [contactResults, setContactResults] = React.useState<Contact[]>([]);
  const [addingTargets, setAddingTargets] = React.useState(false);
  const debouncedSearch = useDebounce(contactSearch, 300);

  // Edit target dialog state
  const [editResponseStatus, setEditResponseStatus] = React.useState("");
  const [editResponseNotes, setEditResponseNotes] = React.useState("");
  const [savingTarget, setSavingTarget] = React.useState(false);

  const fetchInitiative = React.useCallback(async () => {
    setLoading(true);
    try {
      const [initRes, commsRes] = await Promise.all([
        fetch(`/api/initiatives/${id}`),
        fetch(`/api/initiatives/${id}/communications`),
      ]);

      if (!initRes.ok) throw new Error("Failed to load initiative");

      const initData = await initRes.json();
      setInitiative(initData);

      if (commsRes.ok) {
        const commsData = await commsRes.json();
        setCommunications(commsData.communications || []);
        setCommsByTarget(commsData.communicationsByTarget || {});
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load initiative",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  React.useEffect(() => {
    fetchInitiative();
  }, [fetchInitiative]);

  // Search for contacts to add
  React.useEffect(() => {
    if (debouncedSearch.length < 2) {
      setContactResults([]);
      return;
    }
    fetch(
      `/api/contacts?search=${encodeURIComponent(debouncedSearch)}&limit=10&type=ELECTED_OFFICIAL,CANDIDATE`
    )
      .then((r) => r.json())
      .then((data) => setContactResults(data.contacts || []));
  }, [debouncedSearch]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/initiatives/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Initiative deleted", variant: "success" });
      router.push("/initiatives");
    } else {
      toast({
        title: "Error",
        description: "Failed to delete initiative",
        variant: "destructive",
      });
    }
    setDeleting(false);
    setDeleteOpen(false);
  }

  async function handleAddTarget(contact: Contact) {
    setAddingTargets(true);
    const res = await fetch(`/api/initiatives/${id}/targets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: [contact.id] }),
    });

    if (res.ok) {
      toast({ title: "Target added", variant: "success" });
      fetchInitiative();
      setContactSearch("");
      setContactResults([]);
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || "Failed to add target",
        variant: "destructive",
      });
    }
    setAddingTargets(false);
  }

  async function handleSaveTarget() {
    if (!selectedTarget) return;
    setSavingTarget(true);

    const res = await fetch(
      `/api/initiatives/${id}/targets/${selectedTarget.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseStatus: editResponseStatus,
          responseNotes: editResponseNotes || null,
        }),
      }
    );

    if (res.ok) {
      toast({ title: "Target updated", variant: "success" });
      fetchInitiative();
      setEditTargetOpen(false);
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || "Failed to update target",
        variant: "destructive",
      });
    }
    setSavingTarget(false);
  }

  async function handleRemoveTarget(targetId: string) {
    const res = await fetch(`/api/initiatives/${id}/targets/${targetId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast({ title: "Target removed", variant: "success" });
      fetchInitiative();
    } else {
      toast({
        title: "Error",
        description: "Failed to remove target",
        variant: "destructive",
      });
    }
  }

  function openEditTarget(target: InitiativeTarget) {
    setSelectedTarget(target);
    setEditResponseStatus(target.responseStatus);
    setEditResponseNotes(target.responseNotes || "");
    setEditTargetOpen(true);
  }

  function toggleTargetExpanded(targetId: string) {
    const newExpanded = new Set(expandedTargets);
    if (newExpanded.has(targetId)) {
      newExpanded.delete(targetId);
    } else {
      newExpanded.add(targetId);
    }
    setExpandedTargets(newExpanded);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!initiative) {
    return <p className="text-sm text-red-500">Initiative not found.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/initiatives")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">{initiative.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                statusColors[initiative.status] as
                  | "default"
                  | "secondary"
                  | "success"
                  | "outline"
              }
            >
              {initiative.status}
            </Badge>
            {initiative.goalDate && (
              <span className="text-sm text-gray-500">
                Goal: {formatDate(initiative.goalDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddTargetOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Target
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{initiative.stats.targetCount}</p>
            <p className="text-sm text-gray-500">Targets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              {initiative.stats.responseRate}%
            </p>
            <p className="text-sm text-gray-500">Response Rate</p>
            <p className="text-xs text-gray-400">
              {initiative.stats.respondedCount} of {initiative.stats.targetCount} responded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{initiative.stats.totalTouches}</p>
            <p className="text-sm text-gray-500">Total Touches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{initiative.stats.avgTouches}</p>
            <p className="text-sm text-gray-500">Avg Touches</p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {initiative.description && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">{initiative.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Targets ({initiative.targets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {initiative.targets.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-8 w-8 mx-auto text-gray-300" />
              <p className="text-sm text-gray-500 mt-2">
                No targets added yet. Add elected officials or candidates to track.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAddTargetOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Target
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {initiative.targets.map((target) => {
                const isExpanded = expandedTargets.has(target.contactId);
                const targetComms = commsByTarget[target.contactId] || [];

                return (
                  <div
                    key={target.id}
                    className="rounded-lg border"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTargetExpanded(target.contactId)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          <div>
                            <Link
                              href={`/contacts/${target.contact.id}`}
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              {target.contact.firstName} {target.contact.lastName}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {target.contact.type.replace(/_/g, " ")}
                              </span>
                              {target.contact.party && (
                                <span className="text-xs text-gray-400">
                                  {target.contact.party}
                                </span>
                              )}
                              {target.contact.district && (
                                <span className="text-xs text-gray-400">
                                  {target.contact.district}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge
                              variant={
                                responseStatusColors[target.responseStatus] as any
                              }
                              className="mb-1"
                            >
                              {TARGET_RESPONSE_LABELS[target.responseStatus]}
                            </Badge>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{target.touchCount} touches</span>
                              {target.lastContactDate && (
                                <>
                                  <span>|</span>
                                  <span>
                                    Last: {formatRelative(target.lastContactDate)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditTarget(target)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Link
                              href={`/communications/new?contactId=${target.contact.id}&initiativeId=${initiative.id}`}
                            >
                              <Button variant="ghost" size="sm">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTarget(target.id)}
                            >
                              <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded communications */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 px-4 py-3">
                        {targetComms.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No communications logged yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {targetComms.map((comm) => (
                              <Link
                                key={comm.id}
                                href={`/communications/${comm.id}`}
                                className="block rounded border bg-white p-2 hover:bg-gray-50"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-medium">
                                      {comm.subject}
                                    </span>
                                    {comm.viaStaff && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        via {comm.viaStaff.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {comm.type.replace(/_/g, " ")}
                                    </Badge>
                                    <span className="text-xs text-gray-400">
                                      {formatRelative(comm.date)}
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Target Dialog */}
      <Dialog open={addTargetOpen} onOpenChange={setAddTargetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Target</DialogTitle>
            <DialogDescription>
              Search for elected officials or candidates to add to this initiative.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="pl-9"
              />
            </div>
            {contactResults.length > 0 && (
              <div className="max-h-60 overflow-auto border rounded-md">
                {contactResults.map((contact) => {
                  const isAlreadyTarget = initiative.targets.some(
                    (t) => t.contactId === contact.id
                  );
                  return (
                    <button
                      key={contact.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between disabled:opacity-50"
                      onClick={() => handleAddTarget(contact)}
                      disabled={isAlreadyTarget || addingTargets}
                    >
                      <div>
                        <span className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <div className="text-xs text-gray-400">
                          {contact.type.replace(/_/g, " ")}
                          {contact.party && ` - ${contact.party}`}
                        </div>
                      </div>
                      {isAlreadyTarget && (
                        <span className="text-xs text-gray-400">Already added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Target Dialog */}
      <Dialog open={editTargetOpen} onOpenChange={setEditTargetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Response Status</DialogTitle>
            <DialogDescription>
              {selectedTarget && (
                <>
                  Update the response status for{" "}
                  {selectedTarget.contact.firstName} {selectedTarget.contact.lastName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Response Status</Label>
              <Select value={editResponseStatus} onValueChange={setEditResponseStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_RESPONSE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editResponseNotes}
                onChange={(e) => setEditResponseNotes(e.target.value)}
                placeholder="Any notes about their response..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTargetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTarget} disabled={savingTarget}>
              {savingTarget ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Initiative"
        description={`Are you sure you want to delete "${initiative.name}"? This will remove all target tracking data. Communications will not be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
