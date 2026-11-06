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
- **Bots** — durable bot entities, listed in **groups** (a `group` label on each bot drives the
  panel sections, e.g. `Code_Eng`, `Daily`, `Core`):
  1. `POST create` makes `<data root>/workspaces/<slug>` on disk,
  2. optionally registers that directory as a DSH Workspace (`registerWorkspace`, off by default so
     bots do not flood the Workspaces sidebar),
  3. creates an agent session with the chosen agent preset,
  4. writes the persona ("job description") as the session's first message,
  5. records the bot in `<data root>/bots.json`.
  Clicking a bot opens its session in the shipped conversation UI, so composer, streaming,
  tool cards, approvals and model selection are reused as-is.
- **Rooms** — a shared transcript with member bots and a dispatch policy:
  - `all` — every posted message is dispatched to every member bot;
  - `mention` — only bots named with `@<bot name>` receive it.
  Each dispatch prompts the bot session with the room name, members and the recent transcript.
  **Bot replies are relayed back into the room transcript**, so the room is one thread.
  - **Auto rounds** (`maxHops`, default 2): after a bot replies, its answer is dispatched to the
    other members, so bots can talk to each other; `0` disables auto rounds.
  - **Reply budget** (`budget`, default 8): at most that many bot replies per user message.
  - A bot that answers `（沉默）` stays silent and does not trigger another round.
- **Memory per bot** — each bot has a long-term memory file (`<data root>/memory/<botId>.md`):
  - editable from the bot card ("Memory");
  - injected into room dispatches and routine prompts;
  - "Let the bot summarize" asks the bot to distill its own conversation into the memory file,
    and the reply is captured back into the file (relay, not a fake).
- **Routines per bot** — scheduled instructions ("Routines"):
  - interval mode (`every N minutes`) or **daily mode** (`at HH:MM`, local time);
  - `name`, `prompt`, enable/disable;
  - the host checks every 30 s and prompts the bot when a routine is due;
  - `lastRunAt` is persisted, so restarts do not double-fire.
- **All sessions** — sessions that are not registered as bots stay reachable in the same panel.
- **JSON API** — the same data is reachable from local automation:
  - `GET /dsh-bots/api` → `{ version, bots, rooms, presets, dataRoot }`
  - `POST /dsh-bots/api` → `{ action, ... }` with
    `create | update | delete | botMemoryUpdate | botMemoryDistill | routineAdd | routineUpdate | routineDelete | roomCreate | roomUpdate | roomDelete | roomPost | workspacePrune`
  - `workspacePrune` removes Workspaces the plugin created for bots that no longer exist
    (only paths under `<data root>/workspaces`), which keeps the Workspaces sidebar clean.

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
| `<data root>/bots.json` | bot + room registry (profiles, routines, members, transcripts) |
| `<data root>/workspaces/<slug>` | one working directory per bot |
| `<data root>/memory/<botId>.md` | one long-term memory file per bot |

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

- **v0.6** — connectors (webhook / IM) and per-bot permissions.
- **v0.7** — richer routines (daily times), memory search, room policy for auto rounds.

## License

MIT.
