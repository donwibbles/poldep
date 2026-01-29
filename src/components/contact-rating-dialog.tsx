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

const RATINGS = [
  { value: "BRONZE", label: "Bronze", color: "#CD7F32" },
  { value: "SILVER", label: "Silver", color: "#C0C0C0" },
  { value: "GOLD", label: "Gold", color: "#FFD700" },
  { value: "PLATINUM", label: "Platinum", color: "#E5E4E2" },
];

interface ContactRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentRating?: { rating: string; year: number; notes?: string | null };
  onSaved: () => void;
}

export function ContactRatingDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentRating,
  onSaved,
}: ContactRatingDialogProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = React.useState(currentRating?.year || currentYear);
  const [rating, setRating] = React.useState(currentRating?.rating || "");
  const [notes, setNotes] = React.useState(currentRating?.notes || "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setYear(currentRating?.year || currentYear);
      setRating(currentRating?.rating || "");
      setNotes(currentRating?.notes || "");
    }
  }, [open, currentRating, currentYear]);

  async function handleSubmit() {
    if (!rating) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/contacts/${contactId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, rating, notes: notes || null }),
    });

    if (res.ok) {
      toast({ title: "Rating saved", variant: "success" });
      onSaved();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || "Failed to save rating",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  // Generate year options (current year and 5 previous years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Contact Rating</DialogTitle>
          <DialogDescription>
            Assign a rating for {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rating *</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                {RATINGS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes about this rating..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
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
            {saving ? "Saving..." : "Save Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
