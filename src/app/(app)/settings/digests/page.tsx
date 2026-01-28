"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function DigestSettingsPage() {
  const { toast } = useToast();
  const [frequency, setFrequency] = React.useState("NONE");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/settings/digest")
      .then((r) => r.json())
      .then((data) => { setFrequency(data.frequency || "NONE"); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings/digest", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency }),
    });
    if (res.ok) toast({ title: "Preferences saved", variant: "success" });
    else toast({ title: "Error", variant: "destructive" });
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Email Digest</h1>
      <Card className="mt-6">
        <CardHeader><CardTitle>Digest Frequency</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>How often would you like to receive digest emails?</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
