"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Pencil,
  Trash2,
  Send,
  Users,
  Mail,
  MousePointer,
  AlertCircle,
  Reply,
  Eye,
  Play,
  Pause,
  UserPlus,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import { previewMailMerge } from "@/lib/mail-merge";
import { sanitizeHtml } from "@/lib/sanitize";
import { useDebounce } from "@/hooks/use-debounce";

interface Campaign {
  id: string;
  name: string;
  type: "ONE_TIME" | "DRIP_SEQUENCE";
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED";
  templateId: string | null;
  template?: { id: string; name: string } | null;
  subject: string | null;
  body: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalReplied: number;
  createdAt: string;
  sequenceSteps?: any[];
}

interface Recipient {
  id: string;
  contactId: string;
  email: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  repliedAt: string | null;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organization: string | null;
  } | null;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: string | null;
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  SCHEDULED: "default",
  SENDING: "default",
  SENT: "success",
  PAUSED: "destructive",
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Add recipients dialog
  const [addRecipientsOpen, setAddRecipientsOpen] = React.useState(false);
  const [contactSearch, setContactSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = React.useState<Set<string>>(
    new Set()
  );
  const [addingRecipients, setAddingRecipients] = React.useState(false);

  const debouncedSearch = useDebounce(contactSearch, 300);

  const fetchCampaign = React.useCallback(() => {
    fetch(`/api/campaigns/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
          router.push("/campaigns");
          return;
        }
        setCampaign(data);
        setLoading(false);
      });
  }, [params.id, router, toast]);

  const fetchRecipients = React.useCallback(() => {
    fetch(`/api/campaigns/${params.id}/recipients?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setRecipients(data.recipients || []);
      });
  }, [params.id]);

  React.useEffect(() => {
    fetchCampaign();
    fetchRecipients();
  }, [fetchCampaign, fetchRecipients]);

  // Search contacts for adding recipients
  React.useEffect(() => {
    if (debouncedSearch.length >= 2) {
      fetch(`/api/contacts?search=${encodeURIComponent(debouncedSearch)}&limit=20`)
        .then((r) => r.json())
        .then((data) => {
          // Filter out contacts without email and already added
          const existingIds = new Set(recipients.map((r) => r.contactId));
          const filtered = (data.contacts || []).filter(
            (c: Contact) => c.email && !existingIds.has(c.id)
          );
          setSearchResults(filtered);
        });
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, recipients]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/campaigns/${params.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast({ title: "Campaign deleted", variant: "success" });
      router.push("/campaigns");
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setDeleting(false);
    setDeleteOpen(false);
  }

  async function handleSend() {
    setSending(true);
    const res = await fetch(`/api/campaigns/${params.id}/send`, {
      method: "POST",
    });
    if (res.ok) {
      toast({ title: "Campaign sent", variant: "success" });
      fetchCampaign();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setSending(false);
    setSendOpen(false);
  }

  async function handlePause() {
    const res = await fetch(`/api/campaigns/${params.id}/pause`, {
      method: "POST",
    });
    if (res.ok) {
      toast({ title: "Campaign paused", variant: "success" });
      fetchCampaign();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  async function handleResume() {
    const res = await fetch(`/api/campaigns/${params.id}/resume`, {
      method: "POST",
    });
    if (res.ok) {
      toast({ title: "Campaign resumed", variant: "success" });
      fetchCampaign();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  function toggleContact(contactId: string) {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  }

  async function handleAddRecipients() {
    if (selectedContacts.size === 0) return;
    setAddingRecipients(true);

    const res = await fetch(`/api/campaigns/${params.id}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: Array.from(selectedContacts) }),
    });

    if (res.ok) {
      const result = await res.json();
      toast({
        title: "Recipients added",
        description: `Added ${result.added} recipients`,
        variant: "success",
      });
      setAddRecipientsOpen(false);
      setSelectedContacts(new Set());
      setContactSearch("");
      fetchCampaign();
      fetchRecipients();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setAddingRecipients(false);
  }

  async function handleRemoveRecipient(contactId: string) {
    const res = await fetch(`/api/campaigns/${params.id}/recipients`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: [contactId] }),
    });

    if (res.ok) {
      toast({ title: "Recipient removed", variant: "success" });
      fetchCampaign();
      fetchRecipients();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!campaign) {
    return null;
  }

  const isDraft = campaign.status === "DRAFT";
  const canSend = isDraft && campaign.totalRecipients > 0;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-2">
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
            <Badge variant="outline">
              {campaign.type.replace(/_/g, " ")}
            </Badge>
            {campaign.template && (
              <Badge variant="secondary">
                Template: {campaign.template.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Link href={`/campaigns/${campaign.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          {canSend && (
            <Button size="sm" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          )}
          {campaign.status === "SENDING" && campaign.type === "DRIP_SEQUENCE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {campaign.status === "PAUSED" && (
            <Button size="sm" onClick={handleResume}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">Recipients</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {campaign.totalRecipients}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Sent</span>
            </div>
            <p className="text-2xl font-bold mt-1">{campaign.totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Opened</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {campaign.totalOpened}
              {campaign.totalSent > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({Math.round((campaign.totalOpened / campaign.totalSent) * 100)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">Clicked</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {campaign.totalClicked}
              {campaign.totalSent > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({Math.round((campaign.totalClicked / campaign.totalSent) * 100)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-500">Bounced</span>
            </div>
            <p className="text-2xl font-bold mt-1">{campaign.totalBounced}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-500">Replied</span>
            </div>
            <p className="text-2xl font-bold mt-1">{campaign.totalReplied}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span>{formatDateTime(campaign.createdAt)}</span>
            </div>
            {campaign.scheduledAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled for</span>
                <span>{formatDateTime(campaign.scheduledAt)}</span>
              </div>
            )}
            {campaign.sentAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Sent at</span>
                <span>{formatDateTime(campaign.sentAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Subject</span>
              <span className="text-right max-w-[200px] truncate">
                {campaign.subject || "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recipients Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recipients</CardTitle>
            {isDraft && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddRecipientsOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recipients.length === 0 ? (
              <p className="text-sm text-gray-500">No recipients added yet.</p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {recipients.slice(0, 20).map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium">
                        {recipient.contact
                          ? `${recipient.contact.firstName} ${recipient.contact.lastName}`
                          : recipient.email}
                      </p>
                      <p className="text-xs text-gray-500">{recipient.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {recipient.sentAt && (
                        <Badge variant="secondary" className="text-xs">
                          Sent
                        </Badge>
                      )}
                      {recipient.openedAt && (
                        <Badge variant="success" className="text-xs">
                          Opened
                        </Badge>
                      )}
                      {recipient.bouncedAt && (
                        <Badge variant="destructive" className="text-xs">
                          Bounced
                        </Badge>
                      )}
                      {isDraft && (
                        <button
                          className="text-gray-400 hover:text-red-500"
                          onClick={() =>
                            handleRemoveRecipient(recipient.contactId)
                          }
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {recipients.length > 20 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{recipients.length - 20} more recipients
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview with sample contact data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-2">
              <p className="text-sm text-gray-500">Subject:</p>
              <p className="font-medium">
                {previewMailMerge(campaign.subject || "")}
              </p>
            </div>
            <div
              className="prose prose-sm max-w-none border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(previewMailMerge(campaign.body || "")),
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Recipients Dialog */}
      <Dialog open={addRecipientsOpen} onOpenChange={setAddRecipientsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Recipients</DialogTitle>
            <DialogDescription>
              Search for contacts to add to this campaign. Only contacts with
              email addresses are shown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchResults.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center justify-between p-3 border rounded cursor-pointer ${
                      selectedContacts.has(contact.id)
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <div>
                      <p className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{contact.email}</p>
                      {contact.organization && (
                        <p className="text-xs text-gray-400">
                          {contact.organization}
                        </p>
                      )}
                    </div>
                    {selectedContacts.has(contact.id) && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
            {contactSearch.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-gray-500">
                No contacts found. Try a different search.
              </p>
            )}
            {selectedContacts.size > 0 && (
              <p className="text-sm text-gray-600">
                {selectedContacts.size} contact(s) selected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddRecipientsOpen(false);
                setSelectedContacts(new Set());
                setContactSearch("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRecipients}
              disabled={selectedContacts.size === 0 || addingRecipients}
            >
              {addingRecipients
                ? "Adding..."
                : `Add ${selectedContacts.size} Recipient(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation */}
      <ConfirmDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        title="Send Campaign"
        description={`Are you sure you want to send this campaign to ${campaign.totalRecipients} recipients? This action cannot be undone.`}
        confirmLabel="Send Now"
        onConfirm={handleSend}
        loading={sending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
