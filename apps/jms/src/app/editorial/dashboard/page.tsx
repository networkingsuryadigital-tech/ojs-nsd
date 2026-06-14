import Link from "next/link";
import { notFound } from "next/navigation";

import { loadEditorialDashboardData } from "@/application/editorial/load-editorial-dashboard-data";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
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
      <main className="mx-auto max-w-5xl p-8">
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
      </main>
    );
  }

  const { stats, reviewerRoles, reviewerProfile } = dashboard;

  const { submissions, reviews, publishing, membership, billing } = stats;
  const showReviewerProfileForm =
    reviewerRoles.includes("REVIEWER") || reviewerRoles.includes("JOURNAL_ADMIN");
  const isJournalAdmin = reviewerRoles.includes("JOURNAL_ADMIN");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard statistik</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan editorial jurnal — diperbarui{" "}
          {new Date(stats.generatedAt).toLocaleString("id-ID")}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submission" value={submissions.total} />
        <StatCard
          label="Tingkat penerimaan"
          value={formatPercent(submissions.acceptanceRatePercent)}
          hint="Accepted vs ditolak (desk + editorial)"
        />
        <StatCard
          label="Submission bulan ini"
          value={submissions.submittedThisMonth}
        />
        <StatCard
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
          <StatCard label="Intake" value={submissions.pipeline.intake} />
          <StatCard label="Desk review" value={submissions.pipeline.deskReview} />
          <StatCard label="Peer review" value={submissions.pipeline.peerReview} />
          <StatCard label="Diterima / APC" value={submissions.pipeline.accepted} />
          <StatCard label="Produksi" value={submissions.pipeline.production} />
          <StatCard label="Terbit" value={submissions.pipeline.published} />
          <StatCard label="Ditolak / tarik" value={submissions.pipeline.declined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tren submission (6 bulan)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {submissions.monthlyTrend.map((row) => (
              <li key={row.month} className="flex items-center justify-between">
                <span className="text-muted-foreground">{row.month}</span>
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
            <StatCard label="Diundang" value={reviews.assignments.invited} />
            <StatCard label="Diterima" value={reviews.assignments.accepted} />
            <StatCard label="Selesai review" value={reviews.assignments.submitted} />
            <StatCard label="Terlambat" value={reviews.assignments.overdue} />
            <StatCard
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
            <StatCard label="Total issue" value={publishing.totalIssues} />
            <StatCard label="Issue terbit" value={publishing.publishedIssues} />
            <StatCard label="Anggota aktif" value={membership.activeMembers} />
            <StatCard label="Reviewer" value={membership.reviewers} />
            <StatCard label="Author" value={membership.authors} />
            <StatCard label="Editor" value={membership.editors} />
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
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
                  className="w-32 rounded-md border px-3 py-2 text-sm"
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
            <div className="flex flex-col gap-2">
              <Link
                href="/editorial/settings/similarity"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Kebijakan similarity →
              </Link>
              <Link
                href="/editorial/published"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Retraction / correction →
              </Link>
              <Link
                href="/editorial/settings/privacy"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Privasi & retensi →
              </Link>
              <Link
                href="/editorial/settings/email"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Pengirim email →
              </Link>
              <Link
                href="/editorial/settings/oai"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Validasi OAI Garuda →
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
            <StatCard
              label="Pendapatan dibayar"
              value={formatCurrency(billing.paidRevenue, billing.currency)}
            />
            <StatCard
              label="Outstanding (issued)"
              value={formatCurrency(billing.outstandingAmount, billing.currency)}
            />
            <StatCard
              label="Saldo ledger"
              value={formatCurrency(billing.ledgerBalance, billing.currency)}
            />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
