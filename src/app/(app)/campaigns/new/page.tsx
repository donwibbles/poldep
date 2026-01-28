"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAvailableVariables, previewMailMerge } from "@/lib/mail-merge";
import { sanitizeHtml } from "@/lib/sanitize";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [campaignType, setCampaignType] = React.useState("ONE_TIME");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [useSchedule, setUseSchedule] = React.useState(false);

  const variables = getAvailableVariables();

  React.useEffect(() => {
    fetch("/api/email-templates?limit=100")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []));
  }, []);

  React.useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  }, [selectedTemplateId, templates]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const scheduledAt = useSchedule ? formData.get("scheduledAt") : null;

    const data = {
      name: formData.get("name"),
      type: campaignType,
      templateId: selectedTemplateId || null,
      subject,
      body,
      scheduledAt,
    };

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const campaign = await res.json();
      toast({ title: "Campaign created", variant: "success" });
      router.push(`/campaigns/${campaign.id}`);
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error || "Failed to create campaign",
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  function insertVariable(variable: string) {
    setBody((prev) => prev + variable);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>

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
                  placeholder="e.g., March Newsletter"
                />
              </div>
              <div>
                <Label>Campaign Type</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                    <SelectItem value="DRIP_SEQUENCE">Drip Sequence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <Label>Email Template (optional)</Label>
              <Select
                value={selectedTemplateId || "none"}
                onValueChange={(v) => setSelectedTemplateId(v === "none" ? "" : v)}
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
              <p className="text-xs text-gray-500 mt-1">
                Selecting a template will populate the subject and body below.
                You can still customize them.
              </p>
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
                placeholder="e.g., Hello {{firstName}}, we have updates for you"
              />
            </div>

            {/* Body with tabs */}
            <Tabs defaultValue="edit" className="w-full">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Label>Body (HTML) *</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  placeholder="<p>Dear {{firstName}},</p><p>Thank you for your support...</p>"
                  className="min-h-[300px] font-mono text-sm"
                />
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
              <TabsContent value="variables" className="mt-2">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    Click a variable to insert it into the body:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {variables.map((v) => (
                      <button
                        key={v.variable}
                        type="button"
                        onClick={() => insertVariable(v.variable)}
                        className="flex items-center gap-2 p-2 text-left text-sm bg-white border rounded hover:bg-blue-50 hover:border-blue-300"
                      >
                        <code className="text-blue-600">{v.variable}</code>
                        <span className="text-gray-500 text-xs">
                          {v.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Scheduling (for ONE_TIME only) */}
            {campaignType === "ONE_TIME" && (
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
                      name="scheduledAt"
                      type="datetime-local"
                      required={useSchedule}
                    />
                  </div>
                )}
              </div>
            )}

            {campaignType === "DRIP_SEQUENCE" && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Drip sequence steps can be configured after creating the
                  campaign. Each step can use a different template with a
                  configurable delay.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Campaign"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
