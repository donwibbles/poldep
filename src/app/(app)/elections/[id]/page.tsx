"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [election, setElection] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [addRaceOpen, setAddRaceOpen] = React.useState(false);
  const [addingRace, setAddingRace] = React.useState(false);

  const fetchElection = React.useCallback(() => {
    fetch(`/api/elections/${id}`).then((r) => r.json()).then((data) => { setElection(data); setLoading(false); });
  }, [id]);

  React.useEffect(() => { fetchElection(); }, [fetchElection]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/elections/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Election deleted", variant: "success" }); router.push("/elections"); }
    else { toast({ title: "Error", variant: "destructive" }); }
    setDeleting(false);
  }

  async function handleAddRace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingRace(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = { electionId: id };
    formData.forEach((v, k) => { if (v) data[k] = v; });

    const res = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ title: "Race added", variant: "success" });
      setAddRaceOpen(false);
      fetchElection();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAddingRace(false);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!election) return <p className="text-sm text-red-500">Election not found.</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/elections")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{election.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{election.type}</Badge>
            <span className="text-sm text-gray-500">{formatDate(election.date)} &middot; Cycle {election.cycle}</span>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Races ({election.races?.length || 0})</h2>
        <Button size="sm" onClick={() => setAddRaceOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Race</Button>
      </div>

      {election.races?.length === 0 ? (
        <p className="text-sm text-gray-500">No races yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {election.races?.map((race: any) => (
            <Card key={race.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{race.office}{race.district ? ` - ${race.district}` : ""}</p>
                    <p className="text-xs text-gray-500 mt-1">{race.candidates?.length || 0} candidate(s) &middot; {race.endorsements?.length || 0} endorsement(s)</p>
                  </div>
                </div>
                {race.candidates?.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {race.candidates.map((rc: any) => (
                      <Link key={rc.contact.id} href={`/contacts/${rc.contact.id}`}>
                        <Badge variant="outline" className="cursor-pointer">{rc.contact.firstName} {rc.contact.lastName}{rc.isIncumbent ? " (I)" : ""}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Election" description="This will also delete all associated races. Continue?" confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} loading={deleting} />

      <Dialog open={addRaceOpen} onOpenChange={setAddRaceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Race</DialogTitle></DialogHeader>
          <form onSubmit={handleAddRace} className="space-y-4">
            <div><Label>Office *</Label><Input name="office" required placeholder="e.g., State Assembly" /></div>
            <div><Label>District</Label><Input name="district" placeholder="e.g., District 45" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddRaceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addingRace}>{addingRace ? "Adding..." : "Add Race"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
