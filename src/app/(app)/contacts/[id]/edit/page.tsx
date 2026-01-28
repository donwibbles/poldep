"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CONTACT_TYPES = ["CANDIDATE", "ELECTED_OFFICIAL", "STAFF", "ORGANIZATION"] as const;
const PARTIES = ["Democratic", "Republican", "Independent", "Green", "Libertarian", "Other", "Nonpartisan"];

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [contact, setContact] = React.useState<any>(null);
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");

  React.useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setContact(data);
        setTags(data.tags || []);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    formData.forEach((value, key) => { data[key] = value || null; });
    data.tags = tags;

    const res = await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({ title: "Contact updated", variant: "success" });
      router.push(`/contacts/${id}`);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to update contact", variant: "destructive" });
    }
    setLoading(false);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
  }

  if (!contact) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Edit Contact</h1>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Type *</Label>
                <Select name="type" defaultValue={contact.type} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTACT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Party</Label>
                <Select name="party" defaultValue={contact.party || ""}>
                  <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                  <SelectContent>{PARTIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>First Name *</Label><Input name="firstName" defaultValue={contact.firstName} required /></div>
              <div><Label>Last Name *</Label><Input name="lastName" defaultValue={contact.lastName} required /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Title</Label><Input name="title" defaultValue={contact.title || ""} /></div>
              <div><Label>Organization</Label><Input name="organization" defaultValue={contact.organization || ""} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Email</Label><Input name="email" type="email" defaultValue={contact.email || ""} /></div>
              <div><Label>Phone</Label><Input name="phone" defaultValue={contact.phone || ""} /></div>
            </div>
            <div><Label>Address</Label><Input name="address" defaultValue={contact.address || ""} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>City</Label><Input name="city" defaultValue={contact.city || ""} /></div>
              <div><Label>State</Label><Input name="state" defaultValue={contact.state || ""} /></div>
              <div><Label>ZIP</Label><Input name="zip" defaultValue={contact.zip || ""} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>District</Label><Input name="district" defaultValue={contact.district || ""} /></div>
              <div><Label>Website</Label><Input name="website" type="url" defaultValue={contact.website || ""} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>Twitter</Label><Input name="twitter" defaultValue={contact.twitter || ""} /></div>
              <div><Label>Facebook</Label><Input name="facebook" defaultValue={contact.facebook || ""} /></div>
              <div><Label>Instagram</Label><Input name="instagram" defaultValue={contact.instagram || ""} /></div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} placeholder="Add tag..." />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {tag}<button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-blue-600">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Notes</Label><Textarea name="notes" rows={4} defaultValue={contact.notes || ""} /></div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
