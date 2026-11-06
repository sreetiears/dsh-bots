/**
 * Host half of the Bots bundle.
 *
 * Owns the bot registry (name, emoji, persona, workspace, session) and a small
 * same-origin JSON route the Client panel reads and writes:
 *
 *   GET  /dsh-bots/api          -> { bots, presets }
 *   POST /dsh-bots/api          -> { action: 'create' | 'update' | 'delete', ... }
 *
 * Registry data lives in `$DSH_BOTS_DIR` (default `$DSH_HOME/dsh-bots`); bot
 * workspaces live under `<data root>/workspaces/<slug>`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export const inject = ['webServer', 'sessionController', 'agentPresets', 'workspaceRegistry'];

const ROUTE_PATH = '/dsh-bots/api';
const NAME_LIMIT = 80;
const PERSONA_LIMIT = 6000;

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

function readJsonBody(req, limit = 64 * 1024) {
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
      if (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.bots)) return parsed;
      return { version: 1, bots: [] };
    } catch {
      return { version: 1, bots: [] };
    }
  }

  async function saveState(state) {
    await mkdir(root, { recursive: true });
    await writeFile(registryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  function viewOf(bot) {
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
      /* resolveByPath is optional in some compositions */
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
          { sessionId, content: [{ type: 'text', text: personaPrompt({ name, persona }) }] },
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
        reply(res, 200, {
          version: 1,
          bots: state.bots.map(viewOf),
          presets: await listPresets(),
          dataRoot: root,
        });
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
      if (action === 'create') {
        await createBot(body, state);
      } else if (action === 'update') {
        await updateBot(body, state);
      } else if (action === 'delete') {
        await deleteBot(body, state);
      } else {
        reply(res, 400, { error: `unknown action "${action}"` });
        return;
      }
      reply(res, 200, { version: 1, bots: state.bots.map(viewOf), presets: await listPresets(), dataRoot: root });
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
