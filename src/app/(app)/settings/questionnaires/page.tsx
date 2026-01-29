"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, FileQuestion, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

interface Questionnaire {
  id: string;
  name: string;
  isActive: boolean;
  stageId: string | null;
  stage: { id: string; name: string } | null;
  _count: {
    questions: number;
    responses: number;
  };
}

interface PipelineStage {
  id: string;
  name: string;
}

export default function QuestionnairesPage() {
  const { toast } = useToast();
  const [questionnaires, setQuestionnaires] = React.useState<Questionnaire[]>([]);
  const [stages, setStages] = React.useState<PipelineStage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Questionnaire | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [newName, setNewName] = React.useState("");
  const [newStageId, setNewStageId] = React.useState("");

  const fetchQuestionnaires = () => {
    Promise.all([
      fetch("/api/questionnaires?includeInactive=true").then((r) => r.json()),
      fetch("/api/pipeline-stages").then((r) => r.json()),
    ]).then(([data, stagesData]) => {
      setQuestionnaires(data.questionnaires || []);
      setStages(stagesData.stages || []);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    fetchQuestionnaires();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);

    const res = await fetch("/api/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        stageId: newStageId || null,
      }),
    });

    if (res.ok) {
      toast({ title: "Questionnaire created", variant: "success" });
      setAddOpen(false);
      setNewName("");
      setNewStageId("");
      fetchQuestionnaires();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const res = await fetch(`/api/questionnaires/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      const result = await res.json();
      toast({
        title: result.deactivated ? "Questionnaire deactivated" : "Questionnaire deleted",
        variant: "success",
      });
      fetchQuestionnaires();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function toggleActive(questionnaire: Questionnaire) {
    const res = await fetch(`/api/questionnaires/${questionnaire.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !questionnaire.isActive }),
    });

    if (res.ok) {
      toast({
        title: questionnaire.isActive ? "Questionnaire deactivated" : "Questionnaire activated",
        variant: "success",
      });
      fetchQuestionnaires();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create questionnaires for candidate vetting and endorsement evaluation.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Questionnaire
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : questionnaires.length === 0 ? (
          <p className="text-sm text-gray-500">
            No questionnaires yet. Create one to get started.
          </p>
        ) : (
          questionnaires.map((q) => (
            <Card key={q.id} className={!q.isActive ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <FileQuestion className="h-5 w-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/settings/questionnaires/${q.id}`}
                      className="text-sm font-medium hover:text-blue-600"
                    >
                      {q.name}
                    </Link>
                    {!q.isActive && <Badge variant="secondary">Inactive</Badge>}
                    {q.stage && (
                      <Badge variant="outline" className="text-xs">
                        Auto: {q.stage.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {q._count.questions} questions &middot; {q._count.responses} responses
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(q)}
                    title={q.isActive ? "Deactivate" : "Activate"}
                  >
                    {q.isActive ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-green-500" />
                    )}
                  </Button>
                  <Link href={`/settings/questionnaires/${q.id}`}>
                    <Button variant="ghost" size="icon" title="Edit">
                      <Pencil className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(q)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Questionnaire</DialogTitle>
            <DialogDescription>
              Create a new questionnaire for candidate vetting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Candidate Vetting Form"
                required
              />
            </div>
            <div>
              <Label>Auto-request on Stage (optional)</Label>
              <Select value={newStageId} onValueChange={setNewStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No auto-request</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                If set, this questionnaire will be automatically requested when an
                endorsement enters the selected pipeline stage.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adding || !newName.trim()}>
                {adding ? "Creating..." : "Create Questionnaire"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Questionnaire"
        description={
          deleteTarget?._count.responses
            ? `This questionnaire has ${deleteTarget._count.responses} responses and will be deactivated instead of deleted.`
            : "Are you sure you want to delete this questionnaire? This cannot be undone."
        }
        confirmLabel={deleteTarget?._count.responses ? "Deactivate" : "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
