# Maintenance

## OpenClaw Updates

OpenClaw is actively developed with frequent releases. Gateways stay updated via graceful rolling restarts:

1. System cron checks for new version daily
2. New version → download
3. Wait for low-traffic window (e.g., 3am deployer timezone)
4. For each gateway: wait for active task to finish → restart with new version
5. Long-running task → let it complete, restart after

Gateway restart takes ~1-2s. Users won’t notice.

## Framework Updates

The framework itself is an npm package. Deployer updates the control plane like any dependency — pin version, test, deploy.

## Workspace Cleanup

OpenClaw has built-in [session maintenance](https://docs.openclaw.ai/concepts/session):

```json5
{
  session: {
    maintenance: {
      mode: 'enforce',
      pruneAfter: '30d',
      maxEntries: 500,
      rotateBytes: '10mb'
    }
  }
}
```

This goes in the shared config — applies to all gateways automatically. Old sessions pruned, large transcripts rotated.

For uploaded files — `AGENTS.md` instructs the agent to clean up old uploads after tasks complete. The agent manages its own workspace.

## Host Maintenance

Standard Linux ops — nothing framework-specific:

| Task                        | How                                                   |
| --------------------------- | ----------------------------------------------------- |
| OS security patches         | `unattended-upgrades`                                 |
| Log rotation                | `logrotate`                                           |
| Disk monitoring             | Alerting via process manager                          |
| TimescaleDB maintenance     | Built-in `VACUUM`, retention policies for cache table |
| TigerFS `.history/` cleanup | Retention policies via TimescaleDB background jobs    |
