"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EndPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
  onEnded: () => void;
}

export function EndPositionDialog({
  open,
  onOpenChange,
  assignmentId,
  onEnded,
}: EndPositionDialogProps) {
  const { toast } = useToast();
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEndDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open]);

  async function handleSubmit() {
    if (!assignmentId) return;
    setSaving(true);

    const res = await fetch(`/api/position-assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endDate: new Date(endDate),
        notes: notes.trim() || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Position ended", variant: "success" });
      onEnded();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to end position", variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End Position</DialogTitle>
          <DialogDescription>
            Mark this position as ended.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Reason for ending, next steps, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} variant="destructive">
            {saving ? "Saving..." : "End Position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
