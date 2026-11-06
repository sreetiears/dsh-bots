/**
 * Host half of the Bots bundle.
 *
 * Owns the bot registry and the room registry plus one same-origin JSON route:
 *
 *   GET  /dsh-bots/api  -> { bots, rooms, presets, dataRoot }
 *   POST /dsh-bots/api  -> { action, ... }
 *
 * Actions: create | update | delete | roomCreate | roomUpdate | roomDelete | roomPost
 *
 * Data lives in `$DSH_BOTS_DIR` (default `$DSH_HOME/dsh-bots`):
 *   <root>/bots.json                  registry for bots and rooms
 *   <root>/workspaces/<slug>          one working directory per bot
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
const TRANSCRIPT_LIMIT = 400;
const ROOM_CONTEXT_LIMIT = 12;

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

function reply(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readJsonBody(req, limit = 128 * 1024) {
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

  async function loadState() {
    try {
      const raw = await readFile(registryPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object') {
        return {
          version: 2,
          bots: Array.isArray(parsed.bots) ? parsed.bots : [],
          rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
        };
      }
    } catch {
      /* first run */
    }
    return { version: 2, bots: [], rooms: [] };
  }

  async function saveState(state) {
    await mkdir(root, { recursive: true });
    await writeFile(registryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
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
    };
  }

  function roomView(room) {
    return {
      id: room.id,
      name: room.name,
      emoji: room.emoji,
      memberIds: room.memberIds,
      policy: room.policy,
      transcript: room.transcript,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  function snapshot(state) {
    return {
      version: 2,
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

    const workspace = await ensureWorkspace(dir, name);
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
      createdAt: now,
      updatedAt: now,
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
      try {
        await ctx.workspaceRegistry.archiveSession(removed.sessionId);
      } catch (error) {
        ctx.logger?.warn?.(`dsh-bots: could not archive session ${removed.sessionId}: ${String(error)}`);
      }
    }
    return removed;
  }

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
    room.updatedAt = Date.now();
    await saveState(state);
    return room;
  }

  async function deleteRoom(body, state) {
    const index = state.rooms.findIndex((room) => room.id === body.id);
    if (index < 0) throw new Error(`room "${String(body.id)}" not found`);
    const [removed] = state.rooms.splice(index, 1);
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

  async function roomPost(body, state) {
    const room = state.rooms.find((candidate) => candidate.id === body.roomId);
    if (room === undefined) throw new Error(`room "${String(body.roomId)}" not found`);
    const userText = text(body.text, TEXT_LIMIT);
    if (userText.length === 0) throw new Error('empty message');

    pushTranscript(room, { from: 'user', name: '我', text: userText });
    const targets = targetsFor(room, state, userText);
    const context = roomContext(room, state);
    const failures = [];

    for (const bot of targets) {
      const content = [
        `【群聊房间：${room.name}】`,
        `成员：${context.members}`,
        '',
        '最近消息：',
        context.tail,
        '',
        '请就房间里的话题给出你的回应。只写你要对房间说的话；与你岗位无关时可以只回「（沉默）」。',
        '不要复述规则，不要假扮其他成员。',
      ].join('\n');
      try {
        await ctx.sessionController.prompt(
          {
            sessionId: bot.sessionId,
            requestId: randomUUID(),
            content: [{ type: 'text', text: content }],
          },
          new AbortController().signal,
        );
      } catch (error) {
        const detail = error && typeof error === 'object' && error.details && error.details.reason
          ? `: ${String(error.details.reason)}`
          : '';
        failures.push(`${bot.name}: ${error instanceof Error ? error.message : String(error)}${detail}`);
      }
    }

    const dispatched = targets.length - failures.length;
    if (targets.length > 0) {
      pushTranscript(room, {
        from: 'system',
        name: 'system',
        text: `已派发给 ${targets.map((bot) => bot.name).join('、')}${failures.length > 0 ? `（${failures.length} 个失败）` : ''}`,
      });
    }
    await saveState(state);
    return { room, dispatched, failures };
  }

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

      if (req.method === 'GET') {
        const state = await loadState();
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
      const state = await loadState();
      const action = typeof body.action === 'string' ? body.action : '';
      let extra = {};
      if (action === 'create') {
        await createBot(body, state);
      } else if (action === 'update') {
        await updateBot(body, state);
      } else if (action === 'delete') {
        await deleteBot(body, state);
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
