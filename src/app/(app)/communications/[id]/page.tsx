"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function CommunicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [comm, setComm] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/communications/${id}`).then((r) => r.json()).then(setComm).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/communications/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted", variant: "success" }); router.push("/communications"); }
    else { toast({ title: "Error", variant: "destructive" }); }
    setDeleting(false);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!comm) return <p className="text-sm text-red-500">Not found.</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/communications")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{comm.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{comm.type.replace(/_/g, " ")}</Badge>
            <span className="text-sm text-gray-500">{formatDateTime(comm.date)}</span>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {comm.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: comm.notes }} /></CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {comm.contacts?.map((cc: any) => (
                  <li key={cc.contact.id}><Link href={`/contacts/${cc.contact.id}`} className="text-sm text-blue-600 hover:underline">{cc.contact.firstName} {cc.contact.lastName}</Link></li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {comm.followUpDate && (
            <Card>
              <CardHeader><CardTitle>Follow-up</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{formatDate(comm.followUpDate)}</p></CardContent>
            </Card>
          )}
          {comm.endorsement && (
            <Card>
              <CardHeader><CardTitle>Linked Endorsement</CardTitle></CardHeader>
              <CardContent><Link href={`/endorsements/${comm.endorsement.id}`} className="text-sm text-blue-600 hover:underline">{comm.endorsement.candidate?.firstName} {comm.endorsement.candidate?.lastName}</Link></CardContent>
            </Card>
          )}
        </div>
      </div>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Communication" description="Are you sure?" confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
