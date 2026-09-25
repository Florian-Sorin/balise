# 📡 Balise

Balise is a local-first network diagnostic tool built to investigate intermittent connectivity problems on a home network, initially a **Sosh Livebox S / fibre / Wi-Fi 7** setup.

Its rule is simple: **observe before changing anything**.

## What v0.1 does

- runs natively on the host OS (Windows is the primary target);
- samples the network every 5 seconds by default;
- separates local gateway, IPv4, IPv6, system DNS, external DNS and HTTPS checks;
- stores measurements in a local SQLite database;
- opens incidents after repeated failures and closes them after recovery;
- lets you record a phone connectivity loss at the exact moment it happens;
- exposes a lightweight local dashboard and JSON API;
- keeps the first structure for controlled network experiments.

Balise **does not modify the Livebox configuration** in v0.1.

## Requirements

- Windows 11 recommended for the first diagnostic campaign
- Node.js 22+
- pnpm

> Run Balise from native Windows, not WSL2. The goal is to observe the same Windows network stack used by the PC rather than WSL's virtual network path.

## Install

```powershell
pnpm install
pnpm dev
```

Then open:

```text
http://127.0.0.1:3210
```

The SQLite database is created at `./data/balise.db` by default.

## First diagnostic campaign

1. Keep the Livebox configuration unchanged.
2. Let Balise run while you normally use the network.
3. When the phone wakes up connected to Wi-Fi but has no Internet, immediately click **“Mon téléphone vient de perdre Internet”**.
4. Note PS5 or PC interruptions in the observation form.
5. Collect several real incidents before testing configuration changes.

The first controlled experiment, if baseline data does not reveal the cause, will be the separation of the 2.4 GHz and 5 GHz Wi-Fi bands / Wi-Fi intelligent behavior.

## Configuration

Environment variables are optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BALISE_HOST` | `127.0.0.1` | Dashboard bind address |
| `BALISE_PORT` | `3210` | Dashboard port |
| `BALISE_INTERVAL_MS` | `5000` | Probe interval |
| `BALISE_DB_PATH` | `./data/balise.db` | SQLite file |
| `BALISE_RETENTION_DAYS` | `14` | Raw sample retention |
| `BALISE_FAILURE_THRESHOLD` | `2` | Failed cycles before opening an incident |
| `BALISE_RECOVERY_THRESHOLD` | `2` | Healthy cycles before closing an incident |

## Probe interpretation

| Result | Initial interpretation |
| --- | --- |
| Gateway unavailable | Wi-Fi/LAN, network adapter or local Livebox problem |
| Gateway OK, IPv4 unavailable | WAN/routing/fibre/Livebox problem |
| IPv4 OK, system DNS unavailable | DNS path used by the client |
| System + external DNS unavailable | broader DNS/connectivity issue |
| IPv4 + DNS OK, HTTPS unavailable | partial/application-layer connectivity issue |
| IPv6 unavailable alone | recorded as degradation, not enough by itself to declare an outage |

These are diagnostic hypotheses, not final conclusions.

## API

- `GET /api/status`
- `GET /api/incidents`
- `GET /api/samples`
- `GET /api/observations`
- `POST /api/observations`
- `POST /api/observations/phone-loss`
- `GET /api/experiments`
- `POST /api/experiments`

## Development

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Roadmap

### v0.1 — Windows observer

Current scope: probes, SQLite, incident detection, observations, basic experiments and local dashboard.

### v0.2 — Android companion

Capture Wi-Fi state around phone wake-up: SSID/BSSID, IP/gateway/DNS, Android network validation, signal and direct connectivity tests.

### Later

Read-only Livebox telemetry may be added behind an isolated adapter. Automatic router configuration changes are intentionally out of scope until the behavior and interfaces are sufficiently understood.
