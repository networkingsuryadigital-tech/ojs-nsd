import type { ComponentType } from "react";

import { cn } from "@nsd/ui/utils";

export type EditorialStatTone =
  | "neutral"
  | "accent"
  | "warning"
  | "success"
  | "pro"
  | "destructive";

const TONE_ICON_CLASS: Record<EditorialStatTone, string> = {
  neutral: "bg-foreground/5 text-foreground/60",
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

type EditorialStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: EditorialStatTone;
  icon?: ComponentType<{ className?: string }>;
};

export function EditorialStatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: EditorialStatCardProps) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-foreground/60">{label}</p>
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
          "mt-1 text-2xl font-semibold tabular-nums",
          TONE_VALUE_CLASS[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-foreground/50">{hint}</p> : null}
    </div>
  );
}
