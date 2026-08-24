import Link from "next/link";

import { editorialQueueHref } from "@/components/editorial/editorial-queue-href";
import { EDITORIAL_PIPELINE_LABELS } from "@/components/editorial/editorial-pipeline-labels";
import type { EditorialPipelineKey } from "@/domain/statistics/types";
import { EDITORIAL_PIPELINE_KEYS } from "@/domain/statistics/types";
import { cn } from "@nsd/ui/utils";

type EditorialQueueFiltersProps = {
  status?: string;
  pipeline?: EditorialPipelineKey;
  overdueOnly: boolean;
};

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-sm transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );
}

export function EditorialQueueFilters({
  status,
  pipeline,
  overdueOnly,
}: EditorialQueueFiltersProps) {
  const allActive = !status && !pipeline && !overdueOnly;

  return (
    <nav aria-label="Filter antrian naskah" className="flex flex-wrap gap-2">
      <Link href={editorialQueueHref()} className={chipClass(allActive)}>
        Semua
      </Link>
      {EDITORIAL_PIPELINE_KEYS.map((key) => (
        <Link
          key={key}
          href={editorialQueueHref({ pipeline: key })}
          className={chipClass(pipeline === key && !overdueOnly)}
        >
          {EDITORIAL_PIPELINE_LABELS[key]}
        </Link>
      ))}
      <Link
        href={editorialQueueHref({ attention: "overdue" })}
        className={chipClass(overdueOnly)}
      >
        Review terlambat
      </Link>
    </nav>
  );
}
