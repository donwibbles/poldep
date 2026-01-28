"use client";

import * as React from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

export default function PipelineSettingsPage() {
  const { toast } = useToast();
  const [stages, setStages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
  const [deleting, setDeleting] = React.useState(false);

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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Stages</h1>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Stage</Button>
      </div>
      <div className="mt-6 space-y-2">
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : stages.map((stage, i) => (
          <Card key={stage.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <GripVertical className="h-4 w-4 text-gray-400" />
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="flex-1 text-sm font-medium">{stage.name}</span>
              {stage.isFinal && <Badge variant="secondary">Final</Badge>}
              <span className="text-xs text-gray-400">{stage._count?.endorsements || 0} endorsements</span>
              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(stage)}><Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pipeline Stage</DialogTitle></DialogHeader>
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
