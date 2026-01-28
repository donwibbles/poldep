"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";

const COMMUNICATION_TYPES = [
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "MEETING_IN_PERSON", label: "Meeting (In Person)" },
  { value: "MEETING_VIRTUAL", label: "Meeting (Virtual)" },
  { value: "EMAIL", label: "Email" },
  { value: "LETTER_MAILER", label: "Letter/Mailer" },
  { value: "EVENT_ACTION", label: "Event/Action" },
  { value: "TEXT", label: "Text" },
  { value: "LEFT_VOICEMAIL", label: "Left Voicemail" },
];

interface LogCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  endorsements?: Array<{
    id: string;
    race: { office: string; district?: string };
  }>;
  onCreated: () => void;
}

export function LogCommunicationDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  endorsements = [],
  onCreated,
}: LogCommunicationDialogProps) {
  const { toast } = useToast();
  const [type, setType] = React.useState("PHONE_CALL");
  const [subject, setSubject] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [endorsementId, setEndorsementId] = React.useState("");
  const [createTask, setCreateTask] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setType("PHONE_CALL");
      setSubject("");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
      setFollowUpDate("");
      setEndorsementId("");
      setCreateTask(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Subject is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const data: any = {
      type,
      subject: subject.trim(),
      notes: notes.trim() || null,
      date: new Date(date),
      contactIds: [contactId],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      endorsementId: endorsementId || null,
      createFollowUpTask: createTask && !!followUpDate,
    };

    const res = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({ title: "Communication logged", variant: "success" });
      onCreated();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || "Failed to log communication",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
          <DialogDescription>
            Record a communication with {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Subject *</Label>
            <Input
              placeholder="e.g., Discussed endorsement timeline"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {endorsements.length > 0 && (
            <div>
              <Label>Link to Endorsement</Label>
              <Select value={endorsementId || "none"} onValueChange={(v) => setEndorsementId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No endorsement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No endorsement</SelectItem>
                  {endorsements.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.race.office}
                      {e.race.district ? ` - ${e.race.district}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Follow-up Date</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {followUpDate && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createTask"
                checked={createTask}
                onChange={(e) => setCreateTask(e.target.checked)}
              />
              <Label htmlFor="createTask" className="cursor-pointer">
                Create follow-up task
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Log Communication"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
