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
  Filter,
  Tag,
  UsersRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import { previewMailMerge } from "@/lib/mail-merge";
import { sanitizeHtml } from "@/lib/sanitize";
import { useDebounce } from "@/hooks/use-debounce";
import { US_STATES, PARTIES } from "@/lib/constants";

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
  emailStaff: boolean;
  staffCount?: number;
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
    type: string;
  } | null;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: string | null;
  type: string;
}

interface PreviewItem {
  recipientId: string;
  contactName: string;
  contactType: string;
  mode: "direct" | "staff_outreach";
  toAddresses: string[];
  staffCount?: number;
  isFallback?: boolean;
  subject: string;
  body: string;
  emailStaff: boolean;
}

interface PreviewResponse {
  previews: PreviewItem[];
  totalCount: number;
  directCount: number;
  staffOutreachCount: number;
  limit: number;
  offset: number;
  note: string;
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
  const [sendConfirmOpen, setSendConfirmOpen] = React.useState(false);
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
  const [emailStaff, setEmailStaff] = React.useState(false);

  const debouncedSearch = useDebounce(contactSearch, 300);

  // Bulk add state
  const [bulkMode, setBulkMode] = React.useState<"search" | "all" | "filter" | "tags">("search");
  const [bulkFilters, setBulkFilters] = React.useState({
    type: "",
    state: "",
    party: "",
    officeLevel: "",
  });
  const [bulkTags, setBulkTags] = React.useState("");
  const [bulkEmailStaff, setBulkEmailStaff] = React.useState(false);
  const [bulkPreview, setBulkPreview] = React.useState<{
    totalMatching: number;
    alreadyAdded: number;
    willAdd: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [allTags, setAllTags] = React.useState<string[]>([]);

  // Email previews state
  const [emailPreviews, setEmailPreviews] = React.useState<PreviewItem[]>([]);
  const [previewStats, setPreviewStats] = React.useState<{
    totalCount: number;
    directCount: number;
    staffOutreachCount: number;
  } | null>(null);
  const [loadingEmailPreviews, setLoadingEmailPreviews] = React.useState(false);
  const [expandedPreviews, setExpandedPreviews] = React.useState<Set<string>>(new Set());

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

  const fetchEmailPreviews = React.useCallback(async () => {
    setLoadingEmailPreviews(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/preview?limit=10`);
      const data: PreviewResponse = await res.json();
      setEmailPreviews(data.previews || []);
      setPreviewStats({
        totalCount: data.totalCount,
        directCount: data.directCount,
        staffOutreachCount: data.staffOutreachCount,
      });
    } catch {
      setEmailPreviews([]);
      setPreviewStats(null);
    }
    setLoadingEmailPreviews(false);
  }, [params.id]);

  React.useEffect(() => {
    fetchCampaign();
    fetchRecipients();
  }, [fetchCampaign, fetchRecipients]);

  // Fetch email previews when recipients change
  React.useEffect(() => {
    if (recipients.length > 0) {
      fetchEmailPreviews();
    }
  }, [recipients.length, fetchEmailPreviews]);

  // Fetch all unique tags for tag selection
  React.useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => {
        setAllTags(data.tags || []);
      })
      .catch(() => setAllTags([]));
  }, []);

  // Fetch bulk preview when filters change
  const fetchBulkPreview = React.useCallback(async () => {
    if (bulkMode === "search") {
      setBulkPreview(null);
      return;
    }

    setLoadingPreview(true);
    const queryParams = new URLSearchParams();
    queryParams.set("mode", bulkMode === "all" ? "all_with_email" : bulkMode === "filter" ? "by_filter" : "by_tags");

    if (bulkMode === "filter") {
      if (bulkFilters.type) queryParams.set("type", bulkFilters.type);
      if (bulkFilters.state) queryParams.set("state", bulkFilters.state);
      if (bulkFilters.party) queryParams.set("party", bulkFilters.party);
      if (bulkFilters.officeLevel) queryParams.set("officeLevel", bulkFilters.officeLevel);
    } else if (bulkMode === "tags" && bulkTags) {
      queryParams.set("tags", bulkTags);
    }

    try {
      const res = await fetch(`/api/campaigns/${params.id}/recipients/bulk?${queryParams}`);
      const data = await res.json();
      setBulkPreview(data);
    } catch {
      setBulkPreview(null);
    }
    setLoadingPreview(false);
  }, [bulkMode, bulkFilters, bulkTags, params.id]);

  React.useEffect(() => {
    if (addRecipientsOpen) {
      fetchBulkPreview();
    }
  }, [addRecipientsOpen, fetchBulkPreview]);

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
    setSendConfirmOpen(false);
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
      body: JSON.stringify({
        contactIds: Array.from(selectedContacts),
        emailStaff,
      }),
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
      setEmailStaff(false);
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

  async function handleBulkAddRecipients() {
    if (bulkMode === "search") return;
    setAddingRecipients(true);

    const body: any = {
      mode: bulkMode === "all" ? "all_with_email" : bulkMode === "filter" ? "by_filter" : "by_tags",
      emailStaff: bulkEmailStaff,
    };

    if (bulkMode === "filter") {
      body.filters = {};
      if (bulkFilters.type) body.filters.type = bulkFilters.type;
      if (bulkFilters.state) body.filters.state = bulkFilters.state;
      if (bulkFilters.party) body.filters.party = bulkFilters.party;
      if (bulkFilters.officeLevel) body.filters.officeLevel = bulkFilters.officeLevel;
    } else if (bulkMode === "tags" && bulkTags) {
      body.tags = bulkTags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    const res = await fetch(`/api/campaigns/${params.id}/recipients/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const result = await res.json();
      toast({
        title: "Recipients added",
        description: `Added ${result.added} recipients${result.skipped > 0 ? ` (${result.skipped} already existed)` : ""}`,
        variant: "success",
      });
      setAddRecipientsOpen(false);
      setBulkMode("search");
      setBulkFilters({ type: "", state: "", party: "", officeLevel: "" });
      setBulkTags("");
      setBulkEmailStaff(false);
      setBulkPreview(null);
      fetchCampaign();
      fetchRecipients();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || err.message,
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

  function togglePreviewExpanded(recipientId: string) {
    const newExpanded = new Set(expandedPreviews);
    if (newExpanded.has(recipientId)) {
      newExpanded.delete(recipientId);
    } else {
      newExpanded.add(recipientId);
    }
    setExpandedPreviews(newExpanded);
  }

  // Check if any selected contact is a staff type (for disabling emailStaff option)
  const hasStaffSelected = React.useMemo(() => {
    return searchResults.some(
      (c) => selectedContacts.has(c.id) && c.type === "STAFF"
    );
  }, [searchResults, selectedContacts]);

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
            <Button size="sm" onClick={() => setSendConfirmOpen(true)}>
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {recipient.contact
                            ? `${recipient.contact.firstName} ${recipient.contact.lastName}`
                            : recipient.email}
                        </p>
                        {recipient.emailStaff && (
                          <Badge variant="secondary" className="text-xs">
                            {recipient.staffCount !== undefined && recipient.staffCount > 0
                              ? `${recipient.staffCount} staff`
                              : "Staff outreach"}
                          </Badge>
                        )}
                      </div>
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

      {/* Email Previews Section */}
      {recipients.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Email Previews</CardTitle>
            <CardDescription>
              Preview how emails will appear for each recipient
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEmailPreviews ? (
              <p className="text-sm text-gray-500">Loading previews...</p>
            ) : (
              <div className="space-y-2">
                {emailPreviews.map((preview) => (
                  <div key={preview.recipientId} className="border rounded">
                    <button
                      className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50"
                      onClick={() => togglePreviewExpanded(preview.recipientId)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{preview.contactName}</span>
                        {preview.mode === "staff_outreach" && (
                          <Badge
                            variant={preview.isFallback ? "outline" : "secondary"}
                            className="text-xs"
                          >
                            {preview.staffCount && preview.staffCount > 0
                              ? `${preview.staffCount} staff`
                              : preview.toAddresses.length > 0
                                ? "No staff - direct fallback"
                                : "No staff or email - skipped"}
                          </Badge>
                        )}
                        {preview.mode === "direct" && (
                          <Badge variant="outline" className="text-xs">
                            Direct
                          </Badge>
                        )}
                      </div>
                      {expandedPreviews.has(preview.recipientId) ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {expandedPreviews.has(preview.recipientId) && (
                      <div className="p-4 border-t bg-gray-50 space-y-2">
                        <div className="text-sm">
                          <strong>To:</strong> {preview.toAddresses.join(", ") || "(none)"}
                        </div>
                        <div className="text-sm">
                          <strong>Subject:</strong> {preview.subject}
                        </div>
                        <div className="border rounded p-3 bg-white">
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(preview.body),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {previewStats && previewStats.totalCount > emailPreviews.length && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Showing {emailPreviews.length} of {previewStats.totalCount} recipients
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Preview Dialog (sample data) */}
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
      <Dialog open={addRecipientsOpen} onOpenChange={(open) => {
        setAddRecipientsOpen(open);
        if (!open) {
          setBulkMode("search");
          setSelectedContacts(new Set());
          setContactSearch("");
          setEmailStaff(false);
          setBulkEmailStaff(false);
          setBulkFilters({ type: "", state: "", party: "", officeLevel: "" });
          setBulkTags("");
          setBulkPreview(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recipients</DialogTitle>
            <DialogDescription>
              Add contacts to this campaign. Only contacts with email addresses will be included.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={bulkMode} onValueChange={(v) => setBulkMode(v as typeof bulkMode)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="search" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Search
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                <UsersRound className="h-3 w-3 mr-1" />
                All
              </TabsTrigger>
              <TabsTrigger value="filter" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </TabsTrigger>
              <TabsTrigger value="tags" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                Tags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4 mt-4">
              <Input
                placeholder="Search contacts by name, email, or organization..."
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {contact.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
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
                <>
                  <p className="text-sm text-gray-600">
                    {selectedContacts.size} contact(s) selected
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <Switch
                      checked={emailStaff}
                      onCheckedChange={setEmailStaff}
                      disabled={hasStaffSelected}
                    />
                    <div>
                      <Label className="text-sm font-medium">
                        Email their staff instead
                      </Label>
                      <p className="text-xs text-gray-500">
                        {hasStaffSelected
                          ? "Cannot use with staff contacts"
                          : "Send one email to all staff members (they will see each other in TO field)"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <UsersRound className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-blue-900">Add All Contacts with Email</p>
                </div>
                <p className="text-sm text-blue-700">
                  This will add all contacts in the database that have an email address.
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <Switch
                  checked={bulkEmailStaff}
                  onCheckedChange={setBulkEmailStaff}
                />
                <div>
                  <Label className="text-sm font-medium">
                    Email their staff instead
                  </Label>
                  <p className="text-xs text-gray-500">
                    Staff contacts will be excluded when this is enabled
                  </p>
                </div>
              </div>
              {loadingPreview ? (
                <p className="text-sm text-gray-500">Loading preview...</p>
              ) : bulkPreview && (
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  <p><strong>{bulkPreview.totalMatching}</strong> contacts with email addresses</p>
                  <p><strong>{bulkPreview.alreadyAdded}</strong> already in this campaign</p>
                  <p className="text-green-600 font-medium mt-1">
                    <strong>{bulkPreview.willAdd}</strong> will be added
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="filter" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Type</Label>
                  <Select
                    value={bulkFilters.type}
                    onValueChange={(v) => setBulkFilters({ ...bulkFilters, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any type</SelectItem>
                      <SelectItem value="CANDIDATE">Candidate</SelectItem>
                      <SelectItem value="ELECTED_OFFICIAL">Elected Official</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={bulkFilters.state}
                    onValueChange={(v) => setBulkFilters({ ...bulkFilters, state: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any state</SelectItem>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.abbr} value={s.abbr}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Party</Label>
                  <Select
                    value={bulkFilters.party}
                    onValueChange={(v) => setBulkFilters({ ...bulkFilters, party: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any party" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any party</SelectItem>
                      {PARTIES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Office Level</Label>
                  <Select
                    value={bulkFilters.officeLevel}
                    onValueChange={(v) => setBulkFilters({ ...bulkFilters, officeLevel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any level</SelectItem>
                      <SelectItem value="FEDERAL">Federal</SelectItem>
                      <SelectItem value="STATE">State</SelectItem>
                      <SelectItem value="LOCAL">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <Switch
                  checked={bulkEmailStaff}
                  onCheckedChange={setBulkEmailStaff}
                  disabled={bulkFilters.type === "STAFF"}
                />
                <div>
                  <Label className="text-sm font-medium">
                    Email their staff instead
                  </Label>
                  <p className="text-xs text-gray-500">
                    {bulkFilters.type === "STAFF"
                      ? "Not available for staff contacts"
                      : "Staff contacts will be excluded when this is enabled"}
                  </p>
                </div>
              </div>
              {loadingPreview ? (
                <p className="text-sm text-gray-500">Loading preview...</p>
              ) : bulkPreview && (
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  <p><strong>{bulkPreview.totalMatching}</strong> contacts match filters</p>
                  <p><strong>{bulkPreview.alreadyAdded}</strong> already in this campaign</p>
                  <p className="text-green-600 font-medium mt-1">
                    <strong>{bulkPreview.willAdd}</strong> will be added
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tags" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="e.g., union-member, endorsed-2024"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                />
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {allTags.slice(0, 20).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`px-2 py-1 text-xs rounded border ${
                          bulkTags.split(",").map(t => t.trim()).includes(tag)
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          const currentTags = bulkTags.split(",").map(t => t.trim()).filter(Boolean);
                          if (currentTags.includes(tag)) {
                            setBulkTags(currentTags.filter(t => t !== tag).join(", "));
                          } else {
                            setBulkTags([...currentTags, tag].join(", "));
                          }
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <Switch
                  checked={bulkEmailStaff}
                  onCheckedChange={setBulkEmailStaff}
                />
                <div>
                  <Label className="text-sm font-medium">
                    Email their staff instead
                  </Label>
                  <p className="text-xs text-gray-500">
                    Staff contacts will be excluded when this is enabled
                  </p>
                </div>
              </div>
              {loadingPreview ? (
                <p className="text-sm text-gray-500">Loading preview...</p>
              ) : bulkPreview && bulkTags && (
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  <p><strong>{bulkPreview.totalMatching}</strong> contacts with selected tags</p>
                  <p><strong>{bulkPreview.alreadyAdded}</strong> already in this campaign</p>
                  <p className="text-green-600 font-medium mt-1">
                    <strong>{bulkPreview.willAdd}</strong> will be added
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddRecipientsOpen(false);
                setSelectedContacts(new Set());
                setContactSearch("");
                setEmailStaff(false);
                setBulkEmailStaff(false);
                setBulkMode("search");
                setBulkFilters({ type: "", state: "", party: "", officeLevel: "" });
                setBulkTags("");
                setBulkPreview(null);
              }}
            >
              Cancel
            </Button>
            {bulkMode === "search" ? (
              <Button
                onClick={handleAddRecipients}
                disabled={selectedContacts.size === 0 || addingRecipients}
              >
                {addingRecipients
                  ? "Adding..."
                  : `Add ${selectedContacts.size} Recipient(s)`}
              </Button>
            ) : (
              <Button
                onClick={handleBulkAddRecipients}
                disabled={
                  addingRecipients ||
                  !bulkPreview ||
                  bulkPreview.willAdd === 0 ||
                  (bulkMode === "tags" && !bulkTags.trim())
                }
              >
                {addingRecipients
                  ? "Adding..."
                  : `Add ${bulkPreview?.willAdd || 0} Recipients`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Modal with Previews */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              Review recipients before sending. This will send emails to {campaign.totalRecipients} recipient(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary stats */}
            {previewStats && (
              <div className="flex gap-4">
                <div className="p-3 bg-gray-100 rounded flex-1">
                  <div className="text-2xl font-bold">{previewStats.directCount}</div>
                  <div className="text-sm text-gray-500">Direct emails</div>
                </div>
                <div className="p-3 bg-gray-100 rounded flex-1">
                  <div className="text-2xl font-bold">{previewStats.staffOutreachCount}</div>
                  <div className="text-sm text-gray-500">Staff outreach</div>
                </div>
              </div>
            )}

            {/* Preview list */}
            <div className="space-y-2">
              <h4 className="font-medium">Preview (first 10)</h4>
              {emailPreviews.slice(0, 10).map((preview) => (
                <div key={preview.recipientId} className="p-3 border rounded text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{preview.contactName}</span>
                      {preview.mode === "staff_outreach" ? (
                        <Badge
                          variant={preview.isFallback ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {preview.staffCount && preview.staffCount > 0
                            ? `${preview.staffCount} staff`
                            : "Fallback to direct"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Direct</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-500 mt-1">
                    To: {preview.toAddresses.join(", ") || "(none - will be skipped)"}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Note: Preview shows current staff assignments. Actual send uses live data at send time.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : `Send ${campaign.totalRecipients} Email(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
