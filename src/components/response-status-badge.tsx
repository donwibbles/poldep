"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "destructive" | "secondary" | "warning" }> = {
  AWAITING: { label: "Awaiting", variant: "warning" },
  RESPONDED: { label: "Responded", variant: "success" },
  NO_RESPONSE: { label: "No Response", variant: "destructive" },
  NOT_APPLICABLE: { label: "N/A", variant: "secondary" },
};

interface ResponseStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function ResponseStatusBadge({ status, size = "sm" }: ResponseStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NOT_APPLICABLE;

  return (
    <Badge
      variant={config.variant}
      className={size === "sm" ? "text-xs" : "text-sm"}
    >
      {config.label}
    </Badge>
  );
}
