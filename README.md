# dsh-bots

A **Bots** panel for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH):
a chat-object zone next to Workspaces where every bot is a durable agent with its own
workspace directory, avatar and persona — and clicking one opens an ordinary conversation.

```
┌ sidebar ─────┐ ┌ Bots ────────────────────────────────────────┐
│ Plugins      │ │  My bots · 3                [搜索] [+ 新建]   │
│ Bots   ◀     │ │  ┌────────┐ ┌────────┐ ┌────────┐            │
│ Schedules    │ │  │ 🤖 研究员│ │ 🧪 测试 │ │ ✍️ 写手 │            │
│              │ │  └────────┘ └────────┘ └────────┘            │
│ 工作区        │ │  All sessions · 8                             │
│  └ 会话       │ │  ...                                          │
│ ⚙ 设置       │ │                                               │
└──────────────┘ └───────────────────────────────────────────────┘
```

## What it adds

- **Sidebar entry** — a `Bots` row in the left column (`sidebar.panellist`), peer to the
  workspace browser, registered through DSH's supported global-panel extension point.
- **Bots panel** — a global main panel (`main` slot, key `bots`) with:
  - registered bots (emoji avatar, name, persona preview, agent preset),
  - an "All sessions" section for sessions that are not registered as bots,
  - search, reload, create / edit / delete inline.
- **Durable bot entities** — creating a bot:
  1. creates `<data root>/workspaces/<slug>` on disk,
  2. registers that directory as a DSH Workspace,
  3. creates an agent session with the chosen agent preset,
  4. writes the persona ("job description") as the session's first message,
  5. records the bot in `<data root>/bots.json`.
- **Open = chat** — clicking a bot opens its session in the shipped conversation UI, so
  composer, streaming, tool cards, approvals and model selection are reused as-is.
- **JSON API** — the same panel data is reachable from local automation:
  - `GET /dsh-bots/api` → `{ version, bots, presets, dataRoot }`
  - `POST /dsh-bots/api` → `{ action: 'create' | 'update' | 'delete', ... }`

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
| `<data root>/bots.json` | bot registry (name, emoji, persona, session, workspace, preset) |
| `<data root>/workspaces/<slug>` | one working directory per bot |

Deleting a bot removes its registry entry and archives its session; files stay on disk.

## Design notes

- **A bot is a session, not a project.** The unit is a durable agent with a persona and its own
  working directory — closer to "a colleague" than to a task. This mirrors how Grok Bot models bots.
- **No per-bot VM, no quota, no multi-device**: out of scope by design. One DSH host, one machine.
- **Sessions stay first-class**: every bot conversation is a normal session, so history, search,
  fork, export and model selection keep working.

## Roadmap

- **v0.3** — rooms / group chat: multiple bots in one transcript, turn-taking rules
  (`@mention` / moderator / round-robin), hop and budget guardrails.
- **v0.4** — per-bot memory files, memory-curator routine, scheduled routines.
- **v0.5** — connects (webhook / IM) and per-bot permissions.

## License

MIT.
