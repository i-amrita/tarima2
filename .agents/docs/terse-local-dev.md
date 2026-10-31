# Running Terse durable actors locally (OSS path)

Date: 2026-10-31

## Why not hosted `terse-cli`

Hosted `terse-cli` requires `terse auth login` before even `terse init --non-interactive`. That login gate is a liability on a hackathon demo machine. The OSS twin `durable-actors` (github.com/TerseAI/durable-actors, MIT) exposes the same `Actor`, `@Persisted`, `@Emittable`, `@Ephemeral`, `@Interleave`, `prepareWebsocket` shape and runs fully local with no auth.

## Verified commands

```sh
bunx durable-actors@latest init <name>   # needs bun >= 1.4.2
cd <name>
bun install
bunx durable-actors dev                  # http://127.0.0.1:7100, state in .durable-actors/
bunx durable-actors generate             # writes generated/ client stubs
```

Smoke test that passed today: `actors.Counter.get("demo").increment()` returned `1`, and `actors.Counter.prepareWebsocket({ actorId: "demo", metadata: null })` returned a `ws://127.0.0.1:7100/v1/socket?key=...` grant URL.

## Bun version

durable-actors requires bun >= 1.4.2. The machine's mise global is 1.3.14 but 1.4.3 is installed under `~/.local/share/mise/installs/bun/1.4.3/`. Pin the repo with `.mise.toml`:

```toml
[tools]
bun = "1.4.3"
```

## Gotchas

- `@Persisted` fields persist only on assignment (`this.messages = [...this.messages, m]`). `this.messages.push(m)` mutates memory without saving.
- `@Interleave` disables `this.db.transaction` in that class; keep methods that need transactions serialized.
- Idle actor eviction defaults to 10s; open WebSockets keep the host alive. For the "kill and restore" demo beat, close the sockets first so the actor actually shuts down, then reconnect.
- Keep `.durable-actors/` out of git but do not delete it between runs; that directory is the durable state.
- Regenerate the client after any public method or socket type change: `bunx durable-actors generate`.
