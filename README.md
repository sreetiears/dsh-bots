# dsh-bots

A **Bots** panel for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH):
a chat-object zone next to Workspaces where every bot is a durable agent with its own
workspace directory, avatar and persona — and **rooms** to dispatch a message to several bots.

```
┌ sidebar ─────┐ ┌ Bots ────────────────────────────────────────┐
│ Plugins      │ │  My bots · 3        [搜索] [+ Bot] [+ 房间]   │
│ Bots   ◀     │ │  ┌────────┐ ┌────────┐ ┌────────┐            │
│ Schedules    │ │  │ 🤖 研究员│ │ 🧪 测试 │ │ ✍️ 写手 │            │
│              │ │  └────────┘ └────────┘ └────────┘            │
│ 工作区        │ │  Rooms · 1                                   │
│  └ 会话       │ │  ┌──────────────────────────┐                │
│ ⚙ 设置       │ │  │ 💬 选题会  2 位成员  全员  │                │
└──────────────┘ └───────────────────────────────────────────────┘
```

## What it adds

- **Sidebar entry** — a `Bots` row in the left column (`sidebar.panellist`), peer to the
  workspace browser, registered through DSH's supported global-panel extension point.
- **Bots** — durable bot entities:
  1. `POST create` makes `<data root>/workspaces/<slug>` on disk,
  2. registers that directory as a DSH Workspace,
  3. creates an agent session with the chosen agent preset,
  4. writes the persona ("job description") as the session's first message,
  5. records the bot in `<data root>/bots.json`.
  Clicking a bot opens its session in the shipped conversation UI, so composer, streaming,
  tool cards, approvals and model selection are reused as-is.
- **Rooms** — a shared transcript with member bots and a dispatch policy:
  - `all` — every posted message is dispatched to every member bot;
  - `mention` — only bots named with `@<bot name>` receive it.
  Each dispatch prompts the bot session with the room name, members and the recent transcript,
  so bots answer with the room in context. The transcript keeps user messages and dispatch
  receipts; bot replies live in their own sessions (reply relay is next).
- **All sessions** — sessions that are not registered as bots stay reachable in the same panel.
- **JSON API** — the same data is reachable from local automation:
  - `GET /dsh-bots/api` → `{ version, bots, rooms, presets, dataRoot }`
  - `POST /dsh-bots/api` → `{ action, ... }` with
    `create | update | delete | roomCreate | roomUpdate | roomDelete | roomPost`

## Install

Install it as a DSH bundle from a profile session (no build step, no dependencies):

```js
plugin_manager({ action: 'install_bundle', target: '/absolute/path/to/dsh-bots' })
```

Then refresh the Web GUI. The Host half activates immediately; the Client panel loads with
the page refresh.

Requirements: DSH `0.2.x` desktop/web profile with the `web` bundle (agent presets, session
controller, workspace registry and the HTTP carrier).

## Data

| Path | Content |
|---|---|
| `$DSH_BOTS_DIR` or `$DSH_HOME/dsh-bots` | data root (override with `DSH_BOTS_DIR`) |
| `<data root>/bots.json` | bot + room registry (profiles, members, transcripts) |
| `<data root>/workspaces/<slug>` | one working directory per bot |

Deleting a bot removes its registry entry, drops it from rooms and archives its session;
files stay on disk. Deleting a room removes its transcript only.

## Design notes

- **A bot is a session, not a project.** The unit is a durable agent with a persona and its own
  working directory — closer to "a colleague" than to a task.
- **No per-bot VM, no quota, no multi-device**: out of scope by design. One DSH host, one machine.
- **Sessions stay first-class**: every bot conversation is a normal session, so history, search,
  fork, export and model selection keep working.
- **Theme-safe UI**: every surface and label uses the host's theme tokens (`--dsw-alias-*`), and
  the dialogs pin `color-scheme` to the live theme so native controls (selects, inputs) follow it.

## Roadmap

- **v0.4** — reply relay: bot answers flow back into the room transcript, so bots can talk to
  each other in one thread; hop and budget guardrails.
- **v0.5** — per-bot memory files, memory-curator routine, scheduled routines.
- **v0.6** — connectors (webhook / IM) and per-bot permissions.

## License

MIT.
