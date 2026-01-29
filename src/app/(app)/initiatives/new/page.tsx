"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Search, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  title?: string;
  organization?: string;
  party?: string;
  district?: string;
}

export default function NewInitiativePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [goalDate, setGoalDate] = React.useState("");

  // Target selection
  const [contactSearch, setContactSearch] = React.useState("");
  const [contactResults, setContactResults] = React.useState<Contact[]>([]);
  const [selectedTargets, setSelectedTargets] = React.useState<Contact[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const debouncedSearch = useDebounce(contactSearch, 300);

  React.useEffect(() => {
    if (debouncedSearch.length < 2) {
      setContactResults([]);
      return;
    }
    setSearchLoading(true);
    // Only search for elected officials and candidates
    fetch(
      `/api/contacts?search=${encodeURIComponent(debouncedSearch)}&limit=10&type=ELECTED_OFFICIAL,CANDIDATE`
    )
      .then((r) => r.json())
      .then((data) => setContactResults(data.contacts || []))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch]);

  function addTarget(contact: Contact) {
    if (!selectedTargets.find((c) => c.id === contact.id)) {
      setSelectedTargets([...selectedTargets, contact]);
    }
    setContactSearch("");
    setContactResults([]);
  }

  function removeTarget(contactId: string) {
    setSelectedTargets(selectedTargets.filter((c) => c.id !== contactId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // First create the initiative
    const initRes = await fetch("/api/initiatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        goalDate: goalDate || null,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json();
      toast({
        title: "Error",
        description: err.error || "Failed to create initiative",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const initiative = await initRes.json();

    // If targets selected, add them
    if (selectedTargets.length > 0) {
      const targetsRes = await fetch(
        `/api/initiatives/${initiative.id}/targets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactIds: selectedTargets.map((c) => c.id),
          }),
        }
      );

      if (!targetsRes.ok) {
        // Initiative created but targets failed - still redirect
        const err = await targetsRes.json();
        toast({
          title: "Warning",
          description: `Initiative created but some targets failed to add: ${err.error}`,
          variant: "destructive",
        });
      }
    }

    toast({ title: "Initiative created", variant: "success" });
    router.push(`/initiatives/${initiative.id}`);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">New Initiative</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                placeholder="e.g., SB 123 Farm Bill Support"
              />
              <p className="text-xs text-gray-500 mt-1">
                A clear name describing this outreach effort
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the goal and context of this initiative..."
              />
            </div>

            <div>
              <Label htmlFor="goalDate">Goal Date</Label>
              <Input
                id="goalDate"
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Target date for completing this outreach (e.g., before a vote)
              </p>
            </div>

            <div>
              <Label>Targets (Elected Officials / Candidates)</Label>
              {selectedTargets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 mt-2">
                  {selectedTargets.map((contact) => (
                    <Badge
                      key={contact.id}
                      variant="secondary"
                      className="gap-1 py-1 px-2"
                    >
                      <span>
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.party && (
                        <span className="text-gray-400">({contact.party})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTarget(contact.id)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search for elected officials or candidates..."
                  className="pl-9"
                />
                {(contactResults.length > 0 || searchLoading) && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
                    {searchLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Searching...
                      </div>
                    ) : (
                      contactResults.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => addTarget(contact)}
                          disabled={selectedTargets.some(
                            (c) => c.id === contact.id
                          )}
                        >
                          <div>
                            <span className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </span>
                            {contact.title && (
                              <span className="text-gray-500 ml-1">
                                - {contact.title}
                              </span>
                            )}
                            <div className="text-xs text-gray-400">
                              {contact.type.replace(/_/g, " ")}
                              {contact.party && ` - ${contact.party}`}
                              {contact.district && ` - ${contact.district}`}
                            </div>
                          </div>
                          {selectedTargets.some(
                            (c) => c.id === contact.id
                          ) && (
                            <span className="text-xs text-green-600">
                              Added
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can add more targets after creating the initiative
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Initiative"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
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
