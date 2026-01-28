"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

const COMM_TYPES = [
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "MEETING_IN_PERSON", label: "Meeting In Person" },
  { value: "MEETING_VIRTUAL", label: "Meeting Virtual" },
  { value: "EMAIL", label: "Email" },
  { value: "LETTER_MAILER", label: "Letter/Mailer" },
  { value: "EVENT_ACTION", label: "Event/Action" },
  { value: "TEXT", label: "Text" },
  { value: "LEFT_VOICEMAIL", label: "Left Voicemail" },
];

export default function NewCommunicationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [contactSearch, setContactSearch] = React.useState("");
  const [contactResults, setContactResults] = React.useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = React.useState<any[]>([]);
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [createFollowUpTask, setCreateFollowUpTask] = React.useState(false);
  const [assignTaskToId, setAssignTaskToId] = React.useState<string>("");
  const [users, setUsers] = React.useState<any[]>([]);
  const debouncedSearch = useDebounce(contactSearch);

  React.useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []));
  }, []);

  React.useEffect(() => {
    if (debouncedSearch.length < 2) { setContactResults([]); return; }
    fetch(`/api/contacts?search=${debouncedSearch}&limit=10`)
      .then((r) => r.json())
      .then((data) => setContactResults(data.contacts || []));
  }, [debouncedSearch]);

  function addContact(contact: any) {
    if (!selectedContacts.find((c) => c.id === contact.id)) {
      setSelectedContacts([...selectedContacts, contact]);
    }
    setContactSearch("");
    setContactResults([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedContacts.length === 0) {
      toast({ title: "Error", description: "Select at least one contact", variant: "destructive" });
      return;
    }
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    formData.forEach((v, k) => { if (v) data[k] = v; });
    data.contactIds = selectedContacts.map((c) => c.id);
    if (followUpDate && createFollowUpTask) {
      data.createFollowUpTask = true;
      if (assignTaskToId) data.assignTaskToId = assignTaskToId;
    }

    const res = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const comm = await res.json();
      toast({ title: "Communication logged", variant: "success" });
      router.push(`/communications/${comm.id}`);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Log Communication</h1>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{COMM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input name="date" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} /></div>
            <div><Label>Subject *</Label><Input name="subject" required /></div>
            <div>
              <Label>Contacts *</Label>
              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedContacts.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-1">
                      {c.firstName} {c.lastName}
                      <button type="button" onClick={() => setSelectedContacts(selectedContacts.filter((sc) => sc.id !== c.id))}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Search contacts..." />
                {contactResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-auto">
                    {contactResults.map((c) => (
                      <button key={c.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" onClick={() => addContact(c)}>
                        {c.firstName} {c.lastName}{c.organization ? ` (${c.organization})` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div><Label>Notes</Label><Textarea name="notes" rows={4} /></div>
            <div>
              <Label>Follow-up Date</Label>
              <Input name="followUpDate" type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            {followUpDate && (
              <div className="space-y-3 rounded-lg border p-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="createTask"
                    checked={createFollowUpTask}
                    onCheckedChange={(checked) => setCreateFollowUpTask(checked === true)}
                  />
                  <Label htmlFor="createTask" className="font-normal cursor-pointer">Create follow-up task</Label>
                </div>
                {createFollowUpTask && (
                  <div>
                    <Label>Assign task to</Label>
                    <Select value={assignTaskToId} onValueChange={setAssignTaskToId}>
                      <SelectTrigger><SelectValue placeholder="Myself (default)" /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Log Communication"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
