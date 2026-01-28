"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { POSITION_TITLES } from "@/lib/constants";

interface PositionData {
  id: string;
  positionTitle: string;
  jurisdiction?: string | null;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

interface PositionAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  editPosition?: PositionData | null;
  onCreated: () => void;
}

export function PositionAssignmentDialog({
  open,
  onOpenChange,
  contactId,
  editPosition,
  onCreated,
}: PositionAssignmentDialogProps) {
  const { toast } = useToast();
  const [positionTitle, setPositionTitle] = React.useState("");
  const [jurisdiction, setJurisdiction] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const isEditing = !!editPosition;

  React.useEffect(() => {
    if (open && editPosition) {
      setPositionTitle(editPosition.positionTitle);
      setJurisdiction(editPosition.jurisdiction || "");
      setStartDate(editPosition.startDate ? new Date(editPosition.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      setEndDate(editPosition.endDate ? new Date(editPosition.endDate).toISOString().split("T")[0] : "");
      setNotes(editPosition.notes || "");
    } else if (!open) {
      setPositionTitle("");
      setJurisdiction("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setNotes("");
    }
  }, [open, editPosition]);

  async function handleSubmit() {
    if (!positionTitle.trim()) {
      toast({ title: "Error", description: "Position title is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: any = {
      positionTitle: positionTitle.trim(),
      jurisdiction: jurisdiction.trim() || null,
      startDate: new Date(startDate),
      notes: notes.trim() || null,
    };

    if (isEditing) {
      payload.endDate = endDate ? new Date(endDate) : null;
    }

    const url = isEditing ? `/api/position-assignments/${editPosition.id}` : "/api/position-assignments";
    const method = isEditing ? "PATCH" : "POST";

    if (!isEditing) {
      payload.contactId = contactId;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast({ title: isEditing ? "Position updated" : "Position added", variant: "success" });
      onCreated();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || `Failed to ${isEditing ? "update" : "add"} position`, variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Position" : "Add Position"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update position details." : "Add a new position or office for this contact."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Position Title *</Label>
            <Select value={positionTitle} onValueChange={setPositionTitle}>
              <SelectTrigger>
                <SelectValue placeholder="Select position title" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Jurisdiction</Label>
            <Input
              placeholder="e.g., City of Springfield"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>

          <div className={isEditing ? "grid gap-4 sm:grid-cols-2" : ""}>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {isEditing && (
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : (isEditing ? "Save Changes" : "Add Position")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
