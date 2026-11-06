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
  - **@mention autocomplete** in the room composer: type `@` and the member bots appear as a
    filtered dropdown (↑/↓ to move, Enter/Tab to insert, Esc to dismiss), so `mention`-policy
    rooms are quick to address.
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
- **Bot factory tools** — five host tools registered by the plugin, callable by any agent
  (including the bots themselves), so a requirement-analysis team can create bots on request:

  | Tool | What it does |
  |---|---|
  | `bots_list` | list bots by group (id, preset, memory/routine counts, persona excerpt) and rooms |
  | `bots_create` | create a bot: `name`, `persona`, optional `emoji` / `group` / `presetId` / `registerWorkspace` |
  | `bots_memory_write` | write (replace) a bot's long-term memory file |
  | `bots_routine_add` | add a routine (`daily` at `HH:MM`, or `interval` every N minutes) |
  | `bots_room_create` | create a room from member names/ids with `policy` / `maxHops` / `budget` |

  This is what makes a *BotStudio* setup possible: `需求访谈员 → 需求分析师 → Bot设计师 → Bot建造者`
  in a room, where the builder calls `bots_create` / `bots_room_create` itself and reports the ids.
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

## Changelog

- **0.8.5** — renaming a conversation uses an in-app dialog (Electron does not support `window.prompt`),
  so the rename action works in the desktop app too.
- **0.8.4** — rooms can hold multiple conversations (threads): a tab bar above the transcript to
  create / switch / rename / delete them, each with its own messages and reply budget. The transcript
  now opens scrolled to the latest message and follows new ones while you are at the bottom. Existing
  rooms are migrated automatically (old transcript becomes "会话 1").
- **0.8.3** — `leader` room policy: only the room leader talks to the user and decides which members
  see each message (`ROUTE: @a, @b`, `ROUTE: ALL`, `ROUTE: NONE`); member replies no longer chain
  on their own. New rooms default to leader mode when a leader is picked; existing rooms can switch
  in the room dialog, which now shows a leader badge.
- **0.8.2** — room composer sends on `Enter` (`Shift+Enter` adds a line, IME-safe); transcripts
  render Markdown (headings, lists, tables, fenced code, quotes, links, inline styles); a message
  without an `@name` in a `mention` room now broadcasts to every member instead of being dropped,
  and an empty room says so in the transcript.
- **0.8.1** — bot factory tools (`bots_list`, `bots_create`, `bots_memory_write`,
  `bots_routine_add`, `bots_room_create`) and the `BotStudio` group built on them.
- **0.8.0** — `bots_list` / `bots_create` registered for every agent.
- **0.7.0** — UI polish pass; grouped bot cards, icon actions, skeletons, responsive rooms.
- **0.6.x** — bot groups, `registerWorkspace` opt-out, daily routines, `workspacePrune`,
  `@name` autocomplete in the room composer.
- **0.5.0** — per-bot memory files and interval routines.
- **0.4.0** — bot replies relayed back into room transcripts, with hop/budget limits.

## Roadmap

- **v0.6** — per-bot permission scopes for the factory tools (only builder bots create bots).
- **v0.7** — memory search across bots, room templates, richer bot market-style import/export.

## License

MIT.
