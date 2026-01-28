"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EndAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
  onEnded: () => void;
}

export function EndAssignmentDialog({
  open,
  onOpenChange,
  assignmentId,
  onEnded,
}: EndAssignmentDialogProps) {
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

    const res = await fetch(`/api/staff-assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: new Date(endDate), notes: notes || null }),
    });

    if (res.ok) {
      toast({ title: "Assignment ended", variant: "success" });
      onEnded();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to end assignment", variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End Assignment</DialogTitle>
          <DialogDescription>Set an end date for this staff assignment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "End Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
