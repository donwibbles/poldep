"use client";

import * as React from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  organization?: string | null;
}

interface ContactPickerProps {
  selected: Contact[];
  onChange: (contacts: Contact[]) => void;
  multiple?: boolean;
}

export function ContactPicker({ selected, onChange, multiple = true }: ContactPickerProps) {
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<Contact[]>([]);
  const [open, setOpen] = React.useState(false);
  const debouncedSearch = useDebounce(search);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([]);
      return;
    }
    fetch(`/api/contacts?search=${encodeURIComponent(debouncedSearch)}&limit=10`)
      .then((r) => r.json())
      .then((data) => setResults(data.contacts || []));
  }, [debouncedSearch]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addContact(contact: Contact) {
    if (multiple) {
      if (!selected.find((c) => c.id === contact.id)) {
        onChange([...selected, contact]);
      }
    } else {
      onChange([contact]);
    }
    setSearch("");
    setResults([]);
    setOpen(false);
  }

  function removeContact(id: string) {
    onChange(selected.filter((c) => c.id !== id));
  }

  return (
    <div ref={ref} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1">
              {c.firstName} {c.lastName}
              <button type="button" onClick={() => removeContact(c.id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search contacts..."
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-auto">
          {results
            .filter((c) => !selected.find((s) => s.id === c.id))
            .map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => addContact(c)}
              >
                {c.firstName} {c.lastName}
                {c.organization ? ` (${c.organization})` : ""}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
