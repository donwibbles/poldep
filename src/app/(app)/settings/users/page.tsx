"use client";

import * as React from "react";
import { Plus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function UsersSettingsPage() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [resetTarget, setResetTarget] = React.useState<any>(null);
  const [resetting, setResetting] = React.useState(false);

  const fetchUsers = () => {
    fetch("/api/settings/users").then((r) => r.json()).then((data) => { setUsers(data.users || []); setLoading(false); });
  };

  React.useEffect(() => { fetchUsers(); }, []);

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role") || "MEMBER",
    };
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ title: "User created", variant: "success" });
      setAddOpen(false);
      fetchUsers();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetting(true);
    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/settings/users/${resetTarget.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: formData.get("password") }),
    });
    if (res.ok) {
      toast({ title: "Password reset", variant: "success" });
      setResetTarget(null);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setResetting(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>
      <div className="mt-6 space-y-2">
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setResetTarget(user)}><KeyRound className="h-4 w-4 mr-1" />Reset Password</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div><Label>Name *</Label><Input name="name" required /></div>
            <div><Label>Email *</Label><Input name="email" type="email" required /></div>
            <div><Label>Password *</Label><Input name="password" type="password" required minLength={8} /></div>
            <div>
              <Label>Role</Label>
              <Select name="role" defaultValue="MEMBER">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Creating..." : "Create User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password for {resetTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div><Label>New Password *</Label><Input name="password" type="password" required minLength={8} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={resetting}>{resetting ? "Resetting..." : "Reset Password"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
