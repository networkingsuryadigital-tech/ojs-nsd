#!/usr/bin/env bash
# cPanel Cron Jobs — JMS pilot ejournal.ptnsd.co.id
# Salin tiap baris ke cPanel → Cron Jobs (Common Settings + Command).
# Ganti RAHASIA dengan nilai CRON_SECRET yang SAMA di Vercel Production.
#
# Uji manual:
#   curl -fsS -H "x-cron-secret: RAHASIA" https://ejournal.ptnsd.co.id/api/cron/journal-domains
#
# Panduan lengkap: documentations/15-deploy-dewaweb-guardian.md

BASE="https://ejournal.ptnsd.co.id"
SECRET="RAHASIA"

# 0 * * * *  (tiap jam)
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/doi-deposits"

# */30 * * * *
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/similarity-checks"

# */30 * * * *
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/side-effect-reconciliation"

# 0 1 * * *
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/review-reminders"

# 0 2 * * *
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/reviewer-embeddings"

# 0 3 * * *
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/purge-rejected-submissions"

# */10 * * * *
curl -fsS -H "x-cron-secret: ${SECRET}" "${BASE}/api/cron/journal-domains"
