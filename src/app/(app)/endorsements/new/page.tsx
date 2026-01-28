"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function NewEndorsementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [races, setRaces] = React.useState<any[]>([]);
  const [stages, setStages] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [previousEndorsements, setPreviousEndorsements] = React.useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = React.useState(searchParams.get("candidateId") || "");
  const [selectedPreviousId, setSelectedPreviousId] = React.useState("");

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

  // Fetch previous endorsements when candidate changes
  React.useEffect(() => {
    if (selectedCandidateId) {
      fetch(`/api/endorsements?candidateId=${selectedCandidateId}&limit=50`)
        .then((r) => r.json())
        .then((data) => {
          setPreviousEndorsements(data.endorsements || []);
        })
        .catch(() => setPreviousEndorsements([]));
    } else {
      setPreviousEndorsements([]);
    }
    setSelectedPreviousId("");
  }, [selectedCandidateId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    formData.forEach((v, k) => { if (v) data[k] = v; });
    if (selectedPreviousId) {
      data.previousEndorsementId = selectedPreviousId;
    }

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
    <Card className="mt-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Candidate *</Label>
            <Select name="candidateId" required value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
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
          {previousEndorsements.length > 0 && (
            <div className="space-y-2">
              <Label>Previous Endorsements</Label>
              <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                <p className="text-xs text-gray-500">This candidate has {previousEndorsements.length} prior endorsement(s):</p>
                {previousEndorsements.map((pe: any) => (
                  <div key={pe.id} className="flex items-center justify-between bg-white rounded border p-2">
                    <Link href={`/endorsements/${pe.id}`} className="text-sm text-blue-600 hover:underline">
                      {pe.race?.office}{pe.race?.district ? ` - ${pe.race.district}` : ""} ({pe.race?.election?.name})
                    </Link>
                    <Badge variant={pe.decision === "ENDORSED" ? "success" : pe.decision === "NOT_ENDORSED" ? "destructive" : "secondary"} className="text-xs">
                      {pe.decision.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
              <div>
                <Label>Link to Previous Endorsement</Label>
                <Select value={selectedPreviousId} onValueChange={setSelectedPreviousId}>
                  <SelectTrigger><SelectValue placeholder="No link (new endorsement)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No link</SelectItem>
                    {previousEndorsements.map((pe: any) => (
                      <SelectItem key={pe.id} value={pe.id}>
                        {pe.race?.office} ({pe.race?.election?.name}) - {pe.decision.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Linking creates a re-endorsement chain for tracking history.</p>
              </div>
            </div>
          )}
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
  );
}

export default function NewEndorsementPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">New Endorsement</h1>
      <Suspense fallback={<Card className="mt-6"><CardContent className="pt-6"><p className="text-sm text-gray-500">Loading...</p></CardContent></Card>}>
        <NewEndorsementForm />
      </Suspense>
    </div>
  );
}
