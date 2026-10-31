# Stream B Relay Pipeline Plan

Date: 2026-10-31
Author: Antigravity Agent
Scope: apps/relay package (@dealrelay/relay)

## Objective

Build the Agent Relay processing service in apps/relay.
The pipeline coordinates Scout, Finance, and Negotiator roles to parse venue proposals, audit against specs, emit activity traces, and record audit results back to RoomActor.

## Architecture and Seams

- Package name: @dealrelay/relay.
- Imports types from @dealrelay/shared and fixtures from @dealrelay/shared/fixtures.
- Imports generated actor client from @dealrelay/actors.
- RoomClient structural interface: minimal contract containing appendActivity and submitAudit, satisfied by actors.RoomActor.get(roomId).
- Deterministic fixture pipeline parsing raw proposal texts for Scout, auditing metrics for Finance, and drafting counter proposals for Negotiator.
- Chunked activity streaming with 60 to 120ms cadence via an injectable sleep function.
- HTTP server running on RELAY_PORT (default 7200) exposing POST /run and GET /health.
- Full Vitest coverage in apps/relay/src/pipeline.test.ts testing both Grand Loft and Warehouse 9 fixtures.
- End-to-end verification against live actor dev server on port 7100.

## Implementation Steps

1. Milestone 1: Package setup. Create apps/relay directory, package.json, and tsconfig.json. Wire workspace dependencies.
2. Milestone 2: Pipeline logic and parser in apps/relay/src/pipeline.ts. Implement RelayPipeline, structural RoomClient, Scout regex parser, Finance rules, and Negotiator copy generator. Implement chunked activity streaming.
3. Milestone 3: Unit tests in apps/relay/src/pipeline.test.ts. Test fixtures with instant sleep, asserting exact violations, deltas, event sequences, and single submitAudit call.
4. Milestone 4: HTTP server in apps/relay/src/server.ts. Implement POST /run (returning 202 immediately and executing pipeline in background) and GET /health.
5. Milestone 5: End-to-end live actor integration verification against http://127.0.0.1:7100.
6. Milestone 6: Validation gate check (bun run validate) and diff against baseline log. Summary in /tmp/tarima2-b.out.md.
