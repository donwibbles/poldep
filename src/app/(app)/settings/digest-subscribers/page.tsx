"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

interface Subscriber {
  id: string;
  email: string;
  name: string;
  frequency: "DAILY" | "WEEKLY";
  isActive: boolean;
  source: "user" | "external";
  userId: string | null;
}

export default function DigestSubscribersPage() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = React.useState<Subscriber[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editingSubscriber, setEditingSubscriber] = React.useState<Subscriber | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchSubscribers = () => {
    fetch("/api/admin/digest-subscribers")
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(data.subscribers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchSubscribers();
  }, []);

  async function handleAddSubscriber(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      frequency: formData.get("frequency"),
    };
    const res = await fetch("/api/admin/digest-subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ title: "Subscriber added", variant: "success" });
      setAddOpen(false);
      fetchSubscribers();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleEditSubscriber(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSubscriber) return;
    setEditing(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      frequency: formData.get("frequency"),
      isActive: formData.get("isActive") === "true",
    };
    const res = await fetch(`/api/admin/digest-subscribers/${editingSubscriber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ title: "Subscriber updated", variant: "success" });
      setEditOpen(false);
      setEditingSubscriber(null);
      fetchSubscribers();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setEditing(false);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/digest-subscribers/${deletingId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast({ title: "Subscriber removed", variant: "success" });
      setDeleteOpen(false);
      setDeletingId(null);
      fetchSubscribers();
    } else {
      toast({ title: "Error", description: "Failed to remove subscriber", variant: "destructive" });
    }
    setDeleting(false);
  }

  function openEdit(subscriber: Subscriber) {
    setEditingSubscriber(subscriber);
    setEditOpen(true);
  }

  function openDelete(id: string) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Digest Subscribers</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add External
        </Button>
      </div>
      <p className="text-sm text-gray-500 mt-1">
        Manage who receives digest emails. Users manage their own preferences; external subscribers are managed here.
      </p>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : subscribers.length === 0 ? (
          <p className="text-sm text-gray-500">No digest subscribers yet.</p>
        ) : (
          subscribers.map((subscriber) => (
            <Card key={subscriber.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{subscriber.name}</p>
                  <p className="text-xs text-gray-500 truncate">{subscriber.email}</p>
                </div>
                <Badge variant={subscriber.source === "user" ? "default" : "outline"}>
                  {subscriber.source === "user" ? "User" : "External"}
                </Badge>
                <Badge variant="secondary">{subscriber.frequency}</Badge>
                {subscriber.source === "external" && (
                  <Badge variant={subscriber.isActive ? "success" : "destructive"}>
                    {subscriber.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
                {subscriber.source === "external" && (
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600"
                      onClick={() => openEdit(subscriber)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1 text-gray-400 hover:text-red-500"
                      onClick={() => openDelete(subscriber.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Subscriber</DialogTitle>
            <DialogDescription>
              Add someone who is not a registered user to receive digest emails.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubscriber} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input name="name" required maxLength={200} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select name="frequency" defaultValue="WEEKLY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add Subscriber"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
            <DialogDescription>
              Update {editingSubscriber?.name}&apos;s digest preferences.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubscriber} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={editingSubscriber?.email || ""} disabled />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select name="frequency" defaultValue={editingSubscriber?.frequency || "WEEKLY"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select name="isActive" defaultValue={editingSubscriber?.isActive ? "true" : "false"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editing}>
                {editing ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove Subscriber"
        description="Are you sure you want to remove this subscriber? They will no longer receive digest emails."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
