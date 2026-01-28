"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function NewEndorsementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [races, setRaces] = React.useState<any[]>([]);
  const [stages, setStages] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/contacts?type=CANDIDATE&limit=200").then((r) => r.json()),
      fetch("/api/races").then((r) => r.json()),
      fetch("/api/pipeline-stages").then((r) => r.json()),
      fetch("/api/settings/users").then((r) => r.json()).catch(() => ({ users: [] })),
    ]).then(([cData, rData, sData, uData]) => {
      setContacts(cData.contacts || []);
      setRaces(rData.races || []);
      setStages(sData.stages || []);
      setUsers(uData.users || []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    formData.forEach((v, k) => { if (v) data[k] = v; });

    const res = await fetch("/api/endorsements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const endorsement = await res.json();
      toast({ title: "Endorsement created", variant: "success" });
      router.push(`/endorsements/${endorsement.id}`);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to create", variant: "destructive" });
    }
    setLoading(false);
  }

  const firstStage = stages.find((s: any) => !s.isFinal);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">New Endorsement</h1>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Candidate *</Label>
              <Select name="candidateId" required>
                <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Race *</Label>
              <Select name="raceId" required>
                <SelectTrigger><SelectValue placeholder="Select race" /></SelectTrigger>
                <SelectContent>
                  {races.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.office}{r.district ? ` - ${r.district}` : ""} ({r.election?.name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Starting Stage *</Label>
              <Select name="currentStageId" defaultValue={firstStage?.id} required>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {stages.filter((s: any) => !s.isFinal).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned To</Label>
              <Select name="assignedToId">
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Endorsement"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
