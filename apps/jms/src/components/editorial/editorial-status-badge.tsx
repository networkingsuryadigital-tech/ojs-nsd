import { cn } from "@nsd/ui/utils";

const STATUS_TONE_CLASS: Record<string, string> = {
  DRAFT: "bg-foreground/10 text-foreground/70",
  SUBMITTED: "bg-foreground/10 text-foreground/70",
  WITHDRAWN: "bg-foreground/10 text-foreground/70",
  DESK_REVIEW: "bg-accent/15 text-accent",
  UNDER_REVIEW: "bg-accent/15 text-accent",
  RESUBMITTED: "bg-accent/15 text-accent",
  REVISIONS_REQUESTED: "bg-warning/15 text-warning",
  ACCEPTED: "bg-success/15 text-success",
  PAYMENT_PENDING: "bg-success/15 text-success",
  IN_PRODUCTION: "bg-success/15 text-success",
  PUBLISHED: "bg-pro/15 text-pro",
  REJECTED: "bg-destructive/15 text-destructive",
  DESK_REJECTED: "bg-destructive/15 text-destructive",
  RETRACTED: "bg-destructive/15 text-destructive",
};

type EditorialStatusBadgeProps = {
  status: string;
  label?: string;
};

export function EditorialStatusBadge({
  status,
  label,
}: EditorialStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_TONE_CLASS[status] ?? "bg-foreground/10 text-foreground/70",
      )}
    >
      {label ?? status}
    </span>
  );
}
