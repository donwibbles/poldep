"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

export default function PipelineSettingsPage() {
  const { toast } = useToast();
  const [stages, setStages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<any>(null);
  const [editing, setEditing] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [reordering, setReordering] = React.useState(false);

  const fetchStages = () => {
    fetch("/api/pipeline-stages").then((r) => r.json()).then((data) => { setStages(data.stages || []); setLoading(false); });
  };

  React.useEffect(() => { fetchStages(); }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      order: stages.length,
      isFinal: formData.get("isFinal") === "on",
      color: (formData.get("color") as string) || "#6B7280",
    };
    const res = await fetch("/api/pipeline-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ title: "Stage added", variant: "success" });
      setAddOpen(false);
      fetchStages();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      order: editTarget.order,
      isFinal: formData.get("isFinal") === "on",
      color: (formData.get("color") as string) || "#6B7280",
    };
    const res = await fetch(`/api/pipeline-stages/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ title: "Stage updated", variant: "success" });
      setEditTarget(null);
      fetchStages();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setEditing(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/pipeline-stages/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Stage deleted", variant: "success" });
      fetchStages();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function handleMove(stageId: string, direction: "up" | "down") {
    const currentIndex = stages.findIndex(s => s.id === stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    setReordering(true);

    // Swap the two stages' orders
    const currentStage = stages[currentIndex];
    const swapStage = stages[newIndex];

    // Use batch reorder endpoint to handle unique constraint properly
    const res = await fetch("/api/pipeline-stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stages: [
          { id: currentStage.id, order: swapStage.order },
          { id: swapStage.id, order: currentStage.order },
        ],
      }),
    });

    if (res.ok) {
      fetchStages();
    } else {
      toast({ title: "Error", description: "Failed to reorder stages", variant: "destructive" });
    }
    setReordering(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Stages</h1>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Stage</Button>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Define the stages endorsements move through. Use the arrows to reorder stages.
      </p>
      <div className="mt-6 space-y-2">
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : stages.map((stage, i) => (
          <Card key={stage.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={i === 0 || reordering}
                  onClick={() => handleMove(stage.id, "up")}
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={i === stages.length - 1 || reordering}
                  onClick={() => handleMove(stage.id, "down")}
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="flex-1 text-sm font-medium">{stage.name}</span>
              {stage.isFinal && <Badge variant="secondary">Final</Badge>}
              <span className="text-xs text-gray-400">{stage._count?.endorsements || 0} endorsements</span>
              <Button variant="ghost" size="icon" onClick={() => setEditTarget(stage)} title="Edit stage">
                <Edit className="h-4 w-4 text-gray-400 hover:text-blue-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(stage)} title="Delete stage">
                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pipeline Stage</DialogTitle>
            <DialogDescription>Create a new stage in the endorsement pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><Label>Name *</Label><Input name="name" required /></div>
            <div><Label>Color</Label><Input name="color" type="color" defaultValue="#6B7280" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isFinal" id="isFinal" />
              <Label htmlFor="isFinal">Final stage (locks endorsement)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Stage"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pipeline Stage</DialogTitle>
            <DialogDescription>Update this stage&apos;s properties.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div><Label>Name *</Label><Input name="name" required defaultValue={editTarget?.name} /></div>
            <div><Label>Color</Label><Input name="color" type="color" defaultValue={editTarget?.color || "#6B7280"} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isFinal" id="editIsFinal" defaultChecked={editTarget?.isFinal} />
              <Label htmlFor="editIsFinal">Final stage (locks endorsement)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={editing}>{editing ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Stage"
        description={`Delete "${deleteTarget?.name}"? This will fail if any endorsements are at this stage.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
