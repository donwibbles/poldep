"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type ViewMode = "kanban" | "table";

export default function EndorsementsPage() {
  const router = useRouter();
  const [endorsements, setEndorsements] = React.useState<any[]>([]);
  const [stages, setStages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<ViewMode>("kanban");

  React.useEffect(() => {
    Promise.all([
      fetch("/api/endorsements?limit=200").then((r) => r.json()),
      fetch("/api/pipeline-stages").then((r) => r.json()),
    ]).then(([eData, sData]) => {
      setEndorsements(eData.endorsements || []);
      setStages(sData.stages || []);
      setLoading(false);
    });
  }, []);

  const endorsementsByStage = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    stages.forEach((s) => { map[s.id] = []; });
    endorsements.forEach((e) => {
      if (map[e.currentStageId]) map[e.currentStageId].push(e);
    });
    return map;
  }, [endorsements, stages]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Endorsement Pipeline</h1>
        <div className="flex gap-2">
          <div className="flex rounded-md border">
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setView("kanban")}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={view === "table" ? "default" : "ghost"} size="sm" onClick={() => setView("table")}><List className="h-4 w-4" /></Button>
          </div>
          <Link href="/endorsements/new"><Button><Plus className="h-4 w-4 mr-2" />New Endorsement</Button></Link>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className="rounded-t-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: stage.color }}>
                {stage.name} ({endorsementsByStage[stage.id]?.length || 0})
              </div>
              <div className="space-y-2 rounded-b-lg border border-t-0 bg-gray-50 p-2 min-h-[100px]">
                {endorsementsByStage[stage.id]?.map((e: any) => (
                  <Link key={e.id} href={`/endorsements/${e.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">{e.candidate?.firstName} {e.candidate?.lastName}</p>
                        <p className="text-xs text-gray-500 mt-1">{e.race?.office}{e.race?.district ? ` - ${e.race.district}` : ""}</p>
                        {e.assignedTo && <p className="text-xs text-gray-400 mt-1">Assigned: {e.assignedTo.name}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Race</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Decision</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {endorsements.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/endorsements/${e.id}`)}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">{e.candidate?.firstName} {e.candidate?.lastName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{e.race?.office}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge style={{ backgroundColor: e.currentStage?.color + "20", color: e.currentStage?.color, borderColor: e.currentStage?.color }} className="border">{e.currentStage?.name}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm"><Badge variant={e.decision === "ENDORSED" ? "success" : e.decision === "NOT_ENDORSED" ? "destructive" : "secondary"}>{e.decision.replace(/_/g, " ")}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{e.assignedTo?.name || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
