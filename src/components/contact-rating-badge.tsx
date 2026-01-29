"use client";

import { Badge } from "@/components/ui/badge";

const RATING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BRONZE: { bg: "#CD7F3220", text: "#CD7F32", border: "#CD7F32" },
  SILVER: { bg: "#C0C0C020", text: "#808080", border: "#C0C0C0" },
  GOLD: { bg: "#FFD70020", text: "#B8860B", border: "#FFD700" },
  PLATINUM: { bg: "#E5E4E220", text: "#555555", border: "#E5E4E2" },
};

const RATING_LABELS: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

interface ContactRatingBadgeProps {
  rating: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ContactRatingBadge({
  rating,
  size = "sm",
  showLabel = true,
}: ContactRatingBadgeProps) {
  const colors = RATING_COLORS[rating] || RATING_COLORS.BRONZE;
  const label = RATING_LABELS[rating] || rating;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      className={`border ${sizeClasses[size]}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {showLabel ? label : rating.charAt(0)}
    </Badge>
  );
}

export function getRatingLabel(rating: string): string {
  return RATING_LABELS[rating] || rating;
}
