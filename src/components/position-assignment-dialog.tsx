"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface PositionAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onCreated: () => void;
}

export function PositionAssignmentDialog({
  open,
  onOpenChange,
  contactId,
  onCreated,
}: PositionAssignmentDialogProps) {
  const { toast } = useToast();
  const [positionTitle, setPositionTitle] = React.useState("");
  const [jurisdiction, setJurisdiction] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPositionTitle("");
      setJurisdiction("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open]);

  async function handleSubmit() {
    if (!positionTitle.trim()) {
      toast({ title: "Error", description: "Position title is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const res = await fetch("/api/position-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        positionTitle: positionTitle.trim(),
        jurisdiction: jurisdiction.trim() || null,
        startDate: new Date(startDate),
        notes: notes.trim() || null,
      }),
    });

    if (res.ok) {
      toast({ title: "Position added", variant: "success" });
      onCreated();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to add position", variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Position</DialogTitle>
          <DialogDescription>
            Add a new position or office for this contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Position Title *</Label>
            <Input
              placeholder="e.g., City Council Member"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Jurisdiction</Label>
            <Input
              placeholder="e.g., City of Springfield"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>

          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Add Position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
