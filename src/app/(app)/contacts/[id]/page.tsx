"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Globe, Plus, XCircle, Briefcase, Award, MessageSquare, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StaffAssignmentDialog } from "@/components/staff-assignment-dialog";
import { EndAssignmentDialog } from "@/components/end-assignment-dialog";
import { PositionAssignmentDialog } from "@/components/position-assignment-dialog";
import { EndPositionDialog } from "@/components/end-position-dialog";
import { LogCommunicationDialog } from "@/components/log-communication-dialog";
import { ContactRatingDialog } from "@/components/contact-rating-dialog";
import { ContactRatingBadge } from "@/components/contact-rating-badge";
import { ResponseStatusBadge } from "@/components/response-status-badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

const TAX_STATUS_LABELS: Record<string, string> = {
  C501C3: "501(c)(3)",
  C501C4: "501(c)(4)",
  C501C5: "501(c)(5)",
  C501C6: "501(c)(6)",
  FOR_PROFIT: "For-Profit",
  GOVERNMENT: "Government",
  OTHER: "Other",
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [contact, setContact] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  const [endingAssignmentId, setEndingAssignmentId] = React.useState<string | null>(null);
  const [positionOpen, setPositionOpen] = React.useState(false);
  const [editingPosition, setEditingPosition] = React.useState<any>(null);
  const [endPositionOpen, setEndPositionOpen] = React.useState(false);
  const [endingPositionId, setEndingPositionId] = React.useState<string | null>(null);
  const [deletePositionTarget, setDeletePositionTarget] = React.useState<any>(null);
  const [deletingPosition, setDeletingPosition] = React.useState(false);
  const [logCommOpen, setLogCommOpen] = React.useState(false);
  const [ratingOpen, setRatingOpen] = React.useState(false);
  const [responseStats, setResponseStats] = React.useState<{
    totalOutreach: number;
    responded: number;
    noResponse: number;
    awaiting: number;
    responseRate: number | null;
  } | null>(null);

  const fetchContact = React.useCallback(() => {
    Promise.all([
      fetch(`/api/contacts/${id}`).then((r) => r.json()),
      fetch(`/api/contacts/${id}/response-stats`).then((r) => r.json()),
    ]).then(([contactData, statsData]) => {
      setContact(contactData);
      setResponseStats(statsData);
    }).finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => { fetchContact(); }, [fetchContact]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Contact deleted", variant: "success" });
      router.push("/contacts");
    } else {
      toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" });
    }
    setDeleting(false);
    setDeleteOpen(false);
  }

  async function handleDeletePosition() {
    if (!deletePositionTarget) return;
    setDeletingPosition(true);
    const res = await fetch(`/api/position-assignments/${deletePositionTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Position deleted", variant: "success" });
      fetchContact();
    } else {
      toast({ title: "Error", description: "Failed to delete position", variant: "destructive" });
    }
    setDeletingPosition(false);
    setDeletePositionTarget(null);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!contact) return <p className="text-sm text-red-500">Contact not found.</p>;

  const isStaff = contact.type === "STAFF";
  // For STAFF contacts: show "Assignments" (who they work for) using staffAssignments
  // For non-STAFF: show "Staff" (who works for them) using parentAssignments
  const assignments = isStaff ? (contact.staffAssignments || []) : (contact.parentAssignments || []);
  const assignmentLabel = isStaff ? "Assignments" : "Staff";

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{contact.type.replace(/_/g, " ")}</Badge>
            {contact.party && <Badge variant="outline">{contact.party}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLogCommOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-1" />Log Communication
          </Button>
          {(contact.type === "CANDIDATE" || contact.type === "ELECTED_OFFICIAL") && (
            <Link href={`/endorsements/new?candidateId=${id}`}>
              <Button variant="outline" size="sm"><Award className="h-4 w-4 mr-1" />Start Endorsement</Button>
            </Link>
          )}
          <Link href={`/contacts/${id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Edit</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {contact.title && <div><dt className="text-sm text-gray-500">Title</dt><dd className="text-sm font-medium">{contact.title}</dd></div>}
                {contact.organization && <div><dt className="text-sm text-gray-500">Organization</dt><dd className="text-sm font-medium">{contact.organization}</dd></div>}
                {contact.email && <div><dt className="text-sm text-gray-500">Email</dt><dd className="text-sm font-medium flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</dd></div>}
                {contact.phone && <div><dt className="text-sm text-gray-500">Phone</dt><dd className="text-sm font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</dd></div>}
                {(contact.address || contact.city) && (
                  <div><dt className="text-sm text-gray-500">Address</dt><dd className="text-sm font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{[contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}</dd></div>
                )}
                {contact.district && <div><dt className="text-sm text-gray-500">District</dt><dd className="text-sm font-medium">{contact.district}</dd></div>}
                {contact.website && <div><dt className="text-sm text-gray-500">Website</dt><dd className="text-sm font-medium"><a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><Globe className="h-3 w-3" />{contact.website}</a></dd></div>}
                {contact.taxStatus && <div><dt className="text-sm text-gray-500">Tax Status</dt><dd className="text-sm font-medium">{TAX_STATUS_LABELS[contact.taxStatus] || contact.taxStatus}</dd></div>}
                {responseStats && responseStats.totalOutreach > 0 && (
                  <div>
                    <dt className="text-sm text-gray-500">Response Rate</dt>
                    <dd className="text-sm font-medium">
                      {responseStats.responseRate !== null ? (
                        <span className={responseStats.responseRate >= 50 ? "text-green-600" : "text-amber-600"}>
                          {responseStats.responseRate}% ({responseStats.responded}/{responseStats.responded + responseStats.noResponse})
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          {responseStats.awaiting} awaiting
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {contact.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(contact.notes) }} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Communications ({contact.communications?.length || 0})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setLogCommOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!contact.communications || contact.communications.length === 0) ? (
                <p className="text-sm text-gray-500">No communications logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {contact.communications.map((cc: any) => (
                    <Link key={cc.communication.id} href={`/communications/${cc.communication.id}`} className="block rounded-lg border p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{cc.communication.subject}</span>
                        <div className="flex items-center gap-2">
                          {cc.communication.responseStatus && cc.communication.responseStatus !== "NOT_APPLICABLE" && (
                            <ResponseStatusBadge status={cc.communication.responseStatus} />
                          )}
                          <Badge variant="outline" className="text-xs">{cc.communication.type.replace(/_/g, " ")}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(cc.communication.date)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Rating</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setRatingOpen(true)}>
                  <Star className="h-4 w-4 mr-1" />Set
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentYear = new Date().getFullYear();
                const currentRating = contact.ratingHistory?.find((r: any) => r.year === currentYear);
                const pastRatings = contact.ratingHistory?.filter((r: any) => r.year !== currentYear) || [];

                return (
                  <div>
                    {currentRating ? (
                      <div className="flex items-center gap-2 mb-2">
                        <ContactRatingBadge rating={currentRating.rating} size="md" />
                        <span className="text-sm text-gray-500">({currentYear})</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mb-2">No rating for {currentYear}</p>
                    )}
                    {pastRatings.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500 mb-2">Previous Ratings</p>
                        <div className="flex flex-wrap gap-2">
                          {pastRatings.slice(0, 5).map((r: any) => (
                            <div key={r.year} className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">{r.year}:</span>
                              <ContactRatingBadge rating={r.rating} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {contact.tags?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{assignmentLabel} ({assignments.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-500">No {assignmentLabel.toLowerCase()} assigned.</p>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a: any) => {
                    const linkedContact = isStaff ? a.parentContact : a.staffContact;
                    const isActive = !a.endDate;
                    return (
                      <div key={a.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link href={`/contacts/${linkedContact.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                              {linkedContact.firstName} {linkedContact.lastName}
                            </Link>
                            {a.role && <span className="text-sm text-gray-500">({a.role})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isActive ? "success" : "secondary"} className="text-xs">
                              {isActive ? "Active" : "Ended"}
                            </Badge>
                            {isActive && (
                              <button
                                className="text-gray-400 hover:text-red-500"
                                title="End assignment"
                                onClick={() => { setEndingAssignmentId(a.id); setEndOpen(true); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(a.startDate)}
                          {a.endDate ? ` – ${formatDate(a.endDate)}` : " – Present"}
                        </p>
                        {a.notes && <p className="text-xs text-gray-400 mt-1">{a.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {(contact.type === "CANDIDATE" || contact.type === "ELECTED_OFFICIAL") && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Positions ({contact.positionAssignments?.length || 0})</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setPositionOpen(true)}>
                    <Briefcase className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!contact.positionAssignments || contact.positionAssignments.length === 0) ? (
                  <p className="text-sm text-gray-500">No positions recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {contact.positionAssignments.map((p: any) => {
                      const isActive = !p.endDate;
                      return (
                        <div key={p.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{p.positionTitle}</span>
                              {p.jurisdiction && <span className="text-sm text-gray-500 ml-1">({p.jurisdiction})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={isActive ? "success" : "secondary"} className="text-xs">
                                {isActive ? "Active" : "Ended"}
                              </Badge>
                              <button
                                className="text-gray-400 hover:text-blue-500"
                                title="Edit position"
                                onClick={() => { setEditingPosition(p); setPositionOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {isActive && (
                                <button
                                  className="text-gray-400 hover:text-orange-500"
                                  title="End position"
                                  onClick={() => { setEndingPositionId(p.id); setEndPositionOpen(true); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                className="text-gray-400 hover:text-red-500"
                                title="Delete position"
                                onClick={() => setDeletePositionTarget(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(p.startDate)}
                            {p.endDate ? ` – ${formatDate(p.endDate)}` : " – Present"}
                          </p>
                          {p.notes && <p className="text-xs text-gray-400 mt-1">{p.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {contact.endorsements?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Endorsements</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {contact.endorsements.map((e: any) => (
                    <li key={e.id}>
                      <Link href={`/endorsements/${e.id}`} className="block rounded border p-2 hover:bg-gray-50">
                        <p className="text-sm font-medium">
                          {e.race?.office}
                          {e.race?.district && ` - ${e.race.district}`}
                        </p>
                        {e.race?.election && (
                          <p className="text-xs text-gray-500">{e.race.election.name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs" style={{ borderColor: e.currentStage?.color }}>
                            {e.currentStage?.name}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact"
        description={`Are you sure you want to delete ${contact.firstName} ${contact.lastName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <StaffAssignmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        contactId={id}
        contactType={contact.type}
        onCreated={fetchContact}
      />

      <EndAssignmentDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        assignmentId={endingAssignmentId}
        onEnded={fetchContact}
      />

      <PositionAssignmentDialog
        open={positionOpen}
        onOpenChange={(open) => {
          setPositionOpen(open);
          if (!open) setEditingPosition(null);
        }}
        contactId={id}
        editPosition={editingPosition}
        onCreated={fetchContact}
      />

      <EndPositionDialog
        open={endPositionOpen}
        onOpenChange={setEndPositionOpen}
        assignmentId={endingPositionId}
        onEnded={fetchContact}
      />

      <LogCommunicationDialog
        open={logCommOpen}
        onOpenChange={setLogCommOpen}
        contactId={id}
        contactName={`${contact.firstName} ${contact.lastName}`}
        endorsements={contact.endorsements || []}
        onCreated={fetchContact}
      />

      <ConfirmDialog
        open={!!deletePositionTarget}
        onOpenChange={(open) => { if (!open) setDeletePositionTarget(null); }}
        title="Delete Position"
        description={`Are you sure you want to delete the "${deletePositionTarget?.positionTitle}" position? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeletePosition}
        loading={deletingPosition}
      />

      <ContactRatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        contactId={id}
        contactName={`${contact.firstName} ${contact.lastName}`}
        currentRating={contact.ratingHistory?.find((r: any) => r.year === new Date().getFullYear())}
        onSaved={fetchContact}
      />
    </div>
  );
}
