#!/usr/bin/env sh
# Nightly backup of the database and uploads from the running container.
# Example cron: 0 3 * * * /opt/aiclub/deploy/backup.sh /opt/aiclub/backups
set -eu
DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
# VACUUM INTO writes a consistent snapshot even while the app is writing.
docker compose exec -T app rm -f /app/data/backup.db
docker compose exec -T app node --disable-warning=ExperimentalWarning -e "
  new (require('node:sqlite').DatabaseSync)('/app/data/aiclub.db').exec(\"VACUUM INTO '/app/data/backup.db'\");
"
docker compose cp app:/app/data/backup.db "$DEST/aiclub-$STAMP.db"
docker compose exec -T app tar -C /app/data -czf - uploads > "$DEST/uploads-$STAMP.tar.gz"
docker compose exec -T app rm -f /app/data/backup.db
# keep the last 14 backups of each kind
ls -1t "$DEST"/aiclub-*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "$DEST"/uploads-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "Backup written to $DEST"
