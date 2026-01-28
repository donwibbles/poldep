"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAvailableVariables, previewMailMerge } from "@/lib/mail-merge";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    campaigns: number;
    sequenceSteps: number;
  };
}

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingTemplate, setEditingTemplate] =
    React.useState<EmailTemplate | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewTemplate, setPreviewTemplate] =
    React.useState<EmailTemplate | null>(null);

  // Form state for live preview
  const [formSubject, setFormSubject] = React.useState("");
  const [formBody, setFormBody] = React.useState("");

  const variables = getAvailableVariables();

  const fetchTemplates = () => {
    fetch("/api/email-templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  function openCreate() {
    setEditingTemplate(null);
    setFormSubject("");
    setFormBody("");
    setDialogOpen(true);
  }

  function openEdit(template: EmailTemplate) {
    setEditingTemplate(template);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setDialogOpen(true);
  }

  function openPreview(template: EmailTemplate) {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  function openDelete(id: string) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      subject: formData.get("subject"),
      body: formData.get("body"),
      isDefault: formData.get("isDefault") === "on",
    };

    const isEdit = !!editingTemplate;
    const url = isEdit
      ? `/api/email-templates/${editingTemplate.id}`
      : "/api/email-templates";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: isEdit ? "Template updated" : "Template created",
        variant: "success",
      });
      setDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);

    const res = await fetch(`/api/email-templates/${deletingId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast({ title: "Template deleted", variant: "success" });
      setDeleteOpen(false);
      setDeletingId(null);
      fetchTemplates();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setDeleting(false);
  }

  function insertVariable(variable: string) {
    setFormBody((prev) => prev + variable);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>
      <p className="text-sm text-gray-500 mt-1">
        Create reusable email templates with mail merge variables for campaigns.
      </p>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No email templates yet. Create one to get started.
          </p>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {template.name}
                    </p>
                    {template.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {template.subject}
                  </p>
                </div>
                {template._count && (
                  <Badge variant="secondary">
                    {template._count.campaigns + template._count.sequenceSteps}{" "}
                    uses
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => openPreview(template)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => openEdit(template)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-500"
                    onClick={() => openDelete(template.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Email Template"}
            </DialogTitle>
            <DialogDescription>
              Use mail merge variables like {"{{firstName}}"} to personalize
              emails.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={editingTemplate?.name || ""}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  name="isDefault"
                  id="isDefault"
                  defaultChecked={editingTemplate?.isDefault}
                />
                <Label htmlFor="isDefault">Set as default template</Label>
              </div>
            </div>

            <div>
              <Label>Subject *</Label>
              <Input
                name="subject"
                required
                maxLength={500}
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g., Hello {{firstName}}, we have updates for you"
              />
            </div>

            <Tabs defaultValue="edit" className="w-full">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Label>Body (HTML) *</Label>
                <Textarea
                  name="body"
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="<p>Dear {{firstName}},</p><p>Thank you for your support...</p>"
                  className="min-h-[300px] font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-2">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="border-b pb-2 mb-4">
                    <p className="text-sm text-gray-500">Subject:</p>
                    <p className="font-medium">{previewMailMerge(formSubject)}</p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: previewMailMerge(formBody),
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="variables" className="mt-2">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    Click a variable to insert it into the body:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {variables.map((v) => (
                      <button
                        key={v.variable}
                        type="button"
                        onClick={() => insertVariable(v.variable)}
                        className="flex items-center gap-2 p-2 text-left text-sm bg-white border rounded hover:bg-blue-50 hover:border-blue-300"
                      >
                        <code className="text-blue-600">{v.variable}</code>
                        <span className="text-gray-500 text-xs">
                          {v.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingTemplate
                    ? "Save Changes"
                    : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name} - Preview</DialogTitle>
            <DialogDescription>
              Preview with sample contact data
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <p className="text-sm text-gray-500">Subject:</p>
                <p className="font-medium">
                  {previewMailMerge(previewTemplate.subject)}
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none border rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{
                  __html: previewMailMerge(previewTemplate.body),
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Template"
        description="Are you sure you want to delete this template? This cannot be undone. Templates in use by campaigns cannot be deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
