/**
 * Host half of the Bots bundle.
 *
 * Owns the bot registry, per-bot memory files, per-bot routines, the room
 * registry with reply relay, and one same-origin JSON route:
 *
 *   GET  /dsh-bots/api  -> { bots, rooms, presets, dataRoot }
 *   POST /dsh-bots/api  -> { action, ... }
 *
 * Actions: create | update | delete
 *        | botMemoryUpdate | botMemoryDistill
 *        | routineAdd | routineUpdate | routineDelete
 *        | roomCreate | roomUpdate | roomDelete | roomPost
 *
 * Data lives in `$DSH_BOTS_DIR` (default `$DSH_HOME/dsh-bots`):
 *   <root>/bots.json                  registry for bots, routines and rooms
 *   <root>/workspaces/<slug>          one working directory per bot
 *   <root>/memory/<botId>.md          one long-term memory file per bot
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export const inject = ['webServer', 'sessionController', 'agentPresets', 'workspaceRegistry'];

const ROUTE_PATH = '/dsh-bots/api';
const NAME_LIMIT = 80;
const PERSONA_LIMIT = 6000;
const TEXT_LIMIT = 8000;
const MEMORY_LIMIT = 20000;
const TRANSCRIPT_LIMIT = 400;
const ROOM_CONTEXT_LIMIT = 12;
const REPLY_LIMIT = 2000;
const PENDING_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_HOPS = 2;
const DEFAULT_BUDGET = 8;
const TIMER_TICK_MS = 30 * 1000;
const ROUTINE_MIN_MINUTES = 1;
const ROUTINE_MAX_MINUTES = 7 * 24 * 60;

function dataRoot() {
  const explicit = process.env.DSH_BOTS_DIR;
  if (typeof explicit === 'string' && explicit.trim().length > 0) return path.resolve(explicit.trim());
  const home = process.env.DSH_HOME;
  if (typeof home === 'string' && home.trim().length > 0) return path.join(home.trim(), 'dsh-bots');
  return path.join(os.homedir(), '.dsh-bots');
}

function text(value, limit) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function slugify(value) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return base.length === 0 ? 'bot' : base.slice(0, 40);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function isSilence(value) {
  const compact = value.replace(/[\s，,。.!！?？~～]/g, '');
  if (compact.length === 0) return true;
  return /^[(（]?沉默[)）]?$/.test(compact) || compact === '无' || compact.toLowerCase() === 'silent';
}

function stripFence(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const lines = trimmed.split('\n');
  const first = lines[0].replace(/^```[a-zA-Z]*\s*/, '');
  const body = [first, ...lines.slice(1)].join('\n');
  return body.replace(/\n?```\s*$/, '').trim();
}

function assistantText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : [];
  return blocks
    .filter((block) => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function reply(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readJsonBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.trim().length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`invalid JSON body: ${String(error)}`));
      }
    });
    req.on('error', reject);
  });
}

export function apply(ctx) {
  const root = dataRoot();
  const registryPath = path.join(root, 'bots.json');
  const workspacesRoot = path.join(root, 'workspaces');
  const memoryRoot = path.join(root, 'memory');

  /** sessionId -> { kind: 'room' | 'memory', roomId?, hop?, botId, at } */
  const pending = new Map();
  /** roomId -> { hop, used } for the current user message. */
  const runtime = new Map();
  let cachedState = { version: 4, bots: [], rooms: [] };

  async function readMemory(botId) {
    try {
      return await readFile(path.join(memoryRoot, `${botId}.md`), 'utf8');
    } catch {
      return '';
    }
  }

  async function writeMemory(botId, content) {
    await mkdir(memoryRoot, { recursive: true });
    await writeFile(path.join(memoryRoot, `${botId}.md`), content, 'utf8');
  }

  function normalizeRoutine(value, previous) {
    const base = previous || {};
    const mode = value.mode === 'daily' || base.mode === 'daily' ? 'daily' : 'interval';
    const at = typeof value.at === 'string' && /^\d{1,2}:\d{2}$/.test(value.at)
      ? value.at
      : typeof base.at === 'string' && /^\d{1,2}:\d{2}$/.test(base.at)
        ? base.at
        : '06:00';
    return {
      id: typeof base.id === 'string' && base.id.length > 0 ? base.id : `rt-${randomUUID().slice(0, 8)}`,
      name: text(value.name, NAME_LIMIT) || text(base.name, NAME_LIMIT) || '例行任务',
      prompt: text(value.prompt, TEXT_LIMIT) || text(base.prompt, TEXT_LIMIT),
      mode,
      at,
      minutes: clampInt(value.minutes, base.minutes === undefined ? 60 : base.minutes, ROUTINE_MIN_MINUTES, ROUTINE_MAX_MINUTES),
      enabled: value.enabled === undefined ? base.enabled !== false : value.enabled !== false,
      lastRunAt: base.lastRunAt === undefined ? 0 : base.lastRunAt,
      createdAt: base.createdAt === undefined ? Date.now() : base.createdAt,
    };
  }

  function routineDue(routine, now) {
    if (routine.enabled === false) return false;
    const last = Number(routine.lastRunAt) || 0;
    if (routine.mode === 'daily') {
      const match = /^(\d{1,2}):(\d{2})$/.exec(routine.at || '06:00');
      if (match === null) return false;
      const target = new Date(now);
      target.setHours(Number(match[1]), Number(match[2]), 0, 0);
      const dueAt = target.getTime();
      return now >= dueAt && last < dueAt;
    }
    const minutes = clampInt(routine.minutes, 60, ROUTINE_MIN_MINUTES, ROUTINE_MAX_MINUTES);
    return now - last >= minutes * 60 * 1000;
  }

  async function loadState() {
    let parsed = null;
    try {
      parsed = JSON.parse(await readFile(registryPath, 'utf8'));
    } catch {
      /* first run */
    }
    const bots = Array.isArray(parsed?.bots) ? parsed.bots : [];
    const rooms = Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    const hydrated = await Promise.all(bots.map(async (bot) => ({
      ...bot,
      group: typeof bot.group === 'string' ? bot.group : '',
      registerWorkspace: bot.registerWorkspace !== false,
      memory: await readMemory(bot.id),
      memoryAt: bot.memoryAt || 0,
      routines: (Array.isArray(bot.routines) ? bot.routines : []).map((routine) => normalizeRoutine(routine)),
    })));
    return {
      version: 4,
      bots: hydrated,
      rooms: rooms.map((room) => ({
        ...room,
        maxHops: clampInt(room.maxHops, DEFAULT_MAX_HOPS, 0, 5),
        budget: clampInt(room.budget, DEFAULT_BUDGET, 1, 30),
        transcript: Array.isArray(room.transcript) ? room.transcript : [],
      })),
    };
  }

  async function saveState(state) {
    cachedState = state;
    await mkdir(root, { recursive: true });
    const persisted = {
      version: 4,
      bots: state.bots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        emoji: bot.emoji,
        persona: bot.persona,
        sessionId: bot.sessionId,
        workspaceId: bot.workspaceId,
        cwd: bot.cwd,
        presetId: bot.presetId,
        group: bot.group || '',
        registerWorkspace: bot.registerWorkspace !== false,
        createdAt: bot.createdAt,
        updatedAt: bot.updatedAt,
        memoryAt: bot.memoryAt || 0,
        routines: bot.routines || [],
      })),
      rooms: state.rooms,
    };
    await writeFile(registryPath, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
  }

  function botView(bot) {
    return {
      id: bot.id,
      name: bot.name,
      emoji: bot.emoji,
      persona: bot.persona,
      sessionId: bot.sessionId,
      workspaceId: bot.workspaceId,
      cwd: bot.cwd,
      presetId: bot.presetId,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
      group: bot.group || '',
      registerWorkspace: bot.registerWorkspace !== false,
      memory: bot.memory || '',
      memoryAt: bot.memoryAt || 0,
      routines: bot.routines || [],
    };
  }

  function roomView(room) {
    const live = runtime.get(room.id);
    return {
      id: room.id,
      name: room.name,
      emoji: room.emoji,
      memberIds: room.memberIds,
      policy: room.policy,
      maxHops: room.maxHops,
      budget: room.budget,
      transcript: room.transcript,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      live: live === undefined ? null : { hop: live.hop, used: live.used },
    };
  }

  function prunePending() {
    const cutoff = Date.now() - PENDING_TTL_MS;
    for (const [sessionId, entry] of pending) {
      if (entry.at < cutoff) pending.delete(sessionId);
    }
  }

  function snapshot(state) {
    prunePending();
    return {
      version: 4,
      bots: state.bots.map(botView),
      rooms: state.rooms.map(roomView),
      dataRoot: root,
    };
  }

  async function listPresets() {
    try {
      const presets = await ctx.agentPresets.list();
      return presets
        .map((preset) => ({ id: preset.id, name: preset.name || preset.id }))
        .filter((preset) => typeof preset.id === 'string' && preset.id.length > 0);
    } catch {
      return [];
    }
  }

  async function ensureWorkspace(dir, title) {
    try {
      const existing = await ctx.workspaceRegistry.resolveByPath(dir);
      if (existing !== undefined && existing !== null) return existing;
    } catch {
      /* optional in some compositions */
    }
    try {
      return await ctx.workspaceRegistry.create(dir, title);
    } catch (error) {
      ctx.logger?.warn?.(`dsh-bots: workspace registration skipped for ${dir}: ${String(error)}`);
      return undefined;
    }
  }

  function personaPrompt(bot) {
    return [
      `你是「${bot.name}」，一个长期存在、有固定岗位的 Bot（不是一次性助手）。`,
      '',
      '【岗位说明书】',
      bot.persona,
      '',
      '工作方式：先确认目标与边界，再动手；不确定时先问，不要猜。',
      '回答简洁，直接给结论与下一步；需要调用工具时说明你在做什么。',
    ].join('\n');
  }

  async function createBot(body, state) {
    const name = text(body.name, NAME_LIMIT) || 'Bot';
    const persona = text(body.persona, PERSONA_LIMIT);
    const emoji = text(body.emoji, 8) || '🤖';
    const presetId = text(body.presetId, 120);

    const id = `bot-${randomUUID().slice(0, 8)}`;
    const dir = path.join(workspacesRoot, `${slugify(name)}-${id.slice(4, 8)}`);
    await mkdir(dir, { recursive: true });

    const group = text(body.group, 40);
    const registerWorkspace = body.registerWorkspace !== false;
    const workspace = registerWorkspace ? await ensureWorkspace(dir, name) : undefined;
    const created = await ctx.sessionController.create({
      cwd: dir,
      ...(presetId.length === 0 ? {} : { agentPreset: presetId }),
    });
    const sessionId = created?.sessionId;
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new Error('session creation returned no sessionId');
    }

    if (persona.length > 0) {
      try {
        await ctx.sessionController.prompt(
          {
            sessionId,
            requestId: randomUUID(),
            content: [{ type: 'text', text: personaPrompt({ name, persona }) }],
          },
          new AbortController().signal,
        );
      } catch (error) {
        ctx.logger?.warn?.(`dsh-bots: persona seed prompt failed for ${sessionId}: ${String(error)}`);
      }
    }

    const now = Date.now();
    const bot = {
      id,
      name,
      emoji,
      persona,
      sessionId,
      workspaceId: workspace?.id,
      cwd: dir,
      presetId,
      group,
      registerWorkspace,
      createdAt: now,
      updatedAt: now,
      memory: '',
      memoryAt: 0,
      routines: [],
    };
    state.bots.push(bot);
    await saveState(state);
    return bot;
  }

  async function updateBot(body, state) {
    const index = state.bots.findIndex((bot) => bot.id === body.id);
    if (index < 0) throw new Error(`bot "${String(body.id)}" not found`);
    const bot = state.bots[index];
    const next = {
      ...bot,
      name: text(body.name, NAME_LIMIT) || bot.name,
      emoji: text(body.emoji, 8) || bot.emoji,
      persona: text(body.persona, PERSONA_LIMIT),
      group: body.group === undefined ? bot.group : text(body.group, 40),
      updatedAt: Date.now(),
    };
    state.bots[index] = next;
    await saveState(state);
    return next;
  }

  async function deleteBot(body, state) {
    const index = state.bots.findIndex((bot) => bot.id === body.id);
    if (index < 0) throw new Error(`bot "${String(body.id)}" not found`);
    const [removed] = state.bots.splice(index, 1);
    for (const room of state.rooms) {
      room.memberIds = room.memberIds.filter((memberId) => memberId !== removed.id);
    }
    await saveState(state);
    if (typeof removed.sessionId === 'string' && removed.sessionId.length > 0) {
      pending.delete(removed.sessionId);
      try {
        await ctx.workspaceRegistry.archiveSession(removed.sessionId);
      } catch (error) {
        ctx.logger?.warn?.(`dsh-bots: could not archive session ${removed.sessionId}: ${String(error)}`);
      }
    }
    return removed;
  }

  /* ------------------------------------------------------------------ memory */

  async function updateMemory(body, state) {
    const bot = state.bots.find((candidate) => candidate.id === body.botId);
    if (bot === undefined) throw new Error(`bot "${String(body.botId)}" not found`);
    const content = text(body.memory, MEMORY_LIMIT);
    await writeMemory(bot.id, content);
    bot.memory = content;
    bot.memoryAt = Date.now();
    await saveState(state);
    return bot;
  }

  async function distillMemory(body, state) {
    const bot = state.bots.find((candidate) => candidate.id === body.botId);
    if (bot === undefined) throw new Error(`bot "${String(body.botId)}" not found`);
    const current = (bot.memory || '').trim();
    const content = [
      '【记忆整理 · 内部维护动作】',
      '这不是用户在提问，不要反问、不要等待确认、不要寒暄。请回顾你到目前为止的对话，把值得长期记住的信息整理成 Markdown 记忆。',
      '要求：结构化条目；合并重复；只保留仍然有效的结论、偏好、事实和进行中的工作；信息不足时写当前已知内容。',
      current.length === 0 ? '当前还没有记忆。' : `现有记忆如下，请在此基础上增补与修正：\n\n${current}`,
      '',
      '只输出整理后的记忆内容本身，不要解释、不要提问、不要代码块包裹。',
    ].join('\n');
    try {
      await ctx.sessionController.prompt(
        { sessionId: bot.sessionId, requestId: randomUUID(), content: [{ type: 'text', text: content }] },
        new AbortController().signal,
      );
    } catch (error) {
      throw new Error(`prompt rejected: ${error instanceof Error ? error.message : String(error)}`);
    }
    pending.set(String(bot.sessionId), { kind: 'memory', botId: bot.id, at: Date.now() });
    return bot;
  }

  async function workspacePrune(state) {
    const owned = new Set(
      state.bots
        .map((bot) => (typeof bot.cwd === 'string' ? path.resolve(bot.cwd) : ''))
        .filter((value) => value.length > 0),
    );
    const prefix = `${path.resolve(workspacesRoot)}${path.sep}`;
    let workspaces = [];
    try {
      workspaces = await ctx.workspaceRegistry.list();
    } catch (error) {
      throw new Error(`workspace listing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    const removed = [];
    const failed = [];
    for (const workspace of workspaces) {
      const workspacePath = typeof workspace.path === 'string'
        ? workspace.path
        : typeof workspace.directory === 'string'
          ? workspace.directory
          : '';
      if (workspacePath.length === 0) continue;
      const resolved = path.resolve(workspacePath);
      if (!resolved.startsWith(prefix)) continue;
      if (owned.has(resolved)) continue;
      try {
        await ctx.workspaceRegistry.delete(workspace.id);
        removed.push({ id: workspace.id, path: resolved });
      } catch (error) {
        failed.push({ id: workspace.id, path: resolved, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { scanned: workspaces.length, removed, failed };
  }

  /* ---------------------------------------------------------------- routines */

  async function routineAdd(body, state) {
    const bot = state.bots.find((candidate) => candidate.id === body.botId);
    if (bot === undefined) throw new Error(`bot "${String(body.botId)}" not found`);
    const routine = normalizeRoutine({
      name: body.name,
      prompt: body.prompt,
      minutes: body.minutes,
      mode: body.mode,
      at: body.at,
      enabled: body.enabled,
    });
    if (routine.prompt.length === 0) throw new Error('routine prompt is required');
    bot.routines = [...(bot.routines || []), routine];
    await saveState(state);
    return bot;
  }

  async function routineUpdate(body, state) {
    const bot = state.bots.find((candidate) => candidate.id === body.botId);
    if (bot === undefined) throw new Error(`bot "${String(body.botId)}" not found`);
    const index = (bot.routines || []).findIndex((routine) => routine.id === body.routineId);
    if (index < 0) throw new Error(`routine "${String(body.routineId)}" not found`);
    const previous = bot.routines[index];
    bot.routines[index] = normalizeRoutine({
      name: body.name === undefined ? previous.name : body.name,
      prompt: body.prompt === undefined ? previous.prompt : body.prompt,
      minutes: body.minutes === undefined ? previous.minutes : body.minutes,
      mode: body.mode === undefined ? previous.mode : body.mode,
      at: body.at === undefined ? previous.at : body.at,
      enabled: body.enabled === undefined ? previous.enabled : body.enabled,
    }, previous);
    await saveState(state);
    return bot;
  }

  async function routineDelete(body, state) {
    const bot = state.bots.find((candidate) => candidate.id === body.botId);
    if (bot === undefined) throw new Error(`bot "${String(body.botId)}" not found`);
    bot.routines = (bot.routines || []).filter((routine) => routine.id !== body.routineId);
    await saveState(state);
    return bot;
  }

  function routineContent(bot, routine) {
    const lines = [
      `【例行任务：${routine.name}】`,
      `指令：${routine.prompt}`,
      `工作目录：${bot.cwd}`,
    ];
    if ((bot.memory || '').trim().length > 0) {
      lines.push('', '【长期记忆】', bot.memory.trim().slice(0, 4000));
    }
    lines.push('', '请按指令执行；完成后用一句话说明结果。');
    return lines.join('\n');
  }

  async function runDueRoutines() {
    const state = cachedState;
    const now = Date.now();
    let changed = false;
    for (const bot of state.bots) {
      for (const routine of bot.routines || []) {
        if (!routineDue(routine, now)) continue;
        routine.lastRunAt = now;
        changed = true;
        try {
          await ctx.sessionController.prompt(
            {
              sessionId: bot.sessionId,
              requestId: randomUUID(),
              content: [{ type: 'text', text: routineContent(bot, routine) }],
            },
            new AbortController().signal,
          );
          ctx.logger?.info?.(`dsh-bots: routine "${routine.name}" dispatched to ${bot.name}`);
        } catch (error) {
          ctx.logger?.warn?.(`dsh-bots: routine "${routine.name}" for ${bot.name} failed: ${String(error)}`);
        }
      }
    }
    if (changed) {
      try {
        await saveState(state);
      } catch (error) {
        ctx.logger?.warn?.(`dsh-bots: could not persist routine timestamps: ${String(error)}`);
      }
    }
  }

  /* ------------------------------------------------------------------- rooms */

  function normalizeMembers(value, state) {
    if (!Array.isArray(value)) return [];
    const known = new Set(state.bots.map((bot) => bot.id));
    const unique = [];
    for (const id of value) {
      if (typeof id === 'string' && known.has(id) && !unique.includes(id)) unique.push(id);
    }
    return unique;
  }

  function normalizePolicy(value) {
    return value === 'mention' ? 'mention' : 'all';
  }

  function pushTranscript(room, entry) {
    room.transcript.push({ id: `msg-${randomUUID().slice(0, 8)}`, at: Date.now(), ...entry });
    if (room.transcript.length > TRANSCRIPT_LIMIT) {
      room.transcript.splice(0, room.transcript.length - TRANSCRIPT_LIMIT);
    }
    room.updatedAt = Date.now();
  }

  async function createRoom(body, state) {
    const name = text(body.name, NAME_LIMIT) || '新房间';
    const now = Date.now();
    const room = {
      id: `room-${randomUUID().slice(0, 8)}`,
      name,
      emoji: text(body.emoji, 8) || '💬',
      memberIds: normalizeMembers(body.memberIds, state),
      policy: normalizePolicy(body.policy),
      maxHops: clampInt(body.maxHops, DEFAULT_MAX_HOPS, 0, 5),
      budget: clampInt(body.budget, DEFAULT_BUDGET, 1, 30),
      transcript: [],
      createdAt: now,
      updatedAt: now,
    };
    state.rooms.push(room);
    await saveState(state);
    return room;
  }

  async function updateRoom(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.id);
    if (room === undefined) throw new Error(`room "${String(body.id)}" not found`);
    if (typeof body.name === 'string' && text(body.name, NAME_LIMIT).length > 0) room.name = text(body.name, NAME_LIMIT);
    if (typeof body.emoji === 'string') room.emoji = text(body.emoji, 8) || room.emoji;
    if (body.memberIds !== undefined) room.memberIds = normalizeMembers(body.memberIds, state);
    if (body.policy !== undefined) room.policy = normalizePolicy(body.policy);
    if (body.maxHops !== undefined) room.maxHops = clampInt(body.maxHops, room.maxHops, 0, 5);
    if (body.budget !== undefined) room.budget = clampInt(body.budget, room.budget, 1, 30);
    room.updatedAt = Date.now();
    await saveState(state);
    return room;
  }

  async function deleteRoom(body, state) {
    const index = state.rooms.findIndex((room) => room.id === body.id);
    if (index < 0) throw new Error(`room "${String(body.id)}" not found`);
    const [removed] = state.rooms.splice(index, 1);
    runtime.delete(removed.id);
    await saveState(state);
    return removed;
  }

  function roomContext(room, state) {
    const names = new Map(state.bots.map((bot) => [bot.id, bot.name]));
    const tail = room.transcript.slice(-ROOM_CONTEXT_LIMIT);
    const lines = tail.map((entry) => {
      const who = entry.from === 'user' ? '用户' : entry.from === 'system' ? '系统' : names.get(entry.from) || '成员';
      return `- ${who}：${entry.text}`;
    });
    return {
      members: room.memberIds.map((id) => names.get(id) || id).join('、') || '（暂无成员）',
      tail: lines.join('\n'),
    };
  }

  function targetsFor(room, state, userText) {
    const members = state.bots.filter((bot) => room.memberIds.includes(bot.id));
    if (room.policy === 'all') return members;
    return members.filter((bot) => userText.includes(`@${bot.name}`) || userText.includes(`@${bot.id}`));
  }

  function dispatchContent(room, context, bot, speakerName, hop) {
    const intro = speakerName === undefined
      ? '请就房间里的话题给出你的回应。'
      : `这是自动接续的第 ${hop} 轮：上一条发言来自「${speakerName}」，请直接回应它的内容（同意/补充/反驳都行）。`;
    const memory = (bot.memory || '').trim();
    const lines = [
      `【群聊房间：${room.name}】`,
      `成员：${context.members}`,
    ];
    if (memory.length > 0) lines.push('', '【长期记忆】', memory.slice(0, 4000));
    lines.push(
      '',
      '最近消息：',
      context.tail,
      '',
      intro,
      '只写你要对房间说的话；与你岗位无关或上一条已经说完时可以只回「（沉默）」。',
      '不要复述规则，不要假扮其他成员。',
    );
    return lines.join('\n');
  }

  async function dispatchRound(room, state, targets, speakerName, hop) {
    const context = roomContext(room, state);
    const failures = [];
    for (const bot of targets) {
      try {
        await ctx.sessionController.prompt(
          {
            sessionId: bot.sessionId,
            requestId: randomUUID(),
            content: [{ type: 'text', text: dispatchContent(room, context, bot, speakerName, hop) }],
          },
          new AbortController().signal,
        );
        pending.set(String(bot.sessionId), { kind: 'room', roomId: room.id, hop, at: Date.now() });
      } catch (error) {
        const detail = error && typeof error === 'object' && error.details && error.details.reason
          ? `: ${String(error.details.reason)}`
          : '';
        failures.push(`${bot.name}: ${error instanceof Error ? error.message : String(error)}${detail}`);
      }
    }
    return failures;
  }

  async function roomPost(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    const userText = text(body.text, TEXT_LIMIT);
    if (userText.length === 0) throw new Error('empty message');

    pushTranscript(room, { from: 'user', name: '我', text: userText });
    runtime.set(room.id, { hop: 0, used: 0 });
    const targets = targetsFor(room, state, userText);
    const failures = await dispatchRound(room, state, targets, undefined, 0);
    if (targets.length > 0) {
      pushTranscript(room, {
        from: 'system',
        name: 'system',
        text: `已派发给 ${targets.map((bot) => bot.name).join('、')}${failures.length > 0 ? `（${failures.length} 个失败）` : ''}`,
      });
    }
    await saveState(state);
    return { room, dispatched: targets.length - failures.length, failures };
  }

  /* ------------------------------------------------------------- reply relay */

  async function handleMemoryReply(entry, sessionId, replyText) {
    const state = cachedState;
    const bot = state.bots.find((candidate) => String(candidate.sessionId) === sessionId);
    if (bot === undefined) return;
    const content = stripFence(replyText).slice(0, MEMORY_LIMIT);
    if (content.length === 0) return;
    await writeMemory(bot.id, `${content}\n`);
    bot.memory = content;
    bot.memoryAt = Date.now();
    await saveState(state);
  }

  async function handleRelay(sessionId, replyText) {
    const entry = pending.get(sessionId);
    if (entry === undefined) return;
    pending.delete(sessionId);
    if (entry.kind === 'memory') {
      await handleMemoryReply(entry, sessionId, replyText);
      return;
    }
    const state = cachedState;
    const room = state.rooms.find((candidate) => candidate.id === entry.roomId);
    if (room === undefined) return;
    const bot = state.bots.find((candidate) => String(candidate.sessionId) === sessionId);
    if (bot === undefined || !room.memberIds.includes(bot.id)) return;

    const live = runtime.get(room.id) ?? { hop: entry.hop ?? 0, used: 0 };
    const budget = clampInt(room.budget, DEFAULT_BUDGET, 1, 30);
    if (live.used >= budget) {
      pushTranscript(room, { from: 'system', name: 'system', text: `本轮已达回复上限（${budget}），停止自动接续` });
      await saveState(state);
      return;
    }
    live.used += 1;
    runtime.set(room.id, live);
    pushTranscript(room, { from: bot.id, name: bot.name, text: replyText, hop: entry.hop ?? 0 });

    const nextHop = (entry.hop ?? 0) + 1;
    const maxHops = clampInt(room.maxHops, DEFAULT_MAX_HOPS, 0, 5);
    if (nextHop <= maxHops && live.used < budget) {
      const others = state.bots.filter((candidate) => room.memberIds.includes(candidate.id) && candidate.id !== bot.id);
      if (others.length > 0) {
        live.hop = nextHop;
        const failures = await dispatchRound(room, state, others, bot.name, nextHop);
        if (failures.length > 0) {
          pushTranscript(room, { from: 'system', name: 'system', text: `接续派发失败：${failures.join('；')}` });
        }
        await saveState(state);
        return;
      }
    }
    await saveState(state);
  }

  ctx.on('session/event', (session, event) => {
    try {
      const sessionId = String(session.id);
      const entry = pending.get(sessionId);
      if (entry === undefined) return;
      if (event === null || typeof event !== 'object' || event.type !== 'assistant/message') return;
      const replyText = assistantText(event.data?.message);
      if (replyText.length === 0) return;
      if (entry.kind === 'room' && isSilence(replyText)) {
        pending.delete(sessionId);
        return;
      }
      void handleRelay(sessionId, replyText.slice(0, Math.max(REPLY_LIMIT, MEMORY_LIMIT))).catch((error) => {
        ctx.logger?.warn?.(`dsh-bots: reply relay failed: ${String(error)}`);
      });
    } catch (error) {
      ctx.logger?.warn?.(`dsh-bots: session event handler failed: ${String(error)}`);
    }
  });

  const ready = loadState().then((state) => {
    cachedState = state;
    return state;
  });

  const timer = setInterval(() => {
    ready
      .then(() => runDueRoutines())
      .catch((error) => ctx.logger?.warn?.(`dsh-bots: routine tick failed: ${String(error)}`));
  }, TIMER_TICK_MS);
  ctx.effect(() => () => clearInterval(timer), 'dsh-bots: routine timer');

  const handler = async (req, res) => {
    try {
      const origin = req.headers.origin;
      if (typeof origin === 'string' && origin.length > 0) {
        let expected;
        try {
          expected = ctx.webServer.getOrigin();
        } catch {
          expected = undefined;
        }
        if (expected !== undefined && origin !== expected) {
          reply(res, 403, { error: 'forbidden origin' });
          return;
        }
      }

      const state = await ready;

      if (req.method === 'GET') {
        reply(res, 200, { ...snapshot(state), presets: await listPresets() });
        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('allow', 'GET, POST');
        res.end();
        return;
      }

      const body = await readJsonBody(req);
      const action = typeof body.action === 'string' ? body.action : '';
      let extra = {};
      if (action === 'create') {
        await createBot(body, state);
      } else if (action === 'update') {
        await updateBot(body, state);
      } else if (action === 'delete') {
        await deleteBot(body, state);
      } else if (action === 'botMemoryUpdate') {
        extra = { bot: botView(await updateMemory(body, state)) };
      } else if (action === 'botMemoryDistill') {
        extra = { bot: botView(await distillMemory(body, state)) };
      } else if (action === 'routineAdd') {
        extra = { bot: botView(await routineAdd(body, state)) };
      } else if (action === 'routineUpdate') {
        extra = { bot: botView(await routineUpdate(body, state)) };
      } else if (action === 'routineDelete') {
        extra = { bot: botView(await routineDelete(body, state)) };
      } else if (action === 'workspacePrune') {
        extra = await workspacePrune(state);
      } else if (action === 'roomCreate') {
        await createRoom(body, state);
      } else if (action === 'roomUpdate') {
        await updateRoom(body, state);
      } else if (action === 'roomDelete') {
        await deleteRoom(body, state);
      } else if (action === 'roomPost') {
        extra = await roomPost(body, state);
      } else {
        reply(res, 400, { error: `unknown action "${action}"` });
        return;
      }
      reply(res, 200, { ...snapshot(state), presets: await listPresets(), ...extra });
    } catch (error) {
      ctx.logger?.warn?.(`dsh-bots: request failed: ${String(error)}`);
      reply(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  };

  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: ROUTE_PATH, handler }),
    'dsh-bots: registry route',
  );
}
