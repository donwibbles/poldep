"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { importRowSchema } from "@/lib/validations/import";

const CRM_FIELDS = [
  { key: "type", label: "Type", required: true },
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "title", label: "Title", required: false },
  { key: "organization", label: "Organization", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "address", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "Zip", required: false },
  { key: "district", label: "District", required: false },
  { key: "party", label: "Party", required: false },
  { key: "website", label: "Website", required: false },
  { key: "twitter", label: "Twitter", required: false },
  { key: "facebook", label: "Facebook", required: false },
  { key: "instagram", label: "Instagram", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "notes", label: "Notes", required: false },
];

const CONTACT_TYPES = ["CANDIDATE", "ELECTED_OFFICIAL", "STAFF", "ORGANIZATION"];

type Step = "upload" | "map" | "preview" | "execute";

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("upload");
  const [csvData, setCsvData] = React.useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = React.useState<string[]>([]);
  const [columnMap, setColumnMap] = React.useState<Record<string, string>>({});
  const [typeOverride, setTypeOverride] = React.useState<string>("");
  const [previewRows, setPreviewRows] = React.useState<{ data: any; errors: string[] }[]>([]);
  const [validCount, setValidCount] = React.useState(0);
  const [errorCount, setErrorCount] = React.useState(0);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<{ created: number; skipped: number; errors: { row: number; errors: string[] }[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as Record<string, string>[];
        const cols = results.meta.fields || [];
        setCsvData(data);
        setCsvColumns(cols);

        // Auto-map matching columns
        const autoMap: Record<string, string> = {};
        for (const field of CRM_FIELDS) {
          const match = cols.find(
            (c) => c.toLowerCase().replace(/[\s_-]/g, "") === field.key.toLowerCase()
          );
          if (match) autoMap[field.key] = match;
        }
        setColumnMap(autoMap);
        setStep("map");
      },
    });
  }

  function handleMapChange(crmField: string, csvCol: string) {
    setColumnMap((prev) => {
      const next = { ...prev };
      if (csvCol === "__skip__") {
        delete next[crmField];
      } else {
        next[crmField] = csvCol;
      }
      return next;
    });
  }

  function buildRow(rawRow: Record<string, string>): any {
    const row: any = {};
    for (const field of CRM_FIELDS) {
      const csvCol = columnMap[field.key];
      if (!csvCol) continue;
      let val = rawRow[csvCol]?.trim() || null;
      if (field.key === "tags" && val) {
        row.tags = val.split(",").map((t: string) => t.trim()).filter(Boolean);
      } else {
        row[field.key] = val;
      }
    }
    if (typeOverride && typeOverride !== "__none__") {
      row.type = typeOverride;
    }
    // Convert empty strings to null for optional fields
    for (const field of CRM_FIELDS) {
      if (!field.required && row[field.key] === "") {
        row[field.key] = null;
      }
    }
    return row;
  }

  function handlePreview() {
    const preview: { data: any; errors: string[] }[] = [];
    let valid = 0;
    let invalid = 0;

    const rowsToCheck = csvData.slice(0, 20);
    for (const raw of rowsToCheck) {
      const mapped = buildRow(raw);
      const parsed = importRowSchema.safeParse(mapped);
      if (parsed.success) {
        preview.push({ data: parsed.data, errors: [] });
        valid++;
      } else {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        const messages = Object.entries(fieldErrors)
          .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
          .slice(0, 3);
        preview.push({ data: mapped, errors: messages });
        invalid++;
      }
    }

    // Count all rows
    let totalValid = 0;
    let totalInvalid = 0;
    for (const raw of csvData) {
      const mapped = buildRow(raw);
      const parsed = importRowSchema.safeParse(mapped);
      if (parsed.success) totalValid++;
      else totalInvalid++;
    }

    setPreviewRows(preview);
    setValidCount(totalValid);
    setErrorCount(totalInvalid);
    setStep("preview");
  }

  async function handleImport() {
    setImporting(true);
    setProgress(0);

    // Build all valid rows
    const allValid: any[] = [];
    for (const raw of csvData) {
      const mapped = buildRow(raw);
      const parsed = importRowSchema.safeParse(mapped);
      if (parsed.success) allValid.push(parsed.data);
    }

    const batchSize = 500;
    let totalCreated = 0;
    let totalSkipped = 0;
    const allErrors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < allValid.length; i += batchSize) {
      const batch = allValid.slice(i, i + batchSize);
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: batch }),
      });
      if (res.ok) {
        const data = await res.json();
        totalCreated += data.created;
        totalSkipped += data.skipped;
        allErrors.push(...data.errors.map((e: any) => ({ ...e, row: e.row + i })));
      }
      setProgress(Math.min(100, Math.round(((i + batch.length) / allValid.length) * 100)));
    }

    setResult({ created: totalCreated, skipped: totalSkipped, errors: allErrors });
    setStep("execute");
    setImporting(false);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Import Contacts</h1>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-6">
        {(["upload", "map", "preview", "execute"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              step === s ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            <span>{i + 1}.</span> {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader><CardTitle>Upload CSV File</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <Upload className="h-12 w-12 text-gray-300" />
              <p className="text-sm text-gray-500">Select a .csv file to import contacts</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Columns */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <p className="text-sm text-gray-500">{csvData.length} rows detected with {csvColumns.length} columns</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Set all type to (optional override):</Label>
              <Select value={typeOverride} onValueChange={setTypeOverride}>
                <SelectTrigger className="w-60 mt-1">
                  <SelectValue placeholder="Use CSV column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Use CSV column</SelectItem>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {CRM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <Select
                    value={columnMap[field.key] || "__skip__"}
                    onValueChange={(v) => handleMapChange(field.key, v)}
                  >
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Skip —</SelectItem>
                      {csvColumns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handlePreview}>Preview</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <div className="flex gap-3 mt-2">
              <Badge variant="success">{validCount} valid</Badge>
              {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewRows.map((row, i) => (
                    <tr key={i} className={row.errors.length > 0 ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-3 py-2">{row.data.firstName} {row.data.lastName}</td>
                      <td className="px-3 py-2">{row.data.type || "—"}</td>
                      <td className="px-3 py-2">{row.data.email || "—"}</td>
                      <td className="px-3 py-2 text-red-600 text-xs">
                        {row.errors.join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.length > 20 && (
              <p className="text-xs text-gray-400 mt-2">Showing first 20 of {csvData.length} rows</p>
            )}

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleImport} disabled={validCount === 0 || importing}>
                {importing ? "Importing..." : `Import ${validCount} Contacts`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Execute / Results */}
      {step === "execute" && (
        <Card>
          <CardHeader><CardTitle>Import Complete</CardTitle></CardHeader>
          <CardContent>
            {importing ? (
              <div className="py-8">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">{progress}%</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg flex-1">
                    <p className="text-2xl font-bold text-green-700">{result.created}</p>
                    <p className="text-sm text-green-600">Created</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg flex-1">
                    <p className="text-2xl font-bold text-gray-700">{result.skipped}</p>
                    <p className="text-sm text-gray-600">Skipped</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg flex-1">
                    <p className="text-2xl font-bold text-red-700">{errorCount}</p>
                    <p className="text-sm text-red-600">Errors</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Server-side errors:</p>
                    <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>Row {e.row + 1}: {e.errors.join(", ")}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={() => router.push("/contacts")}>Back to Contacts</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
