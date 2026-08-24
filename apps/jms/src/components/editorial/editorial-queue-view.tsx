import Link from "next/link";

import { EditorialQueueFilters } from "@/components/editorial/editorial-queue-filters";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { EDITORIAL_PIPELINE_LABELS } from "@/components/editorial/editorial-pipeline-labels";
import { EditorialStatusBadge } from "@/components/editorial/editorial-status-badge";
import type { EditorialQueueResult } from "@/application/editorial/list-editorial-queue";

type EditorialQueueViewProps = {
  queue: EditorialQueueResult;
  statusLabel: (status: string) => string;
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filterDescription(
  queue: EditorialQueueResult,
  statusLabel: (status: string) => string,
): string {
  if (queue.overdueOnly) {
    return "Naskah dengan penugasan review berstatus terlambat.";
  }
  if (queue.status) {
    return `Filter status: ${statusLabel(queue.status)}.`;
  }
  if (queue.pipeline) {
    return `Tahap pipeline: ${EDITORIAL_PIPELINE_LABELS[queue.pipeline]}.`;
  }
  return "Semua naskah jurnal ini, terbaru di atas.";
}

export function EditorialQueueView({
  queue,
  statusLabel,
}: EditorialQueueViewProps) {
  return (
    <div className="space-y-6">
      <EditorialPageHeader
        title="Antrian naskah"
        description={filterDescription(queue, statusLabel)}
      />

      <EditorialQueueFilters
        status={queue.status}
        pipeline={queue.pipeline}
        overdueOnly={queue.overdueOnly}
      />

      {queue.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Tidak ada naskah pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {queue.items.map((item) => (
            <li key={item.id} className="p-4">
              <Link
                href={`/editorial/submissions/${item.id}`}
                className="font-medium hover:underline"
              >
                {item.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <EditorialStatusBadge
                  status={item.status}
                  label={statusLabel(item.status)}
                />
                {item.sectionTitle ? <span>{item.sectionTitle}</span> : null}
                {item.correspondingAuthorName ? (
                  <span>{item.correspondingAuthorName}</span>
                ) : null}
                {item.reviewRound > 0 ? (
                  <span>Putaran {item.reviewRound}</span>
                ) : null}
                {item.overdueAssignmentCount > 0 ? (
                  <span className="text-warning">
                    {item.overdueAssignmentCount} review terlambat
                  </span>
                ) : null}
                <span>Diperbarui {formatDate(item.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {queue.hasMore ? (
        <p className="text-sm text-muted-foreground">
          Menampilkan 50 naskah terbaru. Sempitkan filter untuk melihat yang lain.
        </p>
      ) : null}
    </div>
  );
}
