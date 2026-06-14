import { notFound } from "next/navigation";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { getDeskReviewDetail } from "@/application/review/get-desk-review-detail";
import { previewReviewerCoi } from "@/application/review/preview-reviewer-coi";
import {
  getProductionDetail,
  type ProductionDetail,
} from "@/application/publishing/get-production-detail";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import {
  assignToEditorFormAction,
  deskRejectFormAction,
  inviteReviewerFormAction,
  recordDecisionFormAction,
  sendToReviewFormAction,
  uploadAndResubmitFormAction,
  uploadGalleyFormAction,
  publishSubmissionFormAction,
} from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviewerId?: string }>;
};

const SIMILARITY_STATUS_LABELS: Record<string, string> = {
  NOT_RUN: "Belum dijalankan",
  PENDING: "Sedang diproses",
  COMPLETED: "Selesai",
  FAILED: "Gagal",
};

const SIMILARITY_SEVERITY_LABELS: Record<string, string> = {
  low: "Rendah",
  moderate: "Sedang",
  high: "Tinggi — periksa sebelum peer review",
};

const DECISION_LABELS: Record<string, string> = {
  ACCEPT: "Accept",
  MINOR_REVISION: "Minor revision",
  MAJOR_REVISION: "Major revision",
  REJECT: "Reject",
};

export default async function DeskReviewPage({ params, searchParams }: PageProps) {
  const { id: submissionId } = await params;
  const actorId = await requireAuthenticatedUserId();
  const { reviewerId } = await searchParams;
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  let detail;
  let production: ProductionDetail | null = null;
  let pendingInviteCoi: Awaited<ReturnType<typeof previewReviewerCoi>> | null = null;
  try {
    detail = await getDeskReviewDetail({
      journalId,
      submissionId,
      actorId,
    });
    if (
      detail.status === "IN_PRODUCTION" ||
      detail.status === "PUBLISHED" ||
      detail.actorIsEditor
    ) {
      try {
        production = await getProductionDetail({
          journalId,
          submissionId,
          actorId,
        });
      } catch {
        production = null;
      }
    }
  } catch {
    notFound();
  }

  if (detail.actorIsEditor && reviewerId) {
    try {
      pendingInviteCoi = await previewReviewerCoi({
        journalId,
        submissionId,
        actorId,
        reviewerId,
      });
    } catch {
      pendingInviteCoi = null;
    }
  }

  const canRecordDecision = detail.availableTransitions.includes("recordDecision");
  const auditTrailUrl = `/api/editorial/submissions/${submissionId}/audit-trail`;
  const showProduction = Boolean(
    production &&
      (detail.status === "IN_PRODUCTION" || detail.status === "PUBLISHED"),
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>{detail.title}</CardTitle>
          <CardDescription>
            Status: {detail.status} · Round {detail.reviewRound}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{detail.abstract}</p>
          {detail.actorIsEditor && (
            <div>
              <h2 className="mb-2 font-medium">Authors</h2>
              <ul className="list-disc pl-5 text-sm">
                {detail.authors.map((author) => (
                  <li key={author.fullName}>
                    {author.fullName}
                    {author.affiliation ? ` — ${author.affiliation}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {detail.similarity && (
        <Card>
          <CardHeader>
            <CardTitle>Similarity check</CardTitle>
            <CardDescription>
              Pemeriksaan kemiripan naskah (dipicu saat assign ke desk review).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Status:{" "}
              {SIMILARITY_STATUS_LABELS[detail.similarity.status] ??
                detail.similarity.status}
            </p>
            {detail.similarity.score !== null && (
              <p>
                Skor: {detail.similarity.score}%{" "}
                {detail.similarity.severity
                  ? `(${SIMILARITY_SEVERITY_LABELS[detail.similarity.severity]})`
                  : ""}
              </p>
            )}
            {detail.similarity.reportUrl && (
              <p>
                <a
                  href={detail.similarity.reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Buka laporan
                </a>
              </p>
            )}
            {detail.similarity.status === "PENDING" && (
              <p className="text-muted-foreground">
                Hasil akan muncul setelah cron similarity-checks memproses antrian.
              </p>
            )}
            {detail.similarity.gate && detail.similarity.gate.policy !== "OFF" && (
              <div className="mt-2 rounded-md border p-3 text-sm">
                <p>
                  Kebijakan gate:{" "}
                  {detail.similarity.gate.policy === "BLOCK"
                    ? "Blokir otomatis"
                    : "Peringatan + konfirmasi"}
                  {" · "}
                  Ambang: {detail.similarity.gate.thresholdPercent}%
                </p>
                {detail.similarity.gate.warning && (
                  <p className="mt-1 text-amber-700">{detail.similarity.gate.warning}</p>
                )}
                {detail.similarity.gate.blocked && detail.similarity.gate.reason && (
                  <p className="mt-1 text-destructive">{detail.similarity.gate.reason}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {detail.decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Editorial decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {detail.decisions.map((decision) => (
                <li key={decision.id}>
                  Round {decision.round}:{" "}
                  {DECISION_LABELS[decision.decision] ?? decision.decision}
                  {decision.note ? ` — ${decision.note}` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {detail.revisionFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revision files</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {detail.revisionFiles.map((file) => (
                <li key={file.id}>
                  Round {file.round}: {file.originalName}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {detail.reviewerSuggestions && detail.reviewerSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saran reviewer (AI)</CardTitle>
            <CardDescription>
              Pencocokan kata kunci + embedding semantik. Editor tetap memutuskan
              undangan.
              {detail.reviewerMatchingProvider
                ? ` Provider: ${detail.reviewerMatchingProvider}.`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {detail.reviewerSuggestions.map((suggestion) => (
                <li
                  key={suggestion.userId}
                  className="rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {suggestion.name ?? suggestion.email}
                      </p>
                      {suggestion.affiliation && (
                        <p className="text-muted-foreground">
                          {suggestion.affiliation}
                        </p>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      Skor: {Math.round(suggestion.combinedScore * 100)}%
                    </p>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Kata kunci: {Math.round(suggestion.keywordScore * 100)}%
                    {suggestion.embeddingScore !== null
                      ? ` · Embedding: ${Math.round(suggestion.embeddingScore * 100)}%`
                      : ""}
                    {suggestion.embeddingStale ? " · Embedding: perlu refresh" : ""}
                    {" · "}Beban: {suggestion.activeLoad}/{suggestion.maxLoad}
                  </p>
                  {suggestion.keywords.length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      Keahlian: {suggestion.keywords.join(", ")}
                    </p>
                  )}
                  {suggestion.coiWarnings.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-amber-700">
                      {suggestion.coiWarnings.map((warning) => (
                        <li key={warning.code}>{warning.message}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2">
                    <a
                      href={`?reviewerId=${encodeURIComponent(suggestion.userId)}`}
                      className="text-primary underline"
                    >
                      Pilih untuk undang
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {detail.actorIsEditor && (
        <Card>
          <CardHeader>
            <CardTitle>Editor actions</CardTitle>
            <CardDescription>
              <a href={auditTrailUrl} className="text-primary underline">
                Unduh jejak audit (JSON)
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {detail.availableTransitions.includes("assignToEditor") && (
                <form action={assignToEditorFormAction}>
                  <input type="hidden" name="submissionId" value={submissionId} />
                  <Button type="submit">Assign to desk review</Button>
                </form>
              )}
              {detail.availableTransitions.includes("sendToReview") && (
                <form action={sendToReviewFormAction} className="space-y-2">
                  <input type="hidden" name="submissionId" value={submissionId} />
                  {detail.similarity?.gate?.requiresAcknowledgment && (
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="acknowledgeHighSimilarity"
                        value="1"
                        required
                        className="mt-1"
                      />
                      <span>
                        Saya telah meninjau laporan similarity dan memahami risiko
                        mengirim naskah ke peer review.
                      </span>
                    </label>
                  )}
                  <Button
                    type="submit"
                    disabled={detail.similarity?.gate?.blocked === true}
                  >
                    {detail.status === "RESUBMITTED"
                      ? "Send to peer review (new round)"
                      : "Send to peer review"}
                  </Button>
                </form>
              )}
              {detail.availableTransitions.includes("deskReject") && (
                <form action={deskRejectFormAction}>
                  <input type="hidden" name="submissionId" value={submissionId} />
                  <Button type="submit" variant="outline">
                    Desk reject
                  </Button>
                </form>
              )}
              {detail.availableTransitions.includes("inviteReviewer") &&
                reviewerId && (
                  <div className="w-full space-y-2">
                    {pendingInviteCoi && (
                      <div className="rounded-md border p-3 text-sm">
                        <p className="font-medium">
                          COI check:{" "}
                          {pendingInviteCoi.reviewerName ?? pendingInviteCoi.reviewerId}
                        </p>
                        {pendingInviteCoi.coiWarnings.length > 0 ? (
                          <ul className="mt-2 list-disc pl-5 text-amber-700">
                            {pendingInviteCoi.coiWarnings.map((warning) => (
                              <li key={warning.code}>{warning.message}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-muted-foreground">
                            Tidak ada sinyal konflik kepentingan terdeteksi.
                          </p>
                        )}
                      </div>
                    )}
                    <form action={inviteReviewerFormAction}>
                      <input type="hidden" name="submissionId" value={submissionId} />
                      <input type="hidden" name="reviewerId" value={reviewerId} />
                      <Button type="submit">Invite reviewer</Button>
                    </form>
                  </div>
                )}
            </div>

            {canRecordDecision && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium">Record decision</h3>
                <form action={recordDecisionFormAction} className="space-y-2">
                  <input type="hidden" name="submissionId" value={submissionId} />
                  <textarea
                    name="note"
                    placeholder="Catatan keputusan (opsional)"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "ACCEPT",
                        "MINOR_REVISION",
                        "MAJOR_REVISION",
                        "REJECT",
                      ] as const
                    ).map((decision) => (
                      <Button
                        key={decision}
                        type="submit"
                        name="decision"
                        value={decision}
                        variant={
                          decision === "REJECT" ? "outline" : "default"
                        }
                      >
                        {DECISION_LABELS[decision]}
                      </Button>
                    ))}
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {detail.actorIsAuthor && detail.status === "REVISIONS_REQUESTED" && (
        <Card>
          <CardHeader>
            <CardTitle>Author revision</CardTitle>
            <CardDescription>
              Unggah naskah revisi untuk round {detail.pendingRevisionRound ?? "—"},
              lalu resubmit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadAndResubmitFormAction} className="space-y-3">
              <input type="hidden" name="submissionId" value={submissionId} />
              <input
                type="file"
                name="revisionFile"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                className="block w-full text-sm"
              />
              <Button type="submit">Upload revision &amp; resubmit</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showProduction && production && (
        <Card>
          <CardHeader>
            <CardTitle>Production &amp; publish</CardTitle>
            <CardDescription>
              Unggah galley (PDF/HTML/XML) lalu terbitkan ke issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {production.galleys.length > 0 && (
              <ul className="space-y-1 text-sm">
                {production.galleys.map((galley) => (
                  <li key={galley.id}>
                    {galley.label} · {galley.mimeType}
                  </li>
                ))}
              </ul>
            )}

            {production.actorCanUploadGalley && (
              <form action={uploadGalleyFormAction} className="space-y-3 border-t pt-4">
                <input type="hidden" name="submissionId" value={submissionId} />
                <label className="block text-sm">
                  Galley label
                  <select
                    name="label"
                    defaultValue="PDF"
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {production.galleyLabels.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  type="file"
                  name="galleyFile"
                  accept=".pdf,.html,.xml,application/pdf,text/html,application/xml,text/xml"
                  required
                  className="block w-full text-sm"
                />
                <Button type="submit">Upload galley</Button>
              </form>
            )}

            {production.actorCanPublish && production.issues.length > 0 && (
              <form action={publishSubmissionFormAction} className="space-y-3 border-t pt-4">
                <input type="hidden" name="submissionId" value={submissionId} />
                <label className="block text-sm">
                  Target issue
                  <select
                    name="issueId"
                    defaultValue={production.publishIssueId ?? production.issues[0]?.id}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                    required
                  >
                    {production.issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {issue.citation}
                        {issue.isPublished ? " (published)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit">Publish to issue</Button>
              </form>
            )}

            {detail.status === "PUBLISHED" && (
              <p className="text-sm text-muted-foreground">
                Artikel sudah terbit.
                {production.publishIssueId
                  ? ` Issue: ${production.issues.find((i) => i.id === production.publishIssueId)?.citation ?? production.publishIssueId}`
                  : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {detail.assignments.length > 0 && detail.actorIsEditor && (
        <Card>
          <CardHeader>
            <CardTitle>Review assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {detail.assignments.map((assignment) => (
                <li key={assignment.id}>
                  Round {assignment.round}: {assignment.anonymousLabel ?? "—"} ·{" "}
                  {assignment.status}
                  {assignment.reviewerName ? ` (${assignment.reviewerName})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
