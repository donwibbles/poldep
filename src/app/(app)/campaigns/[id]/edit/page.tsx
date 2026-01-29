"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { previewMailMerge } from "@/lib/mail-merge";
import { sanitizeHtml } from "@/lib/sanitize";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Campaign {
  id: string;
  name: string;
  type: "ONE_TIME" | "DRIP_SEQUENCE";
  status: string;
  templateId: string | null;
  subject: string | null;
  body: string | null;
  scheduledAt: string | null;
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [useSchedule, setUseSchedule] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");

  
  React.useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${params.id}`).then((r) => r.json()),
      fetch("/api/email-templates?limit=100").then((r) => r.json()),
    ]).then(([campaignData, templatesData]) => {
      if (campaignData.error) {
        toast({
          title: "Error",
          description: campaignData.error,
          variant: "destructive",
        });
        router.push("/campaigns");
        return;
      }

      if (campaignData.status !== "DRAFT") {
        toast({
          title: "Error",
          description: "Only draft campaigns can be edited",
          variant: "destructive",
        });
        router.push(`/campaigns/${params.id}`);
        return;
      }

      setCampaign(campaignData);
      setTemplates(templatesData.templates || []);
      setSelectedTemplateId(campaignData.templateId || "");
      setSubject(campaignData.subject || "");
      setBody(campaignData.body || "");
      setUseSchedule(!!campaignData.scheduledAt);
      if (campaignData.scheduledAt) {
        setScheduledAt(
          new Date(campaignData.scheduledAt).toISOString().slice(0, 16)
        );
      }
      setLoading(false);
    });
  }, [params.id, router, toast]);

  function handleTemplateChange(value: string) {
    const templateId = value === "none" ? "" : value;
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name"),
      templateId: selectedTemplateId || null,
      subject,
      body,
      scheduledAt: useSchedule ? scheduledAt : null,
    };

    const res = await fetch(`/api/campaigns/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({ title: "Campaign updated", variant: "success" });
      router.push(`/campaigns/${params.id}`);
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || "Failed to update campaign",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={campaign.name}
                />
              </div>
              <div>
                <Label>Campaign Type</Label>
                <Input value={campaign.type.replace(/_/g, " ")} disabled />
                <p className="text-xs text-gray-500 mt-1">
                  Type cannot be changed after creation
                </p>
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <Label>Email Template (optional)</Label>
              <Select
                value={selectedTemplateId || "none"}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template or write custom content" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template (custom)</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={500}
              />
            </div>

            {/* Body with Rich Text Editor */}
            <Tabs defaultValue="edit" className="w-full">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Label className="mb-2 block">Body *</Label>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Start typing your email content..."
                  minHeight="300px"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use the toolbar to format text and insert mail merge variables.
                  Switch to HTML mode to edit raw HTML.
                </p>
              </TabsContent>
              <TabsContent value="preview" className="mt-2">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="border-b pb-2 mb-4">
                    <p className="text-sm text-gray-500">Subject:</p>
                    <p className="font-medium">{previewMailMerge(subject)}</p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(previewMailMerge(body)),
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Scheduling (for ONE_TIME only) */}
            {campaign.type === "ONE_TIME" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useSchedule"
                    checked={useSchedule}
                    onChange={(e) => setUseSchedule(e.target.checked)}
                  />
                  <Label htmlFor="useSchedule">Schedule for later</Label>
                </div>
                {useSchedule && (
                  <div>
                    <Label htmlFor="scheduledAt">Send At</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required={useSchedule}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/campaigns/${params.id}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
