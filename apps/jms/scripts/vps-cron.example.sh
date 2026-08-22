#!/usr/bin/env bash
# VPS systemd/cron helpers for JMS (replace cPanel/Vercel crons).
# Install as root:
#   install -m 0755 apps/jms/scripts/vps-cron.example.sh /usr/local/bin/jms-cron.sh
#   crontab -u jms -e
#
# Requires CRON_SECRET in /home/jms/.env (or export before calling).

set -euo pipefail
BASE_URL="${JMS_BASE_URL:-https://ejournal.ptnsd.co.id}"
SECRET="${CRON_SECRET:?CRON_SECRET required}"

hit() {
  local path="$1"
  curl -fsS -H "Authorization: Bearer ${SECRET}" "${BASE_URL}${path}" >/dev/null
}

case "${1:-}" in
  journal-domains) hit /api/cron/journal-domains ;;
  review-reminders) hit /api/cron/review-reminders ;;
  doi-deposits) hit /api/cron/doi-deposits ;;
  similarity-checks) hit /api/cron/similarity-checks ;;
  reviewer-embeddings) hit /api/cron/reviewer-embeddings ;;
  side-effect-reconciliation) hit /api/cron/side-effect-reconciliation ;;
  purge-rejected-submissions) hit /api/cron/purge-rejected-submissions ;;
  *)
    echo "Usage: $0 {journal-domains|review-reminders|doi-deposits|similarity-checks|reviewer-embeddings|side-effect-reconciliation|purge-rejected-submissions}"
    exit 1
    ;;
esac
