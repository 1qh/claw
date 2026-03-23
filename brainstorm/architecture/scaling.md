# Scaling: Multi-Host Orchestration

## Target

10,000 users from day one. 500-1000 gateways (10-20 users each) across 10-20 VMs.

## Why Orchestration Is Needed

| Problem         | At 1 host                     | At 10-20 hosts                                              |
| --------------- | ----------------------------- | ----------------------------------------------------------- |
| New user signup | Assign to existing gateway    | Which gateway on which host?                                |
| Host dies       | Process manager restarts      | 50-100 gateways offline (500-2000 users) — who reschedules? |
| Host overloaded | Doesn’t happen at 50 gateways | Need rebalancing                                            |
| Add capacity    | N/A                           | New host must be discovered and used                        |
| Rolling updates | Restart gateways              | Coordinate across 10-20 machines                            |

## Choice: [Nomad](https://www.nomadproject.io/)

The only tool that schedules bare processes across multiple hosts without requiring containers. Single binary, lightweight, battle-tested (Cloudflare, Roblox).

### What Nomad Handles

| Capability          | How                                                           |
| ------------------- | ------------------------------------------------------------- |
| Scheduling          | Auto-places gateway processes on best available host          |
| Failover            | Host dies → reschedules gateways to other hosts automatically |
| Health checking     | Monitors processes, restarts on failure                       |
| Capacity management | Tracks resources per host, prevents overloading               |
| Host discovery      | Register new host, Nomad starts using it                      |
| Rolling updates     | One command, coordinated across all hosts                     |

### How It Fits

```
Deployer adds host → registers with Nomad
User signs up → control plane assigns to existing gateway (or submits new gateway job to Nomad)
Nomad → places gateway on best host (raw_exec, no containers)
Gateway crashes → Nomad restarts on any host (fully stateless, all data in TigerFS)
Host dies → Nomad reschedules gateways to other hosts, zero data loss
OpenClaw update → Nomad rolling restart across all hosts
```

### Licensing Note

Nomad is BSL (Business Source License) — not pure open source. BSL allows free use but restricts building a competing orchestration product. Since uniclaw is an agent SaaS framework (MIT), not an orchestrator, this is not a concern.

### Alternatives Considered

| Option                 | Why Rejected                                          |
| ---------------------- | ----------------------------------------------------- |
| Kubernetes             | Requires containers, high complexity                  |
| Docker Swarm           | Requires containers, maintenance mode                 |
| Apache Mesos           | Retired 2025                                          |
| Build our own          | Risky for critical infrastructure at 10-20 host scale |
| Nomad open source fork | Discussed by community, never materialized            |

### Future Option

If BSL becomes a concern, options are:

- Build a thin custom scheduler (informed by real usage patterns)
- Switch to Kubernetes + containers
- Contribute to or start a Nomad fork
