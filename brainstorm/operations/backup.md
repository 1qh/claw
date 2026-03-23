# Backup & Disaster Recovery

## With TigerFS

All data lives in TimescaleDB via [TigerFS](../architecture/data.md). Backup is now a database problem, not a filesystem problem.

### Version History (Built-in)

TigerFS `.history/` gives timestamped snapshots of every file change, with stable UUIDs that track renames:

```bash
ls /mnt/tigerfs/users/alice@co.com/.history/USER.md/          # all versions
cat /mnt/tigerfs/users/alice@co.com/.history/USER.md/2026-03-23T150000Z  # specific version
```

Restore any file to any point in time:
```bash
cat /mnt/tigerfs/users/alice@co.com/.history/USER.md/[timestamp] > /mnt/tigerfs/users/alice@co.com/USER.md
```

No git repos. No daily cron. No GitHub rate limits. Built-in.

### Disaster Recovery

`pg_dump` — one command backs up everything for all users:

```bash
pg_dump $DATABASE_URL > backup.sql
```

Recovery:
```bash
psql $DATABASE_URL < backup.sql
# remount TigerFS — all workspaces restored
```

### Backup Schedule

| Strategy | How |
|---|---|
| Continuous versioning | TigerFS `.history/` — automatic, per-file |
| Full database backup | `pg_dump` on schedule (daily or hourly) |
| Point-in-time recovery | TimescaleDB continuous archiving (WAL) if needed |

### What Changed

| Before (git-based) | After (TigerFS) |
|---|---|
| 1 GitHub repo per user | One database |
| Daily git push cron | Built-in `.history/` |
| GitHub rate limits at scale | No limits |
| Restore = `git clone` | Restore = `pg_dump` / `.history/` |
| Max 24h data loss | Continuous versioning, zero data loss |
| Separate backup infra | Same system that serves the data |
