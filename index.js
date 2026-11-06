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

export const inject = ['webServer', 'sessionController', 'agentPresets', 'workspaceRegistry', 'tools'];

const ROUTE_PATH = '/dsh-bots/api';
const NAME_LIMIT = 80;
const PERSONA_LIMIT = 6000;
const TEXT_LIMIT = 8000;
const MEMORY_LIMIT = 20000;
const TRANSCRIPT_LIMIT = 400;
const THREAD_LIMIT = 20;
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

  function makeThread(title, transcript) {
    const now = Date.now();
    const kept = Array.isArray(transcript) ? transcript.slice(-TRANSCRIPT_LIMIT) : [];
    const last = kept.length > 0 ? kept[kept.length - 1] : undefined;
    return {
      id: `thr-${randomUUID().slice(0, 8)}`,
      title: text(title, 60) || '会话 1',
      createdAt: now,
      updatedAt: last !== undefined ? Number(last.at) || now : now,
      transcript: kept,
    };
  }

  function normalizeThreads(room) {
    const raw = Array.isArray(room.threads) ? room.threads : [];
    const threads = raw
      .filter((thread) => thread !== null && typeof thread === 'object')
      .map((thread, index) => {
        const transcript = Array.isArray(thread.transcript) ? thread.transcript.slice(-TRANSCRIPT_LIMIT) : [];
        const last = transcript.length > 0 ? transcript[transcript.length - 1] : undefined;
        return {
          id: typeof thread.id === 'string' && thread.id.length > 0 ? thread.id : `thr-${randomUUID().slice(0, 8)}`,
          title: text(thread.title, 60) || `会话 ${index + 1}`,
          createdAt: Number(thread.createdAt) || (last !== undefined ? Number(last.at) || 0 : 0) || Date.now(),
          updatedAt: Number(thread.updatedAt) || (last !== undefined ? Number(last.at) || 0 : 0) || Date.now(),
          transcript,
        };
      })
      .slice(-THREAD_LIMIT);
    if (threads.length === 0) threads.push(makeThread('会话 1', room.transcript));
    const activeThreadId = threads.some((thread) => thread.id === room.activeThreadId)
      ? room.activeThreadId
      : threads[threads.length - 1].id;
    return { threads, activeThreadId };
  }

  function activeThread(room) {
    const list = Array.isArray(room.threads) ? room.threads : [];
    return list.find((thread) => thread.id === room.activeThreadId) ?? list[list.length - 1];
  }

  function threadById(room, threadId) {
    if (typeof threadId === 'string' && threadId.length > 0) {
      const hit = room.threads.find((thread) => thread.id === threadId);
      if (hit !== undefined) return hit;
    }
    return activeThread(room);
  }

  function liveKey(room, thread) {
    return `${room.id}#${thread.id}`;
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
      rooms: rooms.map((room) => {
        const memberIds = Array.isArray(room.memberIds) ? room.memberIds : [];
        const { transcript: legacyTranscript, threads: rawThreads, ...rest } = room;
        const { threads, activeThreadId } = normalizeThreads({ ...rest, transcript: legacyTranscript, threads: rawThreads });
        return {
          ...rest,
          memberIds,
          policy: normalizePolicy(room.policy),
          leaderId: memberIds.includes(room.leaderId) ? room.leaderId : '',
          maxHops: clampInt(room.maxHops, DEFAULT_MAX_HOPS, 0, 5),
          budget: clampInt(room.budget, DEFAULT_BUDGET, 1, 30),
          threads,
          activeThreadId,
        };
      }),
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
    const thread = activeThread(room);
    const live = thread === undefined ? undefined : runtime.get(liveKey(room, thread));
    return {
      id: room.id,
      name: room.name,
      emoji: room.emoji,
      memberIds: room.memberIds,
      policy: room.policy,
      leaderId: room.leaderId || '',
      maxHops: room.maxHops,
      budget: room.budget,
      transcript: thread === undefined ? [] : thread.transcript,
      threads: (room.threads || []).map((item) => ({
        id: item.id,
        title: item.title,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        transcript: item.transcript,
      })),
      activeThreadId: thread === undefined ? '' : thread.id,
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
    return value === 'mention' || value === 'leader' ? value : 'all';
  }

  function pickLeader(value, memberIds, state) {
    if (typeof value !== 'string' || value.length === 0) return '';
    if (!memberIds.includes(value)) return '';
    return state.bots.some((bot) => bot.id === value) ? value : '';
  }

  function pushTranscript(room, entry, threadId) {
    const thread = threadById(room, threadId);
    if (thread === undefined) return;
    thread.transcript.push({ id: `msg-${randomUUID().slice(0, 8)}`, at: Date.now(), ...entry });
    if (thread.transcript.length > TRANSCRIPT_LIMIT) {
      thread.transcript.splice(0, thread.transcript.length - TRANSCRIPT_LIMIT);
    }
    thread.updatedAt = Date.now();
    room.updatedAt = Date.now();
  }

  async function createRoom(body, state) {
    const name = text(body.name, NAME_LIMIT) || '新房间';
    const now = Date.now();
    const memberIds = normalizeMembers(body.memberIds, state);
    let leaderId = pickLeader(body.leaderId, memberIds, state);
    const policy = body.policy === undefined
      ? (leaderId.length > 0 ? 'leader' : 'all')
      : normalizePolicy(body.policy);
    if (policy === 'leader' && leaderId.length === 0) leaderId = memberIds[0] || '';
    const firstThread = makeThread('会话 1');
    const room = {
      id: `room-${randomUUID().slice(0, 8)}`,
      name,
      emoji: text(body.emoji, 8) || '💬',
      memberIds,
      policy,
      leaderId,
      maxHops: clampInt(body.maxHops, DEFAULT_MAX_HOPS, 0, 5),
      budget: clampInt(body.budget, DEFAULT_BUDGET, 1, 30),
      threads: [firstThread],
      activeThreadId: firstThread.id,
      createdAt: now,
      updatedAt: now,
    };
    state.rooms.push(room);
    await saveState(state);
    return room;
  }

  async function createThread(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    if (room.threads.length >= THREAD_LIMIT) throw new Error(`每个房间最多 ${THREAD_LIMIT} 条会话，先删掉不用的`);
    const title = typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title
      : `会话 ${room.threads.length + 1}`;
    const thread = makeThread(title);
    room.threads.push(thread);
    room.activeThreadId = thread.id;
    room.updatedAt = Date.now();
    await saveState(state);
    return { room: roomView(room), thread };
  }

  async function renameThread(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    const thread = room.threads.find((candidate) => candidate.id === body.threadId);
    if (thread === undefined) throw new Error(`thread "${String(body.threadId)}" not found`);
    const title = text(body.title, 60);
    if (title.length === 0) throw new Error('empty thread title');
    thread.title = title;
    thread.updatedAt = Date.now();
    room.updatedAt = Date.now();
    await saveState(state);
    return { room: roomView(room), thread };
  }

  async function deleteThread(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    if (room.threads.length <= 1) throw new Error('房间至少要保留一条会话');
    const index = room.threads.findIndex((candidate) => candidate.id === body.threadId);
    if (index < 0) throw new Error(`thread "${String(body.threadId)}" not found`);
    const [removed] = room.threads.splice(index, 1);
    runtime.delete(liveKey(room, removed));
    if (room.activeThreadId === removed.id) {
      room.activeThreadId = room.threads[Math.min(index, room.threads.length - 1)].id;
    }
    room.updatedAt = Date.now();
    await saveState(state);
    return { room: roomView(room), thread: removed };
  }

  async function deleteMessage(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    const thread = room.threads.find((candidate) => candidate.id === body.threadId);
    if (thread === undefined) throw new Error(`thread "${String(body.threadId)}" not found`);
    const index = thread.transcript.findIndex((entry) => entry.id === body.messageId);
    if (index < 0) throw new Error(`message "${String(body.messageId)}" not found`);
    thread.transcript.splice(index, 1);
    thread.updatedAt = Date.now();
    room.updatedAt = Date.now();
    await saveState(state);
    return { room: roomView(room) };
  }

  async function selectThread(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    const thread = room.threads.find((candidate) => candidate.id === body.threadId);
    if (thread === undefined) throw new Error(`thread "${String(body.threadId)}" not found`);
    room.activeThreadId = thread.id;
    await saveState(state);
    return { room: roomView(room), thread };
  }

  async function updateRoom(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.id);
    if (room === undefined) throw new Error(`room "${String(body.id)}" not found`);
    if (typeof body.name === 'string' && text(body.name, NAME_LIMIT).length > 0) room.name = text(body.name, NAME_LIMIT);
    if (typeof body.emoji === 'string') room.emoji = text(body.emoji, 8) || room.emoji;
    if (body.memberIds !== undefined) room.memberIds = normalizeMembers(body.memberIds, state);
    if (body.policy !== undefined) room.policy = normalizePolicy(body.policy);
    if (body.leaderId !== undefined) room.leaderId = pickLeader(body.leaderId, room.memberIds, state);
    if (room.policy === 'leader' && !room.memberIds.includes(room.leaderId)) room.leaderId = room.memberIds[0] || '';
    if (!room.memberIds.includes(room.leaderId)) room.leaderId = '';
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
    for (const thread of removed.threads || []) runtime.delete(liveKey(removed, thread));
    await saveState(state);
    return removed;
  }

  function roomContext(room, state, thread) {
    const names = new Map(state.bots.map((bot) => [bot.id, bot.name]));
    const transcript = thread !== undefined && Array.isArray(thread.transcript) ? thread.transcript : [];
    const tail = transcript.slice(-ROOM_CONTEXT_LIMIT);
    const lines = tail.map((entry) => {
      const who = entry.from === 'user' ? '用户' : entry.from === 'system' ? '系统' : names.get(entry.from) || '成员';
      return `- ${who}：${entry.text}`;
    });
    const roster = room.memberIds
      .map((id) => state.bots.find((bot) => bot.id === id))
      .filter(Boolean)
      .map((bot) => {
        const persona = String(bot.persona || '').replace(/\s+/gu, ' ').slice(0, 140);
        return `- ${bot.emoji} ${bot.name}${bot.id === room.leaderId ? '（Leader）' : ''}：${persona}`;
      })
      .join('\n');
    return {
      members: room.memberIds.map((id) => names.get(id) || id).join('、') || '（暂无成员）',
      roster: roster || '（暂无成员）',
      tail: lines.join('\n'),
    };
  }

  function targetsFor(room, state, userText) {
    const members = state.bots.filter((bot) => room.memberIds.includes(bot.id));
    if (room.policy === 'leader') {
      const leader = members.find((bot) => bot.id === room.leaderId);
      return { mode: 'leader', targets: leader === undefined ? [] : [leader], broadcast: false, leader };
    }
    if (room.policy === 'all') return { mode: 'all', targets: members, broadcast: false };
    const targeted = members.filter((bot) => userText.includes(`@${bot.name}`) || userText.includes(`@${bot.id}`));
    if (targeted.length > 0) return { mode: 'mention', targets: targeted, broadcast: false };
    // mention 房间没写 @ 时不能静默丢弃：退化为全员派发，避免"发了没反应"。
    return { mode: 'mention', targets: members, broadcast: members.length > 0 };
  }

  function leaderContent(room, context, bot, userText) {
    const memory = (bot.memory || '').trim();
    const lines = [
      `【群聊房间：${room.name}】你现在是本房间的 Leader（调度者）：用户只跟你对话，由你决定这条消息给谁看。`,
      '',
      '成员岗位：',
      context.roster,
    ];
    if (memory.length > 0) lines.push('', '【长期记忆】', memory.slice(0, 4000));
    lines.push(
      '',
      '最近消息：',
      context.tail,
      '',
      '用户刚发来这条消息（原样）：',
      userText,
      '',
      '做两件事：',
      '1) 先直接回应用户：确认需求、必要的追问，或你的判断。简短，最多 4 句。',
      '2) 另起一行输出派发指令，严格只写一行：',
      'ROUTE: @名字1, @名字2',
      '也可以写 ROUTE: ALL（全员）或 ROUTE: NONE（这一轮不打扰其他成员）。',
      '只派给确实需要看到这条消息的成员；拿不准就 NONE。他们收到后会各自回应，你不用替他们说话。',
      '不要复述规则，不要假扮其他成员。',
    );
    return lines.join('\n');
  }

  function dispatchContent(room, context, bot, speakerName, hop, options) {
    if (options !== undefined && options.role === 'leader') {
      return leaderContent(room, context, bot, options.userText || '');
    }
    const intro = options !== undefined && options.routed
      ? `Leader「${speakerName}」把用户这条消息交给你，请从你的岗位角度回应。`
      : speakerName === undefined
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

  async function dispatchRound(room, state, targets, speakerName, hop, options) {
    const thread = threadById(room, options !== undefined ? options.threadId : undefined);
    if (thread === undefined) return [];
    const context = roomContext(room, state, thread);
    const failures = [];
    const role = options !== undefined && options.role === 'leader' ? 'leader' : 'member';
    for (const bot of targets) {
      try {
        await ctx.sessionController.prompt(
          {
            sessionId: bot.sessionId,
            requestId: randomUUID(),
            content: [{ type: 'text', text: dispatchContent(room, context, bot, speakerName, hop, options) }],
          },
          new AbortController().signal,
        );
        pending.set(String(bot.sessionId), {
          kind: 'room',
          roomId: room.id,
          threadId: thread.id,
          hop,
          role,
          at: Date.now(),
        });
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

    const thread = threadById(room, body.threadId);
    room.activeThreadId = thread.id;
    pushTranscript(room, { from: 'user', name: '我', text: userText }, thread.id);
    runtime.set(liveKey(room, thread), { hop: 0, used: 0 });
    const plan = targetsFor(room, state, userText);
    const failures = await dispatchRound(room, state, plan.targets, undefined, 0, plan.mode === 'leader'
      ? { role: 'leader', userText, threadId: thread.id }
      : { threadId: thread.id });
    if (plan.mode === 'leader') {
      if (plan.targets.length === 0) {
        pushTranscript(room, { from: 'system', name: 'system', text: '这个房间还没有设置 Leader，先在编辑里选一个' }, thread.id);
      } else {
        const leader = plan.targets[0];
        pushTranscript(room, {
          from: 'system',
          name: 'system',
          text: `已交给 Leader「${leader.emoji} ${leader.name}」，由它决定这条消息给谁看${failures.length > 0 ? `（派发失败：${failures.map((f) => f.split(':')[0]).join('、')}）` : ''}`,
        }, thread.id);
      }
    } else if (plan.targets.length > 0) {
      pushTranscript(room, {
        from: 'system',
        name: 'system',
        text: `${plan.broadcast ? '未指定成员，已派发给全员：' : '已派发给 '}${plan.targets.map((bot) => bot.name).join('、')}${failures.length > 0 ? `（${failures.length} 个失败）` : ''}`,
      }, thread.id);
    } else {
      pushTranscript(room, { from: 'system', name: 'system', text: '房间还没有成员，先在编辑里加入 Bot' }, thread.id);
    }
    await saveState(state);
    return { room, threadId: thread.id, dispatched: plan.targets.length - failures.length, failures };
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

  const ROUTE_PATTERN = /^\s*(?:ROUTE|路由|派发(?:给)?)\s*[:：]\s*(.+?)\s*$/imu;

  function splitRouting(replyText) {
    const match = ROUTE_PATTERN.exec(replyText);
    if (match === null) return { text: replyText.trim(), spec: undefined };
    const visible = replyText.replace(match[0], '').replace(/\n{3,}/gu, '\n\n').trim();
    return { text: visible, spec: match[1].trim() };
  }

  function resolveRouteTargets(spec, room, state, leaderId) {
    const members = state.bots.filter((bot) => room.memberIds.includes(bot.id) && bot.id !== leaderId);
    const normalized = spec.replace(/^@/u, '').trim();
    if (/^(?:ALL|全员|所有人|全部|所有人可见)$/iu.test(normalized)) return { targets: members, all: true };
    if (/^(?:NONE|无|不派发|沉默|没有人|无需)$/iu.test(normalized)) return { targets: [], all: false };
    const parts = normalized
      .split(/[,，、;；\s]+/u)
      .map((part) => part.replace(/^@/u, '').trim())
      .filter((part) => part.length > 0);
    const targets = [];
    for (const part of parts) {
      const hit = members.find((bot) => bot.name === part || bot.id === part)
        || members.find((bot) => bot.name.includes(part) || part.includes(bot.name));
      if (hit !== undefined && !targets.includes(hit)) targets.push(hit);
    }
    return { targets, all: false };
  }

  async function handleLeaderReply(entry, room, bot, replyText) {
    const state = cachedState;
    const thread = threadById(room, entry.threadId);
    const live = runtime.get(liveKey(room, thread)) ?? { hop: 0, used: 0 };
    const budget = clampInt(room.budget, DEFAULT_BUDGET, 1, 30);
    if (live.used >= budget) {
      pushTranscript(room, { from: 'system', name: 'system', text: `本轮已达回复上限（${budget}）` }, thread.id);
      await saveState(state);
      return;
    }
    const { text, spec } = splitRouting(replyText);
    live.used += 1;
    live.hop = 0;
    runtime.set(liveKey(room, thread), live);
    pushTranscript(room, { from: bot.id, name: bot.name, text: (text.length > 0 ? text : replyText).slice(0, REPLY_LIMIT), hop: 0, role: 'leader' }, thread.id);

    if (spec === undefined) {
      pushTranscript(room, { from: 'system', name: 'system', text: `Leader「${bot.name}」没有给出派发指令，本轮只有它回应` }, thread.id);
      await saveState(state);
      return;
    }
    const route = resolveRouteTargets(spec, room, state, bot.id);
    if (route.targets.length === 0) {
      pushTranscript(room, { from: 'system', name: 'system', text: `调度：Leader「${bot.name}」决定本轮不打扰其他成员` }, thread.id);
      await saveState(state);
      return;
    }
    pushTranscript(room, {
      from: 'system',
      name: 'system',
      text: `调度：Leader「${bot.name}」把这条消息交给 ${route.targets.map((target) => target.name).join('、')}`,
    }, thread.id);
    live.hop = 1;
    runtime.set(liveKey(room, thread), live);
    const failures = await dispatchRound(room, state, route.targets, bot.name, 1, { role: 'member', routed: true, threadId: thread.id });
    if (failures.length > 0) {
      pushTranscript(room, { from: 'system', name: 'system', text: `派发失败：${failures.join('；')}` }, thread.id);
    }
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
    const thread = threadById(room, entry.threadId);
    if (thread === undefined) return;
    if (entry.role === 'leader') {
      await handleLeaderReply(entry, room, bot, replyText);
      return;
    }

    const live = runtime.get(liveKey(room, thread)) ?? { hop: entry.hop ?? 0, used: 0 };
    const budget = clampInt(room.budget, DEFAULT_BUDGET, 1, 30);
    if (live.used >= budget) {
      pushTranscript(room, { from: 'system', name: 'system', text: `本轮已达回复上限（${budget}），停止自动接续` }, thread.id);
      await saveState(state);
      return;
    }
    live.used += 1;
    runtime.set(liveKey(room, thread), live);
    pushTranscript(room, { from: bot.id, name: bot.name, text: replyText.slice(0, REPLY_LIMIT), hop: entry.hop ?? 0 }, thread.id);

    // Leader 模式下由 Leader 决定派发对象，成员回复不再自动接续（否则又变成全员刷屏）。
    if (room.policy === 'leader') {
      await saveState(state);
      return;
    }

    const nextHop = (entry.hop ?? 0) + 1;
    const maxHops = clampInt(room.maxHops, DEFAULT_MAX_HOPS, 0, 5);
    if (nextHop <= maxHops && live.used < budget) {
      const others = state.bots.filter((candidate) => room.memberIds.includes(candidate.id) && candidate.id !== bot.id);
      if (others.length > 0) {
        live.hop = nextHop;
        const failures = await dispatchRound(room, state, others, bot.name, nextHop, { threadId: thread.id });
        if (failures.length > 0) {
          pushTranscript(room, { from: 'system', name: 'system', text: `接续派发失败：${failures.join('；')}` }, thread.id);
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
      void handleRelay(sessionId, replyText).catch((error) => {
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

  /**
   * Build a ToolDefinition without importing @deepseek-ai/dsh-tools: the plugin
   * lives outside the profile's node_modules, so the registry contract is
   * implemented directly (ToolSchema + output declaration + execute).
   */
  function factoryTool(spec) {
    if (typeof spec.name !== 'string' || spec.name.trim().length === 0) {
      throw new TypeError('dsh-bots factoryTool: spec.name must be a non-empty string');
    }
    const properties = {};
    const required = [];
    for (const [key, entry] of Object.entries(spec.properties)) {
      const { required: isRequired, ...property } = entry;
      properties[key] = property;
      if (isRequired === true) required.push(key);
    }
    return {
      name: spec.name,
      description: spec.description,
      parameters: { type: 'object', additionalProperties: false, properties, required },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      execute: spec.execute,
    };
  }

  function resolveMemberIds(value, state) {
    const tokens = String(value || '')
      .split(/[,，、\s]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    const ids = [];
    for (const token of tokens) {
      const exact = state.bots.find((bot) => bot.id === token || bot.name === token);
      const fuzzy = exact || state.bots.find((bot) => bot.name.includes(token) || token.includes(bot.name));
      if (fuzzy !== undefined && !ids.includes(fuzzy.id)) ids.push(fuzzy.id);
    }
    return ids;
  }

  const botFactoryTools = [
    ctx.tools.register(factoryTool({
      name: 'bots_list',
      description: '列出当前所有 Bot（id、名字、分组、岗位摘要、记忆与例行数量）和房间。创建任何 Bot 之前先调用它查重。',
      properties: {},
      execute: async () => {
        const state = await ready;
        if (state.bots.length === 0) return '当前没有任何 Bot。';
        const groups = new Map();
        for (const bot of state.bots) {
          const group = bot.group || '未分组';
          if (!groups.has(group)) groups.set(group, []);
          groups.get(group).push(bot);
        }
        const lines = [`共 ${state.bots.length} 个 Bot、${state.rooms.length} 个房间：`];
        for (const [group, bots] of groups) {
          lines.push('', `【${group}】`);
          for (const bot of bots) {
            const persona = String(bot.persona || '').replace(/\s+/gu, ' ').slice(0, 90);
            lines.push(`- ${bot.emoji} ${bot.name}｜id=${bot.id}｜preset=${bot.presetId || '默认'}｜记忆=${bot.memory ? '有' : '无'}｜例行=${(bot.routines || []).length} 条${persona.length > 0 ? `｜${persona}` : ''}`);
          }
        }
        if (state.rooms.length > 0) {
          lines.push('', '房间：');
          for (const room of state.rooms) {
            const members = room.memberIds.map((memberId) => state.bots.find((bot) => bot.id === memberId)?.name || memberId).join('、');
            const leader = state.bots.find((bot) => bot.id === room.leaderId);
            lines.push(`- ${room.emoji} ${room.name}｜id=${room.id}｜policy=${room.policy}${leader ? `｜Leader=${leader.name}` : ''}｜成员=${members}`);
          }
        }
        return lines.join('\n');
      },
    })),
    ctx.tools.register(factoryTool({
      name: 'bots_create',
      description: '创建一个长期存在的 Bot：独立会话、独立工作目录、独立长期记忆。persona 是岗位说明书，必须写清职责、工作方式、输出格式和边界。创建前先用 bots_list 查重，避免与已有 Bot 重复。记忆与例行任务是创建后的第二步：分别用 bots_memory_write 和 bots_routine_add 设置。',
      properties: {
        name: { type: 'string', required: true, description: '短中文名，如「需求访谈员」' },
        emoji: { type: 'string', description: '单个 emoji，默认 🤖' },
        group: { type: 'string', description: '面板分组名，如「BotStudio」。同组 Bot 在面板里并排显示' },
        persona: { type: 'string', required: true, description: '岗位说明书全文（建议 200-1500 字）' },
        presetId: { type: 'string', description: 'agent preset id，留空用默认 preset' },
        registerWorkspace: { type: 'boolean', description: '是否同时注册为工作区，默认 false' },
      },
      execute: async (args) => {
        const state = await ready;
        const persona = text(args.persona, PERSONA_LIMIT);
        if (persona.length < 20) throw new Error('persona 太短：请写清职责、工作方式、输出格式与边界（至少 20 字）');
        const bot = await createBot({
          name: args.name,
          emoji: args.emoji,
          group: args.group,
          persona,
          presetId: args.presetId,
          registerWorkspace: args.registerWorkspace === true,
        }, state);
        return [
          `已创建 Bot：${bot.emoji} ${bot.name}（id=${bot.id}）`,
          `分组：${bot.group || '未分组'}｜会话：${bot.sessionId}`,
          `工作目录：${bot.cwd}`,
          '下一步：把它加入房间（bots_room_create），或让用户直接在侧栏 Bots 面板里点开它。',
        ].join('\n');
      },
    })),
    ctx.tools.register(factoryTool({
      name: 'bots_memory_write',
      description: '写入（覆盖）某个 Bot 的长期记忆文件。记忆会在它参与房间对话、执行例行任务时注入。适合在建好 Bot 后写入初始记忆，或追加整理后的要点（先读旧内容再写全量）。',
      properties: {
        botId: { type: 'string', required: true, description: 'Bot id（bots_list 返回的 id）' },
        memory: { type: 'string', required: true, description: '完整记忆内容（Markdown），会覆盖旧内容' },
      },
      execute: async (args) => {
        const state = await ready;
        const bot = await updateMemory({ botId: args.botId, memory: args.memory }, state);
        return `已更新 ${bot.emoji} ${bot.name}（id=${bot.id}）的长期记忆：${String(bot.memory || '').length} 字符。`;
      },
    })),
    ctx.tools.register(factoryTool({
      name: 'bots_routine_add',
      description: '给某个 Bot 增加一条例行任务：到点自动向它的会话投递指令。mode=daily 时用 at（HH:MM，本地时间）；mode=interval 时用 minutes（间隔分钟数）。',
      properties: {
        botId: { type: 'string', required: true, description: 'Bot id' },
        name: { type: 'string', required: true, description: '例行任务名，如「每日学习计划推送」' },
        prompt: { type: 'string', required: true, description: '到点投递的指令（写给这个 Bot 的完整任务说明）' },
        mode: { type: 'string', description: 'daily 或 interval，默认 interval' },
        at: { type: 'string', description: 'daily 模式的时间，HH:MM，默认 06:00' },
        minutes: { type: 'number', description: 'interval 模式的间隔分钟数，默认 60' },
      },
      execute: async (args) => {
        const state = await ready;
        const bot = await routineAdd(args, state);
        const routine = (bot.routines || [])[bot.routines.length - 1];
        return `已给 ${bot.emoji} ${bot.name} 增加例行任务「${routine.name}」（id=${routine.id}）：${routine.mode === 'daily' ? `每天 ${routine.at}` : `每 ${routine.minutes} 分钟`}。当前该 Bot 共 ${(bot.routines || []).length} 条例行。`;
      },
    })),
    ctx.tools.register(factoryTool({
      name: 'bots_room_create',
      description: '创建一个群聊房间，把若干 Bot 拉进来互相协作。members 用 Bot 名字/id 列表（逗号分隔）。policy=leader（推荐）时只有 Leader 跟你对话，由 Leader 决定这条消息派给谁；policy=mention 时只有被 @ 的 Bot 回复，没写 @ 就全员回复；policy=all 时全员回复（更费 token）。',
      properties: {
        name: { type: 'string', required: true, description: '房间名' },
        emoji: { type: 'string', description: '单个 emoji，默认 💬' },
        members: { type: 'string', required: true, description: '成员名字或 id，逗号分隔' },
        leader: { type: 'string', description: 'Leader 的名字或 id（policy=leader 时必填，用于调度）' },
        policy: { type: 'string', description: 'leader、mention 或 all，默认 leader' },
        maxHops: { type: 'number', description: '自动接续轮数上限，默认 2，0 关闭' },
        budget: { type: 'number', description: '每条用户消息的 Bot 回复预算，默认 6' },
      },
      execute: async (args) => {
        const state = await ready;
        const memberIds = resolveMemberIds(args.members, state);
        if (memberIds.length === 0) throw new Error(`没有匹配到任何 Bot：${String(args.members)}`);
        const leaderIds = args.leader === undefined ? [] : resolveMemberIds(args.leader, state);
        const room = await createRoom({
          name: args.name,
          emoji: args.emoji,
          memberIds,
          leaderId: leaderIds.length > 0 ? leaderIds[0] : undefined,
          policy: args.policy === undefined ? 'leader' : args.policy,
          maxHops: args.maxHops,
          budget: args.budget,
        }, state);
        const names = memberIds.map((memberId) => state.bots.find((bot) => bot.id === memberId)?.name || memberId).join('、');
        const leader = state.bots.find((bot) => bot.id === room.leaderId);
        return [
          `已创建房间：${room.emoji} ${room.name}（id=${room.id}）`,
          `成员：${names}`,
          `策略：${room.policy}${leader ? `｜Leader=${leader.name}` : ''}｜自动接续 ${room.maxHops} 轮｜预算 ${room.budget} 条`,
          '下一步：用户在侧栏 Bots 面板打开这个房间就能开始对话。',
        ].join('\n');
      },
    })),
  ];
  ctx.effect(() => () => {
    for (const dispose of botFactoryTools) dispose();
  }, 'dsh-bots: bot factory tools');

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
      } else if (action === 'roomThreadCreate') {
        await createThread(body, state);
      } else if (action === 'roomThreadRename') {
        await renameThread(body, state);
      } else if (action === 'roomThreadDelete') {
        await deleteThread(body, state);
      } else if (action === 'roomThreadSelect') {
        await selectThread(body, state);
      } else if (action === 'roomMessageDelete') {
        extra = await deleteMessage(body, state);
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
