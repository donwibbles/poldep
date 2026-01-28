"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function EndorsementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [endorsement, setEndorsement] = React.useState<any>(null);
  const [stages, setStages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [advanceStageId, setAdvanceStageId] = React.useState("");
  const [advanceNotes, setAdvanceNotes] = React.useState("");
  const [advancing, setAdvancing] = React.useState(false);

  const fetchData = React.useCallback(() => {
    Promise.all([
      fetch(`/api/endorsements/${id}`).then((r) => r.json()),
      fetch("/api/pipeline-stages").then((r) => r.json()),
    ]).then(([eData, sData]) => {
      setEndorsement(eData);
      setStages(sData.stages || []);
      setLoading(false);
    });
  }, [id]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAdvance() {
    if (!advanceStageId) return;
    setAdvancing(true);
    const res = await fetch(`/api/endorsements/${id}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: advanceStageId, notes: advanceNotes || null }),
    });
    if (res.ok) {
      toast({ title: "Stage advanced", variant: "success" });
      setAdvanceOpen(false);
      setAdvanceStageId("");
      setAdvanceNotes("");
      fetchData();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setAdvancing(false);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!endorsement) return <p className="text-sm text-red-500">Endorsement not found.</p>;

  const isLocked = !!endorsement.lockedAt;
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/endorsements")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{endorsement.candidate?.firstName} {endorsement.candidate?.lastName}</h1>
          <p className="text-sm text-gray-500">{endorsement.race?.office}{endorsement.race?.district ? ` - ${endorsement.race.district}` : ""} &middot; {endorsement.race?.election?.name}</p>
        </div>
        {!isLocked && (
          <Button onClick={() => setAdvanceOpen(true)}><ArrowRight className="h-4 w-4 mr-2" />Advance Stage</Button>
        )}
      </div>

      {isLocked && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-4">
          <Lock className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">This endorsement has been finalized</p>
            <p className="text-xs text-yellow-600">Decision: {endorsement.decision.replace(/_/g, " ")} &middot; Finalized {formatDate(endorsement.lockedAt)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Current Status</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge className="text-sm px-3 py-1" style={{ backgroundColor: endorsement.currentStage?.color + "20", color: endorsement.currentStage?.color, borderColor: endorsement.currentStage?.color }}>{endorsement.currentStage?.name}</Badge>
                <Badge variant={endorsement.decision === "ENDORSED" ? "success" : endorsement.decision === "NOT_ENDORSED" ? "destructive" : endorsement.decision === "NO_ENDORSEMENT" ? "secondary" : "warning"}>{endorsement.decision.replace(/_/g, " ")}</Badge>
              </div>
              {endorsement.assignedTo && <p className="mt-3 text-sm text-gray-500">Assigned to: {endorsement.assignedTo.name}</p>}
              {endorsement.notes && <p className="mt-3 text-sm text-gray-700">{endorsement.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Stage History</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                {endorsement.stageHistory?.map((h: any, i: number) => (
                  <div key={h.id} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full border-2" style={{ borderColor: h.stage?.color, backgroundColor: h.exitedAt ? h.stage?.color : "white" }} />
                      {i < endorsement.stageHistory.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{h.stage?.name}</p>
                      <p className="text-xs text-gray-500">Entered: {formatDateTime(h.enteredAt)}{h.exitedAt ? ` — Exited: ${formatDateTime(h.exitedAt)}` : " (current)"}</p>
                      {h.notes && <p className="text-xs text-gray-600 mt-1">{h.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {endorsement.communications?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Linked Communications</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {endorsement.communications.map((c: any) => (
                    <Link key={c.id} href={`/communications/${c.id}`} className="block rounded border p-3 hover:bg-gray-50">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{c.subject}</span>
                        <Badge variant="outline" className="text-xs">{c.type.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(c.date)}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Candidate</CardTitle></CardHeader>
            <CardContent>
              <Link href={`/contacts/${endorsement.candidate?.id}`} className="text-sm text-blue-600 hover:underline">
                {endorsement.candidate?.firstName} {endorsement.candidate?.lastName}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Race</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{endorsement.race?.office}</p>
              {endorsement.race?.district && <p className="text-xs text-gray-500">District: {endorsement.race.district}</p>}
              <Link href={`/elections/${endorsement.race?.election?.id}`} className="text-xs text-blue-600 hover:underline">{endorsement.race?.election?.name}</Link>
            </CardContent>
          </Card>

          {endorsement.tasks?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {endorsement.tasks.map((t: any) => (
                    <li key={t.id} className="text-sm flex items-center gap-2">
                      <span className={t.status === "DONE" ? "line-through text-gray-400" : ""}>{t.title}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {endorsement.previousEndorsement && (
            <Card>
              <CardHeader><CardTitle>Previous Endorsement</CardTitle></CardHeader>
              <CardContent>
                <Link href={`/endorsements/${endorsement.previousEndorsement.id}`} className="block rounded border p-2 hover:bg-gray-50">
                  <p className="text-sm font-medium">{endorsement.previousEndorsement.race?.office}{endorsement.previousEndorsement.race?.district ? ` - ${endorsement.previousEndorsement.race.district}` : ""}</p>
                  <p className="text-xs text-gray-500">{endorsement.previousEndorsement.race?.election?.name}</p>
                </Link>
              </CardContent>
            </Card>
          )}

          {endorsement.reEndorsements?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Re-endorsements ({endorsement.reEndorsements.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {endorsement.reEndorsements.map((re: any) => (
                    <Link key={re.id} href={`/endorsements/${re.id}`} className="block rounded border p-2 hover:bg-gray-50">
                      <p className="text-sm font-medium">{re.race?.office}{re.race?.district ? ` - ${re.race.district}` : ""}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs" style={{ borderColor: re.currentStage?.color }}>{re.currentStage?.name}</Badge>
                        <span className="text-xs text-gray-500">{re.race?.election?.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Advance Stage</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Move to Stage</Label>
              <Select value={advanceStageId} onValueChange={setAdvanceStageId}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.isFinal ? " (Final)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceOpen(false)}>Cancel</Button>
            <Button onClick={handleAdvance} disabled={advancing || !advanceStageId}>{advancing ? "Advancing..." : "Advance"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
