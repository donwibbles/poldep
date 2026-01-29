"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Question {
  id?: string;
  text: string;
  type: "TEXT" | "TEXTAREA" | "SINGLE_CHOICE" | "MULTI_CHOICE";
  options: string[];
  required: boolean;
  order: number;
}

interface Questionnaire {
  id: string;
  name: string;
  isActive: boolean;
  stageId: string | null;
  stage: { id: string; name: string } | null;
  questions: Question[];
}

interface PipelineStage {
  id: string;
  name: string;
}

const QUESTION_TYPES = [
  { value: "TEXT", label: "Short Text" },
  { value: "TEXTAREA", label: "Long Text" },
  { value: "SINGLE_CHOICE", label: "Single Choice" },
  { value: "MULTI_CHOICE", label: "Multiple Choice" },
];

export default function EditQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [stages, setStages] = React.useState<PipelineStage[]>([]);

  const [name, setName] = React.useState("");
  const [stageId, setStageId] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [questions, setQuestions] = React.useState<Question[]>([]);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/questionnaires/${params.id}`).then((r) => r.json()),
      fetch("/api/pipeline-stages").then((r) => r.json()),
    ]).then(([data, stagesData]) => {
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        router.push("/settings/questionnaires");
        return;
      }
      setName(data.name);
      setStageId(data.stageId || "");
      setIsActive(data.isActive);
      setQuestions(data.questions || []);
      setStages(stagesData.stages || []);
      setLoading(false);
    });
  }, [params.id, router, toast]);

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        text: "",
        type: "TEXT",
        options: [],
        required: false,
        order: questions.length,
      },
    ]);
  }

  function updateQuestion(index: number, updates: Partial<Question>) {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  }

  function removeQuestion(index: number) {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
  }

  function addOption(questionIndex: number) {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = [
      ...newQuestions[questionIndex].options,
      "",
    ];
    setQuestions(newQuestions);
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setQuestions(newQuestions);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        toast({ title: `Question ${i + 1} text is required`, variant: "destructive" });
        return;
      }
      if (
        (questions[i].type === "SINGLE_CHOICE" || questions[i].type === "MULTI_CHOICE") &&
        questions[i].options.filter((o) => o.trim()).length < 2
      ) {
        toast({
          title: `Question ${i + 1} needs at least 2 options`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    const res = await fetch(`/api/questionnaires/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        stageId: stageId || null,
        isActive,
        questions: questions.map((q, i) => ({
          text: q.text.trim(),
          type: q.type,
          options: q.options.filter((o) => o.trim()),
          required: q.required,
          order: i,
        })),
      }),
    });

    if (res.ok) {
      toast({ title: "Questionnaire saved", variant: "success" });
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings/questionnaires">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Edit Questionnaire</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Questionnaire name"
            />
          </div>
          <div>
            <Label>Auto-request on Stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No auto-request</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Questions</h2>
        <Button onClick={addQuestion} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No questions yet. Add questions to build your questionnaire.
          </p>
        ) : (
          questions.map((question, qIndex) => (
            <Card key={qIndex}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="pt-2 text-gray-400">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label>Question {qIndex + 1} *</Label>
                        <Textarea
                          value={question.text}
                          onChange={(e) =>
                            updateQuestion(qIndex, { text: e.target.value })
                          }
                          placeholder="Enter your question"
                          rows={2}
                        />
                      </div>
                      <div className="w-40">
                        <Label>Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(v: Question["type"]) =>
                            updateQuestion(qIndex, { type: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(question.type === "SINGLE_CHOICE" ||
                      question.type === "MULTI_CHOICE") && (
                      <div className="pl-4 border-l-2 border-gray-200">
                        <Label className="text-xs text-gray-500">Options</Label>
                        <div className="space-y-2 mt-1">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) =>
                                  updateOption(qIndex, oIndex, e.target.value)
                                }
                                placeholder={`Option ${oIndex + 1}`}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-gray-400" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(qIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={question.required}
                          onCheckedChange={(v) =>
                            updateQuestion(qIndex, { required: v })
                          }
                        />
                        <Label className="text-sm">Required</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {questions.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
