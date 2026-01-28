"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("");

  const fetchTasks = React.useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("limit", "100");
    fetch(`/api/tasks?${params}`)
      .then((r) => r.json())
      .then((data) => { setTasks(data.tasks || []); setLoading(false); });
  }, [statusFilter]);

  React.useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function toggleStatus(task: any) {
    const newStatus = task.status === "PENDING" ? "DONE" : "PENDING";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, status: newStatus, assignedToId: task.assignedTo?.id }),
    });
    if (res.ok) {
      fetchTasks();
    } else {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <Link href="/tasks/new"><Button><Plus className="h-4 w-4 mr-2" />New Task</Button></Link>
      </div>
      <div className="mt-4 flex gap-1">
        {[{ value: "", label: "All" }, { value: "PENDING", label: "Pending" }, { value: "DONE", label: "Done" }].map((f) => (
          <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f.value)}>{f.label}</Button>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : tasks.length === 0 ? <p className="text-sm text-gray-500">No tasks.</p> : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <button onClick={() => toggleStatus(task)} className="shrink-0">
                  {task.status === "DONE" ? <Check className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-gray-300" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.dueDate && <span className="text-xs text-gray-500">Due {formatDate(task.dueDate)}</span>}
                    {task.assignedTo && <Badge variant="outline" className="text-xs">{task.assignedTo.name}</Badge>}
                    {task.contact && <Link href={`/contacts/${task.contact.id}`} className="text-xs text-blue-600 hover:underline">{task.contact.firstName} {task.contact.lastName}</Link>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
