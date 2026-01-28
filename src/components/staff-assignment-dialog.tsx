"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface StaffAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactType: string;
  onCreated: () => void;
}

export function StaffAssignmentDialog({
  open,
  onOpenChange,
  contactId,
  contactType,
  onCreated,
}: StaffAssignmentDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedName, setSelectedName] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [searching, setSearching] = React.useState(false);

  const isStaff = contactType === "STAFF";

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
      setSelectedId(null);
      setSelectedName("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open]);

  async function handleSearch(query: string) {
    setSearch(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const params = new URLSearchParams({ search: query, limit: "10" });
    if (isStaff) {
      // Staff contacts get assigned to non-staff parents — search all
    } else {
      // Non-staff contacts get staff assigned to them
      params.set("type", "STAFF");
    }
    const res = await fetch(`/api/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.contacts.filter((c: any) => c.id !== contactId));
    }
    setSearching(false);
  }

  async function handleSubmit() {
    if (!selectedId) return;
    setSaving(true);

    const body = isStaff
      ? { staffContactId: contactId, parentContactId: selectedId, startDate: new Date(startDate), notes: notes || null }
      : { staffContactId: selectedId, parentContactId: contactId, startDate: new Date(startDate), notes: notes || null };

    const res = await fetch("/api/staff-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: "Assignment created", variant: "success" });
      onCreated();
      onOpenChange(false);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to create assignment", variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isStaff ? "Assign to Contact" : "Add Staff Member"}</DialogTitle>
          <DialogDescription>
            {isStaff ? "Select a contact to assign this staff member to." : "Select a staff contact to assign."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{isStaff ? "Search contacts" : "Search staff"}</Label>
            <Input
              placeholder="Type to search..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
            {results.length > 0 && !selectedId && (
              <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                {results.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                    onClick={() => {
                      setSelectedId(c.id);
                      setSelectedName(`${c.firstName} ${c.lastName}`);
                      setResults([]);
                      setSearch("");
                    }}
                  >
                    {c.firstName} {c.lastName}
                    <span className="text-gray-400 ml-2 text-xs">{c.type.replace(/_/g, " ")}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-medium">{selectedName}</span>
                <button className="text-xs text-red-500 hover:underline" onClick={() => { setSelectedId(null); setSelectedName(""); }}>
                  Remove
                </button>
              </div>
            )}
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
          <Button onClick={handleSubmit} disabled={!selectedId || saving}>
            {saving ? "Saving..." : "Create Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
