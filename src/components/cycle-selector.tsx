"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CycleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  cycles: string[];
  className?: string;
}

export function CycleSelector({
  value,
  onChange,
  cycles,
  className,
}: CycleSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || "w-[120px]"}>
        <SelectValue placeholder="Cycle" />
      </SelectTrigger>
      <SelectContent>
        {cycles.map((cycle) => (
          <SelectItem key={cycle} value={cycle}>
            {cycle} Cycle
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
