window.__ModuleLoader__.load({
  id: '@local/dsh-bots',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-bots';
    const PANEL_ID = 'bots';
    const API = '/dsh-bots/api';

    const EN = {
      panel: 'Bots',
      subtitle: 'Registered bots plus every session, as chat contacts',
      search: 'Search bots',
      new: 'New bot',
      untitled: 'Untitled session',
      emptyTitle: 'No bot conversations yet',
      emptyBody: 'Create a bot and it shows up here with its own workspace and persona.',
      note: 'Bots are stored on this machine and open as ordinary sessions.',
      myBots: 'My bots',
      myBotsHint: 'Each bot has its own workspace directory and a persona seeded as its first message.',
      allSessions: 'All sessions',
      allSessionsHint: 'Sessions that are not registered as bots appear here.',
      formCreate: 'New bot',
      formEdit: 'Edit bot',
      formName: 'Name',
      formEmoji: 'Avatar',
      formPersona: 'Persona (job description)',
      formPersonaHint: 'Seeded as the first message of the bot session. Keep it short: goal, boundary, output.',
      formPreset: 'Agent preset',
      formPresetNone: 'Deployment default',
      formCreateAction: 'Create bot',
      formSaveAction: 'Save',
      formCancel: 'Cancel',
      actionEdit: 'Edit',
      actionDelete: 'Delete',
      actionReload: 'Reload',
      loading: 'Loading…',
      errorLoad: 'Could not load bots.',
      errorSave: 'Could not save the bot.',
      confirmDelete: 'Delete this bot? Its session and files stay on disk.',
      badgeNoPreset: 'default preset',
      personaEmpty: 'No persona yet',
    };
    const ZH = {
      panel: 'Bots',
      subtitle: '已登记的 Bot + 全部会话，都当作聊天对象',
      search: '搜索 Bot',
      new: '新建 Bot',
      untitled: '未命名会话',
      emptyTitle: '还没有 Bot',
      emptyBody: '新建一个 Bot，它会带上自己的工作目录和岗位说明书。',
      note: 'Bot 数据存在本机，点开就是普通会话。',
      myBots: '我的 Bots',
      myBotsHint: '每个 Bot 有独立工作目录，岗位说明书会作为会话的第一条消息写入。',
      allSessions: '全部会话',
      allSessionsHint: '没有登记成 Bot 的会话显示在这里。',
      formCreate: '新建 Bot',
      formEdit: '编辑 Bot',
      formName: '名字',
      formEmoji: '头像',
      formPersona: '岗位说明书',
      formPersonaHint: '会成为该 Bot 会话的第一条消息。写清楚：目标、边界、产出格式。',
      formPreset: 'Agent 预设',
      formPresetNone: '用部署默认',
      formCreateAction: '创建 Bot',
      formSaveAction: '保存',
      formCancel: '取消',
      actionEdit: '编辑',
      actionDelete: '删除',
      actionReload: '刷新',
      loading: '加载中…',
      errorLoad: '读取 Bot 列表失败。',
      errorSave: '保存失败。',
      confirmDelete: '删除这个 Bot？它的会话和文件会保留在磁盘上。',
      badgeNoPreset: '默认预设',
      personaEmpty: '还没写岗位说明书',
    };
    const DICT = { en: EN, de: EN, es: EN, fr: EN, ja: EN, pt: EN, ru: EN, zh: ZH };

    const CSS = `
.dshb-page{box-sizing:border-box;height:100%;overflow-y:auto;overflow-x:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:calc(var(--dsh-frame-top-clearance, 48px) + 8px) clamp(20px, 4vw, 48px) 56px;font-family:inherit;font-size:13px;line-height:1.45}
.dshb-wrap{max-width:1040px;margin:0 auto;min-width:0}
.dshb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap;min-width:0}
.dshb-headmain{min-width:0}
.dshb-title{font-size:22px;font-weight:600;line-height:1.25;margin:0;overflow-wrap:anywhere}
.dshb-count{font-size:13px;font-weight:400;color:var(--dsw-alias-label-secondary);margin-left:8px}
.dshb-sub{font-size:13px;color:var(--dsw-alias-label-secondary);margin-top:6px;max-width:640px;overflow-wrap:anywhere}
.dshb-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.dshb-search{height:34px;width:200px;max-width:100%;min-width:0;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;padding:0 12px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box}
.dshb-search:focus{border-color:var(--dsw-alias-border-l2)}
.dshb-btn{height:34px;padding:0 14px;border-radius:8px;border:none;background:var(--dsw-alias-brand-primary);color:#fff;font-size:13px;font-family:inherit;font-weight:500;cursor:pointer;white-space:nowrap;max-width:100%}
.dshb-btn:hover{filter:brightness(1.06)}
.dshb-btn.quiet{background:transparent;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1)}
.dshb-btn.quiet:hover{color:var(--dsw-alias-label-primary);filter:none}
.dshb-section{margin-top:26px;min-width:0}
.dshb-sectionHead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px;min-width:0}
.dshb-sectionTitle{font-size:14px;font-weight:600;margin:0;overflow-wrap:anywhere}
.dshb-sectionHint{font-size:12px;color:var(--dsw-alias-label-secondary);min-width:0;overflow-wrap:anywhere}
.dshb-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(min(248px, 100%), 1fr));gap:12px;min-width:0}
.dshb-card{display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;color:inherit;font:inherit;min-width:0;overflow:hidden;position:relative}
.dshb-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dshb-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dshb-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;flex:none;user-select:none;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);overflow:hidden}
.dshb-avatar.text{font-size:15px;font-weight:600;color:#fff;border:none}
.dshb-meta{min-width:0;flex:1;overflow:hidden}
.dshb-name{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dshb-line{display:block;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-top:3px}
.dshb-persona{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:4px;overflow-wrap:anywhere}
.dshb-badge{display:inline-block;max-width:100%;margin-top:6px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}
.dshb-time{font-size:11px;color:var(--dsw-alias-label-secondary);flex:none;align-self:flex-start;margin-top:2px;max-width:56px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshb-rowActions{position:absolute;top:8px;right:8px;display:none;gap:4px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:2px}
.dshb-card:hover .dshb-rowActions,.dshb-card:focus-within .dshb-rowActions{display:flex}
.dshb-iconBtn{border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;font-family:inherit;padding:3px 6px;border-radius:6px;white-space:nowrap}
.dshb-iconBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dshb-empty{margin-top:36px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.7;padding:0 12px}
.dshb-empty strong{display:block;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:500;margin-bottom:6px}
.dshb-note{margin-top:32px;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;overflow-wrap:anywhere}
.dshb-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin-top:8px;overflow-wrap:anywhere}
.dshb-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.38);display:flex;align-items:flex-start;justify-content:center;padding:8vh 16px 24px;overflow:auto}
.dshb-dialog{width:min(560px, 100%);box-sizing:border-box;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:20px;box-shadow:0 18px 48px rgba(0,0,0,.28)}
.dshb-dialogTitle{font-size:16px;font-weight:600;margin:0 0 14px}
.dshb-field{margin-bottom:12px;min-width:0}
.dshb-label{display:block;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);margin-bottom:5px}
.dshb-input,.dshb-textarea,.dshb-select{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;font-size:13px;font-family:inherit;padding:8px 10px;outline:none;min-width:0}
.dshb-textarea{resize:vertical;min-height:96px;line-height:1.5}
.dshb-input:focus,.dshb-textarea:focus,.dshb-select:focus{border-color:var(--dsw-alias-border-l2)}
.dshb-hint{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:4px;overflow-wrap:anywhere}
.dshb-dialogActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}
@media (width <= 640px){.dshb-search{width:100%}.dshb-tools{width:100%}.dshb-tools .dshb-btn{flex:1}}
`;

    const AVATAR_COLORS = ['#2f6fed', '#107c41', '#a4262c', '#8a5a00', '#5c2e91', '#0f6cbd', '#c239b3'];

    function hashOf(value) {
      let hash = 0;
      const text = String(value);
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) | 0;
      return Math.abs(hash);
    }

    function numericTime(value) {
      const raw = Number(value) || 0;
      return raw > 0 && raw < 1e12 ? raw * 1000 : raw;
    }

    function timeLabel(value) {
      const stamp = numericTime(value);
      if (stamp <= 0) return '';
      const date = new Date(stamp);
      const now = new Date();
      const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
      if (sameDay) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    function initials(text, fallback) {
      const value = String(text || '').trim();
      if (value.length === 0) return fallback;
      return Array.from(value)[0].toUpperCase();
    }

    async function request(body) {
      const init = body === undefined
        ? { method: 'GET' }
        : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
      const response = await fetch(API, init);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    }

    function BotsIcon(props) {
      const size = props && props.size ? props.size : 18;
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', { x: 4.2, y: 8, width: 15.6, height: 11.4, rx: 3.2 }),
        h('path', { d: 'M12 8V4.9' }),
        h('circle', { cx: 12, cy: 4, r: 1.1, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 9.3, cy: 13, r: 1.05, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 14.7, cy: 13, r: 1.05, fill: 'currentColor', stroke: 'none' }),
        h('path', { d: 'M9.6 16.4h4.8' }),
      );
    }

    function buildSessions(sessionsSnapshot, workspaceSnapshot) {
      const byId = (sessionsSnapshot && sessionsSnapshot.byId) || {};
      const ids = (sessionsSnapshot && sessionsSnapshot.ids) || [];
      const archived = new Set((workspaceSnapshot && workspaceSnapshot.archivedSessionIds) || []);
      const workspaceTitles = new Map();
      for (const workspace of (workspaceSnapshot && workspaceSnapshot.items) || []) {
        for (const sessionId of workspace.sessionIds || []) workspaceTitles.set(sessionId, workspace.title || '');
      }
      const rows = [];
      for (const id of ids) {
        const record = byId[id];
        if (record === undefined || record.blank === true || archived.has(id)) continue;
        rows.push({
          id,
          title: record.title || '',
          workspace: workspaceTitles.get(id) || '',
          preset: (record.projectionValues && record.projectionValues.agentPreset) || '',
          updatedAt: numericTime(record.updatedAt),
        });
      }
      rows.sort((left, right) => right.updatedAt - left.updatedAt);
      return rows;
    }

    function BotDialog(props) {
      const { t, bot, presets, onCancel, onSubmit } = props;
      const editing = bot !== null && bot !== undefined;
      const [form, setForm] = React.useState({
        name: editing ? bot.name : '',
        emoji: editing ? bot.emoji || '🤖' : '🤖',
        persona: editing ? bot.persona || '' : '',
        presetId: editing ? bot.presetId || '' : '',
      });
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const nameRef = React.useRef(null);
      React.useEffect(() => {
        if (nameRef.current !== null) nameRef.current.focus();
      }, []);
      const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

      const submit = async (event) => {
        if (event) event.preventDefault();
        if (form.name.trim().length === 0) return;
        setBusy(true);
        setError('');
        try {
          await onSubmit({
            name: form.name.trim(),
            emoji: form.emoji.trim() || '🤖',
            persona: form.persona,
            presetId: form.presetId,
          });
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
          setBusy(false);
        }
      };

      return h(
        'div',
        {
          className: 'dshb-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onCancel();
          },
        },
        h(
          'form',
          { className: 'dshb-dialog', onSubmit: submit },
          h('h2', { className: 'dshb-dialogTitle' }, editing ? t('formEdit') : t('formCreate')),
          h(
            'div',
            { className: 'dshb-field' },
            h('label', { className: 'dshb-label', htmlFor: 'dshb-name' }, t('formName')),
            h('input', {
              id: 'dshb-name',
              ref: nameRef,
              className: 'dshb-input',
              value: form.name,
              maxLength: 80,
              onChange: (event) => update('name', event.target.value),
              placeholder: '研究员',
            }),
          ),
          h(
            'div',
            { className: 'dshb-field' },
            h('label', { className: 'dshb-label', htmlFor: 'dshb-emoji' }, t('formEmoji')),
            h('input', {
              id: 'dshb-emoji',
              className: 'dshb-input',
              value: form.emoji,
              maxLength: 4,
              style: { width: '96px' },
              onChange: (event) => update('emoji', event.target.value),
            }),
          ),
          h(
            'div',
            { className: 'dshb-field' },
            h('label', { className: 'dshb-label', htmlFor: 'dshb-persona' }, t('formPersona')),
            h('textarea', {
              id: 'dshb-persona',
              className: 'dshb-textarea',
              value: form.persona,
              maxLength: 6000,
              onChange: (event) => update('persona', event.target.value),
              placeholder: '目标：每天整理 AI 新闻\n边界：只做检索与摘要，不改代码\n产出：三条要点 + 链接',
            }),
            h('div', { className: 'dshb-hint' }, t('formPersonaHint')),
          ),
          h(
            'div',
            { className: 'dshb-field' },
            h('label', { className: 'dshb-label', htmlFor: 'dshb-preset' }, t('formPreset')),
            h(
              'select',
              {
                id: 'dshb-preset',
                className: 'dshb-select',
                value: form.presetId,
                disabled: editing,
                onChange: (event) => update('presetId', event.target.value),
              },
              h('option', { value: '' }, t('formPresetNone')),
              (presets || []).map((preset) => h('option', { key: preset.id, value: preset.id }, preset.name)),
            ),
          ),
          error.length > 0 ? h('div', { className: 'dshb-error' }, error) : null,
          h(
            'div',
            { className: 'dshb-dialogActions' },
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: onCancel, disabled: busy }, t('formCancel')),
            h('button', { type: 'submit', className: 'dshb-btn', disabled: busy || form.name.trim().length === 0 }, editing ? t('formSaveAction') : t('formCreateAction')),
          ),
        ),
      );
    }

    function BotsPage(props) {
      const { useSessions, useWorkspaces } = props;
      const t = typeof props.t === 'function' ? props.t : (key) => EN[key] || key;
      const identity = (selector) => selector(undefined);
      const useSessionsHook = typeof useSessions === 'function' ? useSessions : identity;
      const useWorkspacesHook = typeof useWorkspaces === 'function' ? useWorkspaces : identity;
      const sessionsSnapshot = useSessionsHook((snapshot) => snapshot);
      const workspaceSnapshot = useWorkspacesHook((snapshot) => snapshot);

      const [bots, setBots] = React.useState([]);
      const [presets, setPresets] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState('');
      const [query, setQuery] = React.useState('');
      const [dialog, setDialog] = React.useState(null);

      const load = React.useCallback(async () => {
        try {
          const data = await request();
          setBots(Array.isArray(data.bots) ? data.bots : []);
          setPresets(Array.isArray(data.presets) ? data.presets : []);
          setError('');
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        } finally {
          setLoading(false);
        }
      }, []);

      React.useEffect(() => {
        load();
      }, [load]);

      const sessions = React.useMemo(
        () => (sessionsSnapshot ? buildSessions(sessionsSnapshot, workspaceSnapshot) : []),
        [sessionsSnapshot, workspaceSnapshot],
      );
      const botSessionIds = React.useMemo(() => new Set(bots.map((bot) => bot.sessionId).filter(Boolean)), [bots]);
      const otherSessions = sessions.filter((session) => !botSessionIds.has(session.id));

      const needle = query.trim().toLowerCase();
      const match = (fields) => {
        if (needle.length === 0) return true;
        return fields.join(' ').toLowerCase().includes(needle);
      };
      const visibleBots = bots.filter((bot) => match([bot.name, bot.persona, bot.presetId]));
      const visibleSessions = otherSessions.filter((session) => match([session.title, session.workspace, session.preset]));

      const openSession = (sessionId) => {
        if (typeof props.openSession === 'function' && sessionId) props.openSession(sessionId);
      };

      const submit = async (payload) => {
        if (dialog !== null && dialog.id !== undefined) {
          const data = await request({ action: 'update', id: dialog.id, ...payload });
          setBots(Array.isArray(data.bots) ? data.bots : bots);
        } else {
          const data = await request({ action: 'create', ...payload });
          setBots(Array.isArray(data.bots) ? data.bots : bots);
        }
        setDialog(null);
      };

      const remove = async (bot) => {
        if (!window.confirm(t('confirmDelete'))) return;
        try {
          const data = await request({ action: 'delete', id: bot.id });
          setBots(Array.isArray(data.bots) ? data.bots : bots);
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        }
      };

      const renderBot = (bot) => {
        const detail = bot.presetId ? bot.presetId : t('badgeNoPreset');
        return h(
          'div',
          {
            key: bot.id,
            className: 'dshb-card',
            role: 'button',
            tabIndex: 0,
            title: bot.name,
            onClick: () => openSession(bot.sessionId),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openSession(bot.sessionId);
              }
            },
          },
          h('span', { className: 'dshb-avatar', 'aria-hidden': true }, bot.emoji || '🤖'),
          h(
            'span',
            { className: 'dshb-meta' },
            h('span', { className: 'dshb-name' }, bot.name),
            h('span', { className: 'dshb-persona' }, bot.persona && bot.persona.length > 0 ? bot.persona : t('personaEmpty')),
            h('span', { className: 'dshb-badge' }, detail),
          ),
          h(
            'span',
            { className: 'dshb-rowActions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dshb-iconBtn',
                onClick: (event) => {
                  event.stopPropagation();
                  setDialog({ ...bot });
                },
              },
              t('actionEdit'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dshb-iconBtn',
                onClick: (event) => {
                  event.stopPropagation();
                  remove(bot);
                },
              },
              t('actionDelete'),
            ),
          ),
        );
      };

      const renderSession = (session) => {
        const name = session.title.length > 0 ? session.title : t('untitled');
        const parts = [session.workspace, session.preset].filter((part) => part.length > 0);
        return h(
          'button',
          {
            key: session.id,
            type: 'button',
            className: 'dshb-card',
            title: name,
            onClick: () => openSession(session.id),
          },
          h('span', { className: 'dshb-avatar text', style: { background: AVATAR_COLORS[hashOf(session.id) % AVATAR_COLORS.length] }, 'aria-hidden': true }, initials(name, '·')),
          h(
            'span',
            { className: 'dshb-meta' },
            h('span', { className: 'dshb-name' }, name),
            h('span', { className: 'dshb-line' }, parts.join(' · ')),
          ),
          h('span', { className: 'dshb-time' }, timeLabel(session.updatedAt)),
        );
      };

      const total = visibleBots.length + visibleSessions.length;

      return h(
        'div',
        { className: 'dshb-page' },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h(
          'div',
          { className: 'dshb-wrap' },
          h(
            'div',
            { className: 'dshb-head' },
            h(
              'div',
              { className: 'dshb-headmain' },
              h('h1', { className: 'dshb-title' }, t('panel'), h('span', { className: 'dshb-count' }, String(total))),
              h('div', { className: 'dshb-sub' }, t('subtitle')),
            ),
            h(
              'div',
              { className: 'dshb-tools' },
              h('input', {
                className: 'dshb-search',
                type: 'search',
                value: query,
                placeholder: t('search'),
                'aria-label': t('search'),
                onChange: (event) => setQuery(event.target.value),
              }),
              h('button', { className: 'dshb-btn', type: 'button', onClick: () => setDialog({}) }, t('new')),
              h('button', { className: 'dshb-btn quiet', type: 'button', onClick: () => load() }, t('actionReload')),
            ),
          ),
          error.length > 0 ? h('div', { className: 'dshb-error' }, `${t('errorLoad')} ${error}`) : null,
          h(
            'div',
            { className: 'dshb-section' },
            h(
              'div',
              { className: 'dshb-sectionHead' },
              h('h2', { className: 'dshb-sectionTitle' }, `${t('myBots')} · ${visibleBots.length}`),
              h('span', { className: 'dshb-sectionHint' }, t('myBotsHint')),
            ),
            loading
              ? h('div', { className: 'dshb-note' }, t('loading'))
              : visibleBots.length === 0
                ? h(
                    'div',
                    { className: 'dshb-empty' },
                    h('strong', null, t('emptyTitle')),
                    h('div', null, t('emptyBody')),
                  )
                : h('div', { className: 'dshb-grid' }, visibleBots.map(renderBot)),
          ),
          visibleSessions.length > 0
            ? h(
                'div',
                { className: 'dshb-section' },
                h(
                  'div',
                  { className: 'dshb-sectionHead' },
                  h('h2', { className: 'dshb-sectionTitle' }, `${t('allSessions')} · ${visibleSessions.length}`),
                  h('span', { className: 'dshb-sectionHint' }, t('allSessionsHint')),
                ),
                h('div', { className: 'dshb-grid' }, visibleSessions.map(renderSession)),
              )
            : null,
          h('div', { className: 'dshb-note' }, t('note')),
        ),
        dialog === null
          ? null
          : h(BotDialog, {
              t,
              bot: dialog.id === undefined ? null : dialog,
              presets,
              onCancel: () => setDialog(null),
              onSubmit: submit,
            }),
      );
    }

    return {
      inject: ['slots', 'locale', 'layout', 'uiWorkspace'],
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, DICT), 'dsh-bots: dictionaries');
        ctx.slots.inject('main', function* () {
          yield ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
              inject: () => ({
                openSession: (sessionId) => {
                  ctx.uiWorkspace.openSession(sessionId);
                  ctx.layout.selectPanel(null);
                },
              }),
            },
            BotsPage,
          );
        });
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 1,
              label: () => t('panel'),
              locale: NS,
            },
            BotsIcon,
          ),
        );
      },
    };
  },
});
