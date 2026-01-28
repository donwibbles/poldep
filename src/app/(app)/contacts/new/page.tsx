"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CONTACT_TYPES = ["CANDIDATE", "ELECTED_OFFICIAL", "STAFF", "ORGANIZATION"] as const;
const PARTIES = ["Democratic", "Republican", "Independent", "Green", "Libertarian", "Other", "Nonpartisan"];
const TAX_STATUSES = [
  { value: "C501C3", label: "501(c)(3) - Charitable" },
  { value: "C501C4", label: "501(c)(4) - Social Welfare" },
  { value: "C501C5", label: "501(c)(5) - Labor/Agricultural" },
  { value: "C501C6", label: "501(c)(6) - Business League" },
  { value: "FOR_PROFIT", label: "For-Profit" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "OTHER", label: "Other" },
];

export default function NewContactPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [contactType, setContactType] = React.useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (value) data[key] = value;
    });
    data.tags = tags;

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const contact = await res.json();
      toast({ title: "Contact created", variant: "success" });
      router.push(`/contacts/${contact.id}`);
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error || "Failed to create contact", variant: "destructive" });
    }
    setLoading(false);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">New Contact</h1>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select name="type" required value={contactType} onValueChange={setContactType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="party">Party</Label>
                <Select name="party">
                  <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                  <SelectContent>
                    {PARTIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {contactType === "ORGANIZATION" && (
              <div>
                <Label htmlFor="taxStatus">Tax Status</Label>
                <Select name="taxStatus">
                  <SelectTrigger><SelectValue placeholder="Select tax status" /></SelectTrigger>
                  <SelectContent>
                    {TAX_STATUSES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" />
              </div>
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" name="organization" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" />
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" name="zip" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="district">District</Label>
                <Input id="district" name="district" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="url" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input id="twitter" name="twitter" />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" name="facebook" />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" name="instagram" />
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {tag}
                      <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-blue-600">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={4} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Contact"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
