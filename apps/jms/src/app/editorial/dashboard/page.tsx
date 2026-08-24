import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, Newspaper, RotateCcw } from "lucide-react";

import { getTranslations } from "next-intl/server";

import { loadEditorialDashboardData } from "@/application/editorial/load-editorial-dashboard-data";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { editorialQueueHref } from "@/components/editorial/editorial-queue-href";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import {
  EDITORIAL_PIPELINE_LABELS,
  EDITORIAL_PIPELINE_STEP_KEYS,
} from "@/components/editorial/editorial-pipeline-labels";
import { EditorialStatCard } from "@/components/editorial/editorial-stat-card";
import {
  editorialInlineInputClassName,
  editorialInputClassName,
} from "@/components/editorial/styles";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { upsertReviewerProfileFormAction } from "./actions";

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value}%`;
}

function formatDays(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value} hari`;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function EditorialDashboardPage() {
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  const dashboard = await loadEditorialDashboardData({ journalId, actorId });

  if (dashboard.kind === "auth_error") {
    notFound();
  }

  if (dashboard.kind === "stats_error") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard statistik</CardTitle>
            <CardDescription>
              Statistik sementara tidak dapat dimuat. Tenant dan peran valid; coba
              muat ulang atau hubungi operator jika berlanjut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{dashboard.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, reviewerRoles, reviewerProfile } = dashboard;

  const { submissions, reviews, publishing, membership, billing } = stats;
  const showReviewerProfileForm =
    reviewerRoles.includes("REVIEWER") || reviewerRoles.includes("JOURNAL_ADMIN");
  const isJournalAdmin = reviewerRoles.includes("JOURNAL_ADMIN");
  const t = await getTranslations("editorial");
  const overdue = reviews.assignments.overdue;
  const outstanding = billing?.outstandingAmount ?? 0;
  const showAttention = overdue > 0 || outstanding > 0;
  const trendMax = Math.max(...submissions.monthlyTrend.map((row) => row.count), 1);

  const pipeline = EDITORIAL_PIPELINE_STEP_KEYS.map((key) => ({
    key,
    label: EDITORIAL_PIPELINE_LABELS[key],
    value: submissions.pipeline[key],
    href: editorialQueueHref({ pipeline: key }),
  }));

  return (
    <div className="space-y-8">
      <EditorialPageHeader
        title="Dashboard statistik"
        description={`Ringkasan editorial jurnal — diperbarui ${new Date(stats.generatedAt).toLocaleString("id-ID")}`}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EditorialStatCard
          label={t("status.UNDER_REVIEW")}
          value={submissions.byStatus.UNDER_REVIEW}
          tone="accent"
          icon={Eye}
          href={editorialQueueHref({ status: "UNDER_REVIEW" })}
        />
        <EditorialStatCard
          label={t("status.REVISIONS_REQUESTED")}
          value={submissions.byStatus.REVISIONS_REQUESTED}
          tone="warning"
          icon={RotateCcw}
          href={editorialQueueHref({ status: "REVISIONS_REQUESTED" })}
        />
        <EditorialStatCard
          label={t("status.ACCEPTED")}
          value={submissions.byStatus.ACCEPTED}
          tone="success"
          icon={CheckCircle2}
          href={editorialQueueHref({ status: "ACCEPTED" })}
        />
        <EditorialStatCard
          label={t("status.PUBLISHED")}
          value={submissions.byStatus.PUBLISHED}
          tone="pro"
          icon={Newspaper}
          href={editorialQueueHref({ status: "PUBLISHED" })}
        />
      </section>

      {showAttention ? (
        <section className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <div className="flex flex-1 flex-wrap gap-x-6 gap-y-1 text-sm">
            {overdue > 0 ? (
              <p>
                <Link
                  href={editorialQueueHref({ attention: "overdue" })}
                  className="hover:underline"
                >
                  <span className="font-medium text-foreground">{overdue}</span>
                  <span className="text-muted-foreground"> review terlambat</span>
                </Link>
              </p>
            ) : null}
            {outstanding > 0 && billing ? (
              <p>
                <Link
                  href={editorialQueueHref({ pipeline: "accepted" })}
                  className="hover:underline"
                >
                  <span className="font-medium text-foreground">
                    {formatCurrency(outstanding, billing.currency)}
                  </span>
                  <span className="text-muted-foreground"> APC belum dibayar</span>
                </Link>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EditorialStatCard
          label="Total submission"
          value={submissions.total}
          compact
          href={editorialQueueHref()}
        />
        <EditorialStatCard
          label="Tingkat penerimaan"
          value={formatPercent(submissions.acceptanceRatePercent)}
          hint="Accepted vs ditolak (desk + editorial)"
          compact
        />
        <EditorialStatCard
          label="Submission bulan ini"
          value={submissions.submittedThisMonth}
          compact
          href={editorialQueueHref()}
        />
        <EditorialStatCard
          label="Terbit bulan ini"
          value={submissions.publishedThisMonth}
          compact
          href={editorialQueueHref({ status: "PUBLISHED" })}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Pipeline editorial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agregat status submission aktif & terminal. Klik tahap untuk membuka antrian.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {pipeline.map((step, index) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className="block rounded-lg bg-muted/70 px-3 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-xs text-muted-foreground">
                  {index + 1}. {step.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{step.value}</p>
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          Ditolak / ditarik:{" "}
          <Link
            href={editorialQueueHref({ pipeline: "declined" })}
            className="font-medium text-foreground hover:underline"
          >
            {submissions.pipeline.declined}
          </Link>
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Tren submission (6 bulan)</h2>
        <ul className="mt-4 space-y-3">
          {submissions.monthlyTrend.map((row) => (
            <li key={row.month} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{row.month}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max((row.count / trendMax) * 100, row.count > 0 ? 6 : 0)}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">{row.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Penugasan reviewer & median waktu respon.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <EditorialStatCard label="Diundang" value={reviews.assignments.invited} compact />
            <EditorialStatCard label="Diterima" value={reviews.assignments.accepted} compact />
            <EditorialStatCard label="Selesai review" value={reviews.assignments.submitted} compact />
            <EditorialStatCard
              label="Terlambat"
              value={reviews.assignments.overdue}
              tone={overdue > 0 ? "destructive" : "neutral"}
              compact
              href={editorialQueueHref({ attention: "overdue" })}
            />
            <EditorialStatCard
              label="Median turnaround"
              value={formatDays(reviews.medianTurnaroundDays)}
              compact
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Penerbitan & keanggotaan</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <EditorialStatCard
              label="Total issue"
              value={publishing.totalIssues}
              compact
              href="/editorial/issues"
            />
            <EditorialStatCard
              label="Issue terbit"
              value={publishing.publishedIssues}
              compact
              href="/editorial/issues"
            />
            <EditorialStatCard label="Anggota aktif" value={membership.activeMembers} compact />
            <EditorialStatCard label="Reviewer" value={membership.reviewers} compact />
            <EditorialStatCard label="Author" value={membership.authors} compact />
            <EditorialStatCard label="Editor" value={membership.editors} compact />
          </div>
        </section>
      </div>

      {showReviewerProfileForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Profil reviewer</CardTitle>
            <CardDescription>
              Kata kunci keahlian dan batas beban. Perubahan memicu refresh embedding
              untuk saran AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertReviewerProfileFormAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="keywords" className="text-sm font-medium">
                  Kata kunci (pisahkan koma)
                </label>
                <input
                  id="keywords"
                  name="keywords"
                  defaultValue={reviewerProfile?.keywords.join(", ") ?? ""}
                  className={editorialInputClassName}
                  placeholder="machine learning, pendidikan, nlp"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="maxLoad" className="text-sm font-medium">
                  Maks. penugasan aktif
                </label>
                <input
                  id="maxLoad"
                  name="maxLoad"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={reviewerProfile?.maxLoad ?? 3}
                  className={`w-32 ${editorialInlineInputClassName}`}
                />
              </div>
              <Button type="submit">Simpan profil reviewer</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isJournalAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan jurnal</CardTitle>
            <CardDescription>Konfigurasi operasional untuk admin jurnal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/editorial/settings/similarity"
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                Kebijakan similarity
              </Link>
              <Link
                href="/editorial/published"
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                Retraction / correction
              </Link>
              <Link
                href="/editorial/settings/privacy"
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                Privasi & retensi
              </Link>
              <Link
                href="/editorial/settings/email"
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                Pengirim email
              </Link>
              <Link
                href="/editorial/settings/oai"
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                Validasi OAI Garuda
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {billing ? (
        <Card>
          <CardHeader>
            <CardTitle>APC & ledger</CardTitle>
            <CardDescription>Hanya visible untuk Journal Admin.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <EditorialStatCard
              label="Pendapatan dibayar"
              value={formatCurrency(billing.paidRevenue, billing.currency)}
              compact
            />
            <EditorialStatCard
              label="Outstanding (issued)"
              value={formatCurrency(billing.outstandingAmount, billing.currency)}
              compact
            />
            <EditorialStatCard
              label="Saldo ledger"
              value={formatCurrency(billing.ledgerBalance, billing.currency)}
              compact
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
