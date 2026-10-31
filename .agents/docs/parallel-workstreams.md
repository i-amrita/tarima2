# Parallel workstreams

How to split DealRelay across sessions (local + VPS `own-agents`) without stepping on each other.

## Streams

| Stream | Owns | Depends on |
| --- | --- | --- |
| A. Actors + shared types | `packages/actors`, `packages/shared` | nothing |
| B. Relay pipeline | `apps/relay` | A (generated client, shared types) |
| C. Web app | `apps/web` | A, B contracts (not implementations) |
| D. Validation + tooling | `scripts/validate.ts`, `.mise.toml`, root package.json | nothing |
| E. Demo video assets | `.agents/docs/demo-video-plan.md`, fixtures copy | B fixtures script |

A and D can start immediately and in parallel. B starts once A lands. C starts once the shared types exist (it can build against fixtures before B is real). E starts once B's fixture script exists.

## Handoff seams

- `packages/shared` is the contract layer. Any change to it must bump a version comment at the top and be called out in the PR description so other streams can rebase.
- The generated client (`packages/actors/generated/`) is checked in so B and C do not need to run the actor server to typecheck. Regenerate it in stream A whenever public methods change.
- The relay pipeline writes back to the actor only through the generated client. Never reach into actor internals from `apps/relay`.

## VPS offload

The `own-agents` VPS user can run stream C (web) or stream E (video assets) once A and B land. Do not run stream A or D there until the repo is initialized; they touch root config.

## Branching

One branch per stream, named `stream/<letter>-<slug>` (e.g. `stream/a-actors`). Merge order: A -> D -> B -> C -> E. Keep PRs small; the validate gate must pass on each merge.
