import type { ComponentType } from "react";
import Link from "next/link";

import { cn } from "@nsd/ui/utils";

export type EditorialStatTone =
  | "neutral"
  | "accent"
  | "warning"
  | "success"
  | "pro"
  | "destructive";

const TONE_ICON_CLASS: Record<EditorialStatTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent/15 text-accent",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  pro: "bg-pro/15 text-pro",
  destructive: "bg-destructive/15 text-destructive",
};

const TONE_VALUE_CLASS: Record<EditorialStatTone, string> = {
  neutral: "text-foreground",
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
  pro: "text-pro",
  destructive: "text-destructive",
};

const TONE_BORDER_CLASS: Record<EditorialStatTone, string> = {
  neutral: "border-border",
  accent: "border-accent/20",
  warning: "border-warning/20",
  success: "border-success/20",
  pro: "border-pro/20",
  destructive: "border-destructive/20",
};

type EditorialStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: EditorialStatTone;
  icon?: ComponentType<{ className?: string }>;
  compact?: boolean;
  href?: string;
};

export function EditorialStatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  compact = false,
  href,
}: EditorialStatCardProps) {
  const className = cn(
    "rounded-xl border bg-card",
    compact ? "px-3 py-3" : "p-4",
    TONE_BORDER_CLASS[tone],
    href &&
      "block transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              TONE_ICON_CLASS[tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 font-semibold tabular-nums",
          compact ? "text-xl" : "text-2xl",
          TONE_VALUE_CLASS[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`Buka antrian naskah ${label}`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
