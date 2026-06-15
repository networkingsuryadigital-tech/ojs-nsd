import Link from "next/link";
import { notFound } from "next/navigation";

import { loadEditorialDashboardData } from "@/application/editorial/load-editorial-dashboard-data";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
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

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        title="Dashboard statistik"
        description={`Ringkasan editorial jurnal — diperbarui ${new Date(stats.generatedAt).toLocaleString("id-ID")}`}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EditorialStatCard label="Total submission" value={submissions.total} />
        <EditorialStatCard
          label="Tingkat penerimaan"
          value={formatPercent(submissions.acceptanceRatePercent)}
          hint="Accepted vs ditolak (desk + editorial)"
        />
        <EditorialStatCard
          label="Submission bulan ini"
          value={submissions.submittedThisMonth}
        />
        <EditorialStatCard
          label="Terbit bulan ini"
          value={submissions.publishedThisMonth}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline editorial</CardTitle>
          <CardDescription>Agregat status submission aktif & terminal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EditorialStatCard label="Intake" value={submissions.pipeline.intake} />
          <EditorialStatCard label="Desk review" value={submissions.pipeline.deskReview} />
          <EditorialStatCard label="Peer review" value={submissions.pipeline.peerReview} />
          <EditorialStatCard label="Diterima / APC" value={submissions.pipeline.accepted} />
          <EditorialStatCard label="Produksi" value={submissions.pipeline.production} />
          <EditorialStatCard label="Terbit" value={submissions.pipeline.published} />
          <EditorialStatCard label="Ditolak / tarik" value={submissions.pipeline.declined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tren submission (6 bulan)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {submissions.monthlyTrend.map((row) => (
              <li key={row.month} className="flex items-center justify-between border-b border-foreground/5 pb-2 last:border-0">
                <span className="text-foreground/60">{row.month}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Penugasan reviewer & median waktu respon.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <EditorialStatCard label="Diundang" value={reviews.assignments.invited} />
            <EditorialStatCard label="Diterima" value={reviews.assignments.accepted} />
            <EditorialStatCard label="Selesai review" value={reviews.assignments.submitted} />
            <EditorialStatCard label="Terlambat" value={reviews.assignments.overdue} />
            <EditorialStatCard
              label="Median turnaround"
              value={formatDays(reviews.medianTurnaroundDays)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Penerbitan & keanggotaan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <EditorialStatCard label="Total issue" value={publishing.totalIssues} />
            <EditorialStatCard label="Issue terbit" value={publishing.publishedIssues} />
            <EditorialStatCard label="Anggota aktif" value={membership.activeMembers} />
            <EditorialStatCard label="Reviewer" value={membership.reviewers} />
            <EditorialStatCard label="Author" value={membership.authors} />
            <EditorialStatCard label="Editor" value={membership.editors} />
          </CardContent>
        </Card>
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
                className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-[var(--journal-primary)] hover:text-[var(--journal-primary)]"
              >
                Kebijakan similarity
              </Link>
              <Link
                href="/editorial/published"
                className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-[var(--journal-primary)] hover:text-[var(--journal-primary)]"
              >
                Retraction / correction
              </Link>
              <Link
                href="/editorial/settings/privacy"
                className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-[var(--journal-primary)] hover:text-[var(--journal-primary)]"
              >
                Privasi & retensi
              </Link>
              <Link
                href="/editorial/settings/email"
                className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-[var(--journal-primary)] hover:text-[var(--journal-primary)]"
              >
                Pengirim email
              </Link>
              <Link
                href="/editorial/settings/oai"
                className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-[var(--journal-primary)] hover:text-[var(--journal-primary)]"
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
            />
            <EditorialStatCard
              label="Outstanding (issued)"
              value={formatCurrency(billing.outstandingAmount, billing.currency)}
            />
            <EditorialStatCard
              label="Saldo ledger"
              value={formatCurrency(billing.ledgerBalance, billing.currency)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
