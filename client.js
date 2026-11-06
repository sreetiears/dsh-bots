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
      subtitle: 'Bots, rooms and sessions as chat contacts',
      search: 'Search',
      new: 'New bot',
      newRoom: 'New room',
      untitled: 'Untitled session',
      emptyTitle: 'No bot conversations yet',
      emptyBody: 'Create a bot and it shows up here with its own workspace and persona.',
      note: 'Bots and rooms are stored on this machine; a bot opens as an ordinary session.',
      myBots: 'My bots',
      myBotsHint: 'Each bot has its own workspace directory and a persona seeded as its first message.',
      rooms: 'Rooms',
      roomsHint: 'A room dispatches its messages to the member bots.',
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
      actionBack: 'Back',
      actionOpen: 'Open room',
      actionSend: 'Send',
      loading: 'Loading…',
      errorLoad: 'Could not load data.',
      errorSave: 'Could not save.',
      confirmDelete: 'Delete this bot? Its session and files stay on disk.',
      confirmDeleteRoom: 'Delete this room? Messages are removed; bot sessions stay.',
      badgeNoPreset: 'default preset',
      personaEmpty: 'No persona yet',
      memory: 'Memory',
      routines: 'Routines',
      memoryTitle: 'Long-term memory',
      memoryHint: 'Stored as memory/<botId>.md and injected into room and routine prompts.',
      memoryEmpty: 'No memory yet. Save notes below, or let the bot summarize itself.',
      memorySave: 'Save memory',
      memoryDistill: 'Let the bot summarize',
      memoryDistilling: 'Asking the bot…',
      memorySavedAt: 'updated',
      routineTitle: 'Scheduled routines',
      routineHint: 'The host prompts this bot on the interval below; lasts until you disable it.',
      routineName: 'Name',
      routinePrompt: 'Instruction',
      routineMinutes: 'Every (minutes)',
      routineAdd: 'Add routine',
      routineEmpty: 'No routines yet',
      routineLastRun: 'last run',
      routineEnable: 'Enabled',
      routineDelete: 'Delete',
      badgeMemory: 'memory',
      badgeRoutines: 'routines',
      roomName: 'Room name',
      roomMembers: 'Member bots',
      roomMembersEmpty: 'No bots yet — create one first.',
      roomPolicy: 'Dispatch policy',
      roomPolicyAll: 'Everyone replies',
      roomPolicyMention: 'Only @mentioned bots',
      roomMaxHops: 'Auto rounds',
      roomMaxHopsHint: 'How many follow-up rounds bots may trigger on each other. 0 disables auto rounds.',
      roomBudget: 'Reply budget',
      roomBudgetHint: 'Max bot replies per user message.',
      roundLabel: 'round',
      waitingReplies: 'Dispatched — waiting for replies…',
      roomCreateAction: 'Create room',
      roomEmpty: 'No rooms yet',
      roomEmptyBody: 'Create a room, pick the bots that belong to it, and start a discussion.',
      roomNoMembers: 'No bots in this room yet.',
      roomComposer: 'Message the room…',
      roomDispatchNote: 'Replies land in each bot session; the transcript keeps user messages and dispatch receipts.',
      roomEmptyTranscript: 'No messages yet. Say something to dispatch it to the members.',
      roomLastEmpty: 'No messages',
      fromUser: 'Me',
      fromSystem: 'System',
      memberCount: 'members',
      policyAllShort: 'all',
      policyMentionShort: 'mention',
      empty: 'Nothing here',
    };
    const ZH = {
      panel: 'Bots',
      subtitle: 'Bot、房间、会话，都当作聊天对象',
      search: '搜索',
      new: '新建 Bot',
      newRoom: '新建房间',
      untitled: '未命名会话',
      emptyTitle: '还没有 Bot',
      emptyBody: '新建一个 Bot，它会带上自己的工作目录和岗位说明书。',
      note: 'Bot 和房间数据都存在本机；点开 Bot 就是普通会话。',
      myBots: '我的 Bots',
      myBotsHint: '每个 Bot 有独立工作目录，岗位说明书会作为会话的第一条消息写入。',
      rooms: '房间',
      roomsHint: '房间里的消息会派发给成员 Bot。',
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
      actionBack: '返回',
      actionOpen: '进入房间',
      actionSend: '发送',
      loading: '加载中…',
      errorLoad: '读取数据失败。',
      errorSave: '保存失败。',
      confirmDelete: '删除这个 Bot？它的会话和文件会保留在磁盘上。',
      confirmDeleteRoom: '删除这个房间？房间记录会删除，Bot 会话保留。',
      badgeNoPreset: '默认预设',
      personaEmpty: '还没写岗位说明书',
      memory: '记忆',
      routines: '例行',
      memoryTitle: '长期记忆',
      memoryHint: '保存为 memory/<botId>.md，并注入到房间和例行任务的提示里。',
      memoryEmpty: '还没有记忆。可以在下面手写，也可以让 Bot 自己整理。',
      memorySave: '保存记忆',
      memoryDistill: '让 Bot 自己整理',
      memoryDistilling: '正在让 Bot 整理…',
      memorySavedAt: '更新于',
      routineTitle: '例行任务',
      routineHint: '宿主会按下面的周期给这个 Bot 发指令，直到你停用。',
      routineName: '名称',
      routinePrompt: '指令',
      routineMinutes: '每（分钟）',
      routineAdd: '添加例行',
      routineEmpty: '还没有例行任务',
      routineLastRun: '上次运行',
      routineEnable: '启用',
      routineDelete: '删除',
      badgeMemory: '记忆',
      badgeRoutines: '例行',
      roomName: '房间名',
      roomMembers: '成员 Bot',
      roomMembersEmpty: '还没有 Bot，先建一个吧。',
      roomPolicy: '派发策略',
      roomPolicyAll: '全员回复',
      roomPolicyMention: '只回被 @ 的',
      roomMaxHops: '自动接续轮数',
      roomMaxHopsHint: 'Bot 之间可以互相接续几轮。0 表示不自动接续。',
      roomBudget: '回复预算',
      roomBudgetHint: '每条用户消息最多允许几条 Bot 回复。',
      roundLabel: '轮',
      waitingReplies: '已派发，等待回复…',
      roomCreateAction: '创建房间',
      roomEmpty: '还没有房间',
      roomEmptyBody: '建一个房间，选好成员 Bot，就可以开聊了。',
      roomNoMembers: '这个房间还没有成员。',
      roomComposer: '对房间说点什么…',
      roomDispatchNote: '回复会落在各自的 Bot 会话里；房间记录保存用户消息和派发回执。',
      roomEmptyTranscript: '还没有消息。发一条，会派发给成员。',
      roomLastEmpty: '还没有消息',
      fromUser: '我',
      fromSystem: '系统',
      memberCount: '位成员',
      policyAllShort: '全员',
      policyMentionShort: '@点名',
      empty: '空空如也',
    };
    const DICT = { en: EN, de: EN, es: EN, fr: EN, ja: EN, pt: EN, ru: EN, zh: ZH };

    const CSS = `
.dshb-page{box-sizing:border-box;height:100%;overflow-y:auto;overflow-x:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:calc(var(--dsh-frame-top-clearance, 48px) + 8px) clamp(20px, 4vw, 48px) 56px;font-family:inherit;font-size:13px;line-height:1.45}
.dshb-wrap{max-width:1040px;margin:0 auto;min-width:0}
.dshb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap;min-width:0}
.dshb-headmain{min-width:0}
.dshb-title{font-size:22px;font-weight:600;line-height:1.25;margin:0;overflow-wrap:anywhere}
.dshb-count{font-size:13px;font-weight:400;color:var(--dsw-alias-label-secondary);margin-left:8px}
.dshb-sub{font-size:13px;color:var(--dsw-alias-label-secondary);margin-top:6px;max-width:680px;overflow-wrap:anywhere}
.dshb-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.dshb-search{height:34px;width:180px;max-width:100%;min-width:0;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 12px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box}
.dshb-search:focus{border-color:var(--dsw-alias-border-l2)}
.dshb-btn{height:34px;padding:0 14px;border-radius:8px;border:none;background:var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary, #111));color:var(--dsw-alias-label-primary-inverted, #fff);font-size:13px;font-family:inherit;font-weight:500;cursor:pointer;white-space:nowrap;max-width:100%}
.dshb-btn:hover{background:var(--dsw-alias-button-primary-hover, var(--dsw-alias-brand-primary, #111))}
.dshb-btn.quiet{background:transparent;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1)}
.dshb-btn.quiet:hover{color:var(--dsw-alias-label-primary);filter:none}
.dshb-btn:disabled{opacity:.55;cursor:default;filter:none}
.dshb-section{margin-top:26px;min-width:0}
.dshb-sectionHead{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;min-width:0}
.dshb-sectionTitle{font-size:14px;font-weight:600;margin:0;overflow-wrap:anywhere}
.dshb-sectionHint{font-size:12px;color:var(--dsw-alias-label-secondary);min-width:0;overflow-wrap:anywhere}
.dshb-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(min(248px, 100%), 1fr));gap:12px;min-width:0}
.dshb-card{display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;color:var(--dsw-alias-label-primary);font:inherit;min-width:0;overflow:hidden;position:relative}
.dshb-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dshb-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dshb-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;flex:none;user-select:none;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);overflow:hidden}
.dshb-avatar.text{font-size:15px;font-weight:600;color:#fff;border:none}
.dshb-meta{min-width:0;flex:1;overflow:hidden}
.dshb-name{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dshb-line{display:block;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-top:3px}
.dshb-persona{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:4px;overflow-wrap:anywhere}
.dshb-badge{display:inline-block;max-width:100%;margin-top:6px;margin-right:6px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}
.dshb-time{font-size:11px;color:var(--dsw-alias-label-secondary);flex:none;align-self:flex-start;margin-top:2px;max-width:56px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshb-rowActions{position:absolute;top:8px;right:8px;display:none;gap:4px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:2px}
.dshb-card:hover .dshb-rowActions,.dshb-card:focus-within .dshb-rowActions{display:flex}
.dshb-iconBtn{border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;font-family:inherit;padding:3px 6px;border-radius:6px;white-space:nowrap}
.dshb-iconBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dshb-empty{margin-top:28px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.7;padding:0 12px;border:1px dashed var(--dsw-alias-border-l1);border-radius:12px;padding:24px 16px}
.dshb-empty strong{display:block;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:500;margin-bottom:6px}
.dshb-note{margin-top:32px;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;overflow-wrap:anywhere}
.dshb-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin-top:8px;overflow-wrap:anywhere}
.dshb-overlay{position:fixed;inset:0;z-index:1200;background:var(--dsw-alias-bg-mask-3, rgba(0,0,0,.55));display:flex;align-items:flex-start;justify-content:center;padding:8vh 16px 24px;overflow:auto}
.dshb-dialog{width:min(580px, 100%);box-sizing:border-box;background:var(--dsw-alias-bg-layer-1, #ffffff);color:var(--dsw-alias-label-primary, #0f1115);border:1px solid var(--dsw-alias-border-l2, #d9d9dd);border-radius:14px;padding:20px;box-shadow:0 18px 48px rgba(0,0,0,.28)}
.dshb-dialogTitle{font-size:16px;font-weight:600;margin:0 0 14px;color:var(--dsw-alias-label-primary, #0f1115)}
.dshb-field{margin-bottom:12px;min-width:0}
.dshb-label{display:block;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary, #61666b);margin-bottom:5px}
.dshb-input,.dshb-textarea,.dshb-select{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2, #d9d9dd);border-radius:8px;background:var(--dsw-alias-bg-base, #ffffff);color:var(--dsw-alias-label-primary, #0f1115);font-size:13px;font-family:inherit;padding:8px 10px;outline:none;min-width:0}
.dshb-textarea{resize:vertical;min-height:96px;line-height:1.5}
.dshb-input::placeholder,.dshb-textarea::placeholder{color:var(--dsw-alias-label-secondary, #8f9499);opacity:1}
.dshb-input:focus,.dshb-textarea:focus,.dshb-select:focus{border-color:var(--dsw-alias-brand-primary, #2f6fed)}
.dshb-select option{background:var(--dsw-alias-bg-layer-1, #ffffff);color:var(--dsw-alias-label-primary, #0f1115)}
.dshb-hint{font-size:11px;color:var(--dsw-alias-label-secondary, #61666b);margin-top:4px;overflow-wrap:anywhere}
.dshb-dialogActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}
.dshb-checks{display:flex;flex-direction:column;gap:6px;max-height:180px;overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;background:var(--dsw-alias-bg-base)}
.dshb-check{display:flex;align-items:center;gap:8px;font-size:13px;min-width:0}
.dshb-check span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshb-check input{accent-color:var(--dsw-alias-brand-primary, #2f6fed);margin:0}
.dshb-roomHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;min-width:0}
.dshb-roomTitle{font-size:20px;font-weight:600;margin:0;overflow-wrap:anywhere}
.dshb-transcript{display:flex;flex-direction:column;gap:10px;margin-top:16px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);min-height:180px;max-height:52vh;overflow-y:auto}
.dshb-msg{display:flex;flex-direction:column;gap:3px;max-width:min(720px, 92%);min-width:0}
.dshb-msg.user{align-self:flex-end;align-items:flex-end}
.dshb-msg.system{align-self:center;align-items:center;max-width:100%}
.dshb-msgWho{font-size:11px;color:var(--dsw-alias-label-secondary);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshb-bubble{padding:8px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;box-sizing:border-box}
.dshb-msg.user .dshb-bubble{background:var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary, #111));color:var(--dsw-alias-label-primary-inverted, #fff)}
.dshb-msg.system .dshb-bubble{background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;padding:2px 8px}
.dshb-composerRow{display:flex;gap:8px;align-items:flex-end;margin-top:12px;min-width:0}
.dshb-composerRow .dshb-textarea{min-height:56px;flex:1}
.dshb-roomMeta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px}
.dshb-fieldGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;min-width:0}
.dshb-waiting{margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
@media (width <= 640px){.dshb-search{width:100%}.dshb-tools{width:100%}.dshb-tools .dshb-btn{flex:1}.dshb-fieldGrid{grid-template-columns:1fr}}
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

    function initials(value, fallback) {
      const text = String(value || '').trim();
      if (text.length === 0) return fallback;
      return Array.from(text)[0].toUpperCase();
    }

    function darkTheme() {
      try {
        return document.documentElement.hasAttribute('data-ds-dark-theme') || document.body.hasAttribute('data-ds-dark-theme');
      } catch {
        return false;
      }
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

    function Field(props) {
      return h(
        'div',
        { className: 'dshb-field' },
        h('label', { className: 'dshb-label', htmlFor: props.id }, props.label),
        props.children,
        props.hint ? h('div', { className: 'dshb-hint' }, props.hint) : null,
      );
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
          await onSubmit({ name: form.name.trim(), emoji: form.emoji.trim() || '🤖', persona: form.persona, presetId: form.presetId });
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
          { className: 'dshb-dialog', style: { colorScheme: darkTheme() ? 'dark' : 'light' }, onSubmit: submit },
          h('h2', { className: 'dshb-dialogTitle' }, editing ? t('formEdit') : t('formCreate')),
          h(
            Field,
            { id: 'dshb-name', label: t('formName') },
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
            Field,
            { id: 'dshb-emoji', label: t('formEmoji') },
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
            Field,
            { id: 'dshb-persona', label: t('formPersona'), hint: t('formPersonaHint') },
            h('textarea', {
              id: 'dshb-persona',
              className: 'dshb-textarea',
              value: form.persona,
              maxLength: 6000,
              onChange: (event) => update('persona', event.target.value),
              placeholder: '目标：每天整理 AI 新闻\n边界：只做检索与摘要，不改代码\n产出：三条要点 + 链接',
            }),
          ),
          h(
            Field,
            { id: 'dshb-preset', label: t('formPreset') },
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

    function MemoryDialog(props) {
      const { t, bot, onCancel, onSave, onDistill } = props;
      const [value, setValue] = React.useState(bot.memory || '');
      const [busy, setBusy] = React.useState(false);
      const [distilling, setDistilling] = React.useState(false);
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        setValue(bot.memory || '');
      }, [bot.memory]);

      const save = async () => {
        setBusy(true);
        setError('');
        try {
          await onSave(bot.id, value);
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
          setBusy(false);
        }
      };
      const distill = async () => {
        setDistilling(true);
        setError('');
        try {
          await onDistill(bot.id);
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        } finally {
          setDistilling(false);
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
          'div',
          { className: 'dshb-dialog', style: { colorScheme: darkTheme() ? 'dark' : 'light' } },
          h('h2', { className: 'dshb-dialogTitle' }, `${bot.emoji || '🤖'} ${bot.name} · ${t('memoryTitle')}`),
          h(
            'div',
            { className: 'dshb-field' },
            h('textarea', {
              className: 'dshb-textarea',
              style: { minHeight: '220px' },
              value,
              placeholder: t('memoryEmpty'),
              onChange: (event) => setValue(event.target.value),
            }),
            h('div', { className: 'dshb-hint' }, t('memoryHint')),
            bot.memoryAt ? h('div', { className: 'dshb-hint' }, `${t('memorySavedAt')} ${timeLabel(bot.memoryAt)}`) : null,
          ),
          error.length > 0 ? h('div', { className: 'dshb-error' }, error) : null,
          h(
            'div',
            { className: 'dshb-dialogActions' },
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: onCancel, disabled: busy || distilling }, t('formCancel')),
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: distill, disabled: busy || distilling }, distilling ? t('memoryDistilling') : t('memoryDistill')),
            h('button', { type: 'button', className: 'dshb-btn', onClick: save, disabled: busy || distilling }, t('memorySave')),
          ),
        ),
      );
    }

    function RoutineDialog(props) {
      const { t, bot, onCancel, onAdd, onUpdate, onDelete } = props;
      const [form, setForm] = React.useState({ name: '', prompt: '', minutes: '60' });
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const routines = bot.routines || [];
      const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

      const add = async () => {
        if (form.prompt.trim().length === 0) return;
        setBusy(true);
        setError('');
        try {
          await onAdd(bot.id, { name: form.name.trim(), prompt: form.prompt.trim(), minutes: Number(form.minutes) });
          setForm({ name: '', prompt: '', minutes: form.minutes });
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        } finally {
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
          'div',
          { className: 'dshb-dialog', style: { colorScheme: darkTheme() ? 'dark' : 'light' } },
          h('h2', { className: 'dshb-dialogTitle' }, `${bot.emoji || '🤖'} ${bot.name} · ${t('routineTitle')}`),
          routines.length === 0
            ? h('div', { className: 'dshb-hint' }, t('routineEmpty'))
            : h(
                'div',
                { className: 'dshb-checks', style: { maxHeight: '200px' } },
                routines.map((routine) =>
                  h(
                    'div',
                    { key: routine.id, className: 'dshb-check', style: { justifyContent: 'space-between' } },
                    h(
                      'span',
                      { style: { flex: 1 } },
                      `${routine.name} · ${routine.minutes}min${routine.enabled === false ? ' (off)' : ''}`,
                    ),
                    h('button', { type: 'button', className: 'dshb-iconBtn', onClick: () => onUpdate(bot.id, routine.id, { enabled: routine.enabled === false }) }, routine.enabled === false ? '开' : '停'),
                    h('button', { type: 'button', className: 'dshb-iconBtn', onClick: () => onDelete(bot.id, routine.id) }, t('routineDelete')),
                  ),
                ),
              ),
          h(
            'div',
            { className: 'dshb-fieldGrid' },
            h(
              Field,
              { id: 'dshb-rt-name', label: t('routineName') },
              h('input', {
                id: 'dshb-rt-name',
                className: 'dshb-input',
                value: form.name,
                maxLength: 80,
                onChange: (event) => update('name', event.target.value),
                placeholder: '每日选题',
              }),
            ),
            h(
              Field,
              { id: 'dshb-rt-min', label: t('routineMinutes') },
              h('input', {
                id: 'dshb-rt-min',
                className: 'dshb-input',
                type: 'number',
                min: 1,
                max: 10080,
                value: form.minutes,
                onChange: (event) => update('minutes', event.target.value),
              }),
            ),
          ),
          h(
            Field,
            { id: 'dshb-rt-prompt', label: t('routinePrompt'), hint: t('routineHint') },
            h('textarea', {
              id: 'dshb-rt-prompt',
              className: 'dshb-textarea',
              value: form.prompt,
              onChange: (event) => update('prompt', event.target.value),
              placeholder: '整理今天的待办，列出三条最重要的。',
            }),
          ),
          error.length > 0 ? h('div', { className: 'dshb-error' }, error) : null,
          h(
            'div',
            { className: 'dshb-dialogActions' },
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: onCancel }, t('formCancel')),
            h('button', { type: 'button', className: 'dshb-btn', onClick: add, disabled: busy || form.prompt.trim().length === 0 }, t('routineAdd')),
          ),
        ),
      );
    }

    function RoomDialog(props) {
      const { t, bots, room, onCancel, onSubmit } = props;
      const editing = room !== null && room !== undefined;
      const [form, setForm] = React.useState({
        name: editing ? room.name : '',
        emoji: editing ? room.emoji || '💬' : '💬',
        memberIds: editing ? [...(room.memberIds || [])] : [],
        policy: editing ? room.policy || 'all' : 'all',
        maxHops: String(editing ? room.maxHops ?? 2 : 2),
        budget: String(editing ? room.budget ?? 8 : 8),
      });
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
      const toggleMember = (id) => {
        const next = form.memberIds.includes(id) ? form.memberIds.filter((item) => item !== id) : [...form.memberIds, id];
        update('memberIds', next);
      };

      const submit = async (event) => {
        if (event) event.preventDefault();
        if (form.name.trim().length === 0) return;
        setBusy(true);
        setError('');
        try {
          await onSubmit({
            name: form.name.trim(),
            emoji: form.emoji.trim() || '💬',
            memberIds: form.memberIds,
            policy: form.policy,
            maxHops: Number(form.maxHops),
            budget: Number(form.budget),
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
          { className: 'dshb-dialog', style: { colorScheme: darkTheme() ? 'dark' : 'light' }, onSubmit: submit },
          h('h2', { className: 'dshb-dialogTitle' }, t('newRoom')),
          h(
            Field,
            { id: 'dshb-room-name', label: t('roomName') },
            h('input', {
              id: 'dshb-room-name',
              className: 'dshb-input',
              value: form.name,
              maxLength: 80,
              onChange: (event) => update('name', event.target.value),
              placeholder: '选题会',
            }),
          ),
          h(
            Field,
            { id: 'dshb-room-emoji', label: t('formEmoji') },
            h('input', {
              id: 'dshb-room-emoji',
              className: 'dshb-input',
              value: form.emoji,
              maxLength: 4,
              style: { width: '96px' },
              onChange: (event) => update('emoji', event.target.value),
            }),
          ),
          h(
            Field,
            { id: 'dshb-room-members', label: t('roomMembers') },
            (bots || []).length === 0
              ? h('div', { className: 'dshb-hint' }, t('roomMembersEmpty'))
              : h(
                  'div',
                  { className: 'dshb-checks' },
                  bots.map((bot) =>
                    h(
                      'label',
                      { key: bot.id, className: 'dshb-check' },
                      h('input', {
                        type: 'checkbox',
                        checked: form.memberIds.includes(bot.id),
                        onChange: () => toggleMember(bot.id),
                      }),
                      h('span', null, `${bot.emoji || '🤖'} ${bot.name}`),
                    ),
                  ),
                ),
          ),
          h(
            Field,
            { id: 'dshb-room-policy', label: t('roomPolicy') },
            h(
              'select',
              {
                id: 'dshb-room-policy',
                className: 'dshb-select',
                value: form.policy,
                onChange: (event) => update('policy', event.target.value),
              },
              h('option', { value: 'all' }, t('roomPolicyAll')),
              h('option', { value: 'mention' }, t('roomPolicyMention')),
            ),
          ),
          h(
            'div',
            { className: 'dshb-fieldGrid' },
            h(
              Field,
              { id: 'dshb-room-hops', label: t('roomMaxHops'), hint: t('roomMaxHopsHint') },
              h('input', {
                id: 'dshb-room-hops',
                className: 'dshb-input',
                type: 'number',
                min: 0,
                max: 5,
                value: form.maxHops,
                onChange: (event) => update('maxHops', event.target.value),
              }),
            ),
            h(
              Field,
              { id: 'dshb-room-budget', label: t('roomBudget'), hint: t('roomBudgetHint') },
              h('input', {
                id: 'dshb-room-budget',
                className: 'dshb-input',
                type: 'number',
                min: 1,
                max: 30,
                value: form.budget,
                onChange: (event) => update('budget', event.target.value),
              }),
            ),
          ),
          error.length > 0 ? h('div', { className: 'dshb-error' }, error) : null,
          h(
            'div',
            { className: 'dshb-dialogActions' },
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: onCancel, disabled: busy }, t('formCancel')),
            h('button', { type: 'submit', className: 'dshb-btn', disabled: busy || form.name.trim().length === 0 }, t('roomCreateAction')),
          ),
        ),
      );
    }

    function RoomView(props) {
      const { t, room, bots, onBack, onPost, onDelete, onRefresh } = props;
      const [draft, setDraft] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [waiting, setWaiting] = React.useState(false);
      const [error, setError] = React.useState('');
      const members = (bots || []).filter((bot) => room.memberIds.includes(bot.id));
      const names = new Map((bots || []).map((bot) => [bot.id, bot]));
      const transcripts = room.transcript.length;

      React.useEffect(() => {
        if (typeof onRefresh !== 'function') return undefined;
        const timer = window.setInterval(() => {
          onRefresh().catch(() => {});
        }, 3000);
        return () => window.clearInterval(timer);
      }, [onRefresh]);

      React.useEffect(() => {
        if (!waiting) return undefined;
        const timer = window.setTimeout(() => setWaiting(false), 45000);
        return () => window.clearTimeout(timer);
      }, [waiting]);

      React.useEffect(() => {
        if (!waiting) return;
        const last = room.transcript[room.transcript.length - 1];
        if (last !== undefined && last.from !== 'user' && last.from !== 'system') setWaiting(false);
      }, [transcripts, waiting, room.transcript]);

      const send = async () => {
        const value = draft.trim();
        if (value.length === 0 || busy) return;
        setBusy(true);
        setError('');
        try {
          await onPost(room.id, value);
          setDraft('');
          setWaiting(true);
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        } finally {
          setBusy(false);
        }
      };
      const lastUpdated = room.transcript.length > 0 ? room.transcript[room.transcript.length - 1].at : room.updatedAt;
      return h(
        'div',
        { className: 'dshb-page', style: { colorScheme: darkTheme() ? 'dark' : 'light' } },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h(
          'div',
          { className: 'dshb-wrap' },
          h(
            'div',
            { className: 'dshb-tools' },
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: onBack }, t('actionBack')),
            h('button', { type: 'button', className: 'dshb-btn quiet', onClick: () => onDelete(room) }, t('actionDelete')),
          ),
          h(
            'div',
            { className: 'dshb-roomHead' },
            h('h1', { className: 'dshb-roomTitle' }, `${room.emoji || '💬'} ${room.name}`),
            h('span', { className: 'dshb-count' }, timeLabel(lastUpdated)),
          ),
          h(
            'div',
            { className: 'dshb-roomMeta' },
            members.length === 0
              ? h('span', { className: 'dshb-badge' }, t('roomNoMembers'))
              : members.map((bot) => h('span', { key: bot.id, className: 'dshb-badge' }, `${bot.emoji || '🤖'} ${bot.name}`)),
            h('span', { className: 'dshb-badge' }, `${members.length} ${t('memberCount')}`),
            h('span', { className: 'dshb-badge' }, room.policy === 'mention' ? t('policyMentionShort') : t('policyAllShort')),
            h('span', { className: 'dshb-badge' }, `${t('roomMaxHops')} ${room.maxHops ?? 0}`),
            h('span', { className: 'dshb-badge' }, `${t('roomBudget')} ${room.budget ?? 8}`),
            room.live !== null && room.live !== undefined
              ? h('span', { className: 'dshb-badge' }, `${t('roundLabel')} ${room.live.hop} · ${room.live.used}/${room.budget ?? 8}`)
              : null,
          ),
          h(
            'div',
            { className: 'dshb-transcript' },
            room.transcript.length === 0
              ? h('div', { className: 'dshb-empty' }, t('roomEmptyTranscript'))
              : room.transcript.map((entry) => {
                  const isUser = entry.from === 'user';
                  const isSystem = entry.from === 'system';
                  const speaker = isUser ? t('fromUser') : isSystem ? t('fromSystem') : (names.get(entry.from) || {}).name || entry.from;
                  const emoji = isSystem ? '' : isUser ? '' : (names.get(entry.from) || {}).emoji || '🤖';
                  const hopTag = typeof entry.hop === 'number' && entry.hop > 0 ? ` · ${t('roundLabel')} ${entry.hop}` : '';
                  return h(
                    'div',
                    { key: entry.id, className: `dshb-msg${isUser ? ' user' : isSystem ? ' system' : ''}` },
                    h('span', { className: 'dshb-msgWho' }, `${emoji}${speaker}${hopTag}`),
                    h('div', { className: 'dshb-bubble' }, entry.text),
                  );
                }),
          ),
          waiting ? h('div', { className: 'dshb-waiting' }, t('waitingReplies')) : null,
          error.length > 0 ? h('div', { className: 'dshb-error' }, error) : null,
          h(
            'div',
            { className: 'dshb-composerRow' },
            h('textarea', {
              className: 'dshb-textarea',
              value: draft,
              placeholder: t('roomComposer'),
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) send();
              },
            }),
            h('button', { type: 'button', className: 'dshb-btn', disabled: busy || draft.trim().length === 0, onClick: send }, t('actionSend')),
          ),
          h('div', { className: 'dshb-note' }, t('roomDispatchNote')),
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
      const [rooms, setRooms] = React.useState([]);
      const [presets, setPresets] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState('');
      const [query, setQuery] = React.useState('');
      const [botDialog, setBotDialog] = React.useState(null);
      const [roomDialog, setRoomDialog] = React.useState(null);
      const [activeRoomId, setActiveRoomId] = React.useState(null);
      const [memoryBotId, setMemoryBotId] = React.useState(null);
      const [routineBotId, setRoutineBotId] = React.useState(null);

      const absorb = (data) => {
        if (Array.isArray(data.bots)) setBots(data.bots);
        if (Array.isArray(data.rooms)) setRooms(data.rooms);
        if (Array.isArray(data.presets)) setPresets(data.presets);
      };

      const load = React.useCallback(async () => {
        try {
          absorb(await request());
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
      const match = (fields) => needle.length === 0 || fields.join(' ').toLowerCase().includes(needle);
      const visibleBots = bots.filter((bot) => match([bot.name, bot.persona, bot.presetId]));
      const visibleRooms = rooms.filter((room) => {
        const memberNames = room.memberIds.map((id) => (bots.find((bot) => bot.id === id) || {}).name || '');
        return match([room.name, ...memberNames]);
      });
      const visibleSessions = otherSessions.filter((session) => match([session.title, session.workspace, session.preset]));

      const openSession = (sessionId) => {
        if (typeof props.openSession === 'function' && sessionId) props.openSession(sessionId);
      };

      const submitBot = async (payload) => {
        const data = botDialog !== null && botDialog.id !== undefined
          ? await request({ action: 'update', id: botDialog.id, ...payload })
          : await request({ action: 'create', ...payload });
        absorb(data);
        setBotDialog(null);
      };

      const removeBot = async (bot) => {
        if (!window.confirm(t('confirmDelete'))) return;
        try {
          absorb(await request({ action: 'delete', id: bot.id }));
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        }
      };

      const saveMemory = async (botId, memory) => {
        absorb(await request({ action: 'botMemoryUpdate', botId, memory }));
        setMemoryBotId(null);
      };

      const distillMemory = async (botId) => {
        absorb(await request({ action: 'botMemoryDistill', botId }));
        window.setTimeout(() => {
          load().catch(() => {});
        }, 9000);
      };

      const addRoutine = async (botId, payload) => {
        absorb(await request({ action: 'routineAdd', botId, ...payload }));
      };

      const updateRoutine = async (botId, routineId, patch) => {
        absorb(await request({ action: 'routineUpdate', botId, routineId, ...patch }));
      };

      const deleteRoutine = async (botId, routineId) => {
        absorb(await request({ action: 'routineDelete', botId, routineId }));
      };

      const submitRoom = async (payload) => {
        const data = roomDialog !== null && roomDialog.id !== undefined
          ? await request({ action: 'roomUpdate', id: roomDialog.id, ...payload })
          : await request({ action: 'roomCreate', ...payload });
        absorb(data);
        setRoomDialog(null);
      };

      const removeRoom = async (room) => {
        if (!window.confirm(t('confirmDeleteRoom'))) return;
        try {
          absorb(await request({ action: 'roomDelete', id: room.id }));
          if (activeRoomId === room.id) setActiveRoomId(null);
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure));
        }
      };

      const postToRoom = async (roomId, text) => {
        const data = await request({ action: 'roomPost', roomId, text });
        absorb(data);
        if (data.failures && data.failures.length > 0) setError(data.failures.join('; '));
      };

      const refreshRooms = async () => {
        const data = await request();
        absorb(data);
      };

      if (activeRoomId !== null) {
        const room = rooms.find((candidate) => candidate.id === activeRoomId);
        if (room === undefined) {
          setActiveRoomId(null);
        } else {
          return h(RoomView, {
            t,
            room,
            bots,
            onBack: () => setActiveRoomId(null),
            onPost: postToRoom,
            onDelete: removeRoom,
            onRefresh: refreshRooms,
          });
        }
      }

      const renderBot = (bot) => h(
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
          h('span', { className: 'dshb-badge' }, bot.presetId ? bot.presetId : t('badgeNoPreset')),
          bot.memory && bot.memory.trim().length > 0 ? h('span', { className: 'dshb-badge' }, t('badgeMemory')) : null,
          bot.routines && bot.routines.length > 0 ? h('span', { className: 'dshb-badge' }, `${bot.routines.length} ${t('badgeRoutines')}`) : null,
        ),
        h(
          'span',
          { className: 'dshb-rowActions' },
          h('button', { type: 'button', className: 'dshb-iconBtn', onClick: (event) => { event.stopPropagation(); setMemoryBotId(bot.id); } }, t('memory')),
          h('button', { type: 'button', className: 'dshb-iconBtn', onClick: (event) => { event.stopPropagation(); setRoutineBotId(bot.id); } }, t('routines')),
          h('button', { type: 'button', className: 'dshb-iconBtn', onClick: (event) => { event.stopPropagation(); setBotDialog({ ...bot }); } }, t('actionEdit')),
          h('button', { type: 'button', className: 'dshb-iconBtn', onClick: (event) => { event.stopPropagation(); removeBot(bot); } }, t('actionDelete')),
        ),
      );

      const renderRoom = (room) => {
        const members = room.memberIds.map((id) => (bots.find((bot) => bot.id === id) || {}).name || '').filter((name) => name.length > 0);
        const last = room.transcript.length > 0 ? room.transcript[room.transcript.length - 1] : undefined;
        return h(
          'div',
          {
            key: room.id,
            className: 'dshb-card',
            role: 'button',
            tabIndex: 0,
            title: room.name,
            onClick: () => setActiveRoomId(room.id),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveRoomId(room.id);
              }
            },
          },
          h('span', { className: 'dshb-avatar', 'aria-hidden': true }, room.emoji || '💬'),
          h(
            'span',
            { className: 'dshb-meta' },
            h('span', { className: 'dshb-name' }, room.name),
            h('span', { className: 'dshb-line' }, last === undefined ? t('roomLastEmpty') : last.text),
            h('span', { className: 'dshb-badge' }, `${members.length} ${t('memberCount')}`),
            h('span', { className: 'dshb-badge' }, room.policy === 'mention' ? t('policyMentionShort') : t('policyAllShort')),
          ),
          h(
            'span',
            { className: 'dshb-rowActions' },
            h('button', { type: 'button', className: 'dshb-iconBtn', onClick: (event) => { event.stopPropagation(); setRoomDialog({ ...room }); } }, t('actionEdit')),
            h('button', { type: 'button', className: 'dshb-iconBtn', onClick: (event) => { event.stopPropagation(); removeRoom(room); } }, t('actionDelete')),
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

      const total = visibleBots.length + visibleRooms.length + visibleSessions.length;

      return h(
        'div',
        { className: 'dshb-page', style: { colorScheme: darkTheme() ? 'dark' : 'light' } },
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
              h('button', { className: 'dshb-btn', type: 'button', onClick: () => setBotDialog({}) }, t('new')),
              h('button', { className: 'dshb-btn', type: 'button', onClick: () => setRoomDialog({}) }, t('newRoom')),
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
                ? h('div', { className: 'dshb-empty' }, h('strong', null, t('emptyTitle')), h('div', null, t('emptyBody')))
                : h('div', { className: 'dshb-grid' }, visibleBots.map(renderBot)),
          ),
          h(
            'div',
            { className: 'dshb-section' },
            h(
              'div',
              { className: 'dshb-sectionHead' },
              h('h2', { className: 'dshb-sectionTitle' }, `${t('rooms')} · ${visibleRooms.length}`),
              h('span', { className: 'dshb-sectionHint' }, t('roomsHint')),
            ),
            visibleRooms.length === 0
              ? h('div', { className: 'dshb-empty' }, h('strong', null, t('roomEmpty')), h('div', null, t('roomEmptyBody')))
              : h('div', { className: 'dshb-grid' }, visibleRooms.map(renderRoom)),
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
        botDialog === null
          ? null
          : h(BotDialog, {
              t,
              bot: botDialog.id === undefined ? null : botDialog,
              presets,
              onCancel: () => setBotDialog(null),
              onSubmit: submitBot,
            }),
        roomDialog === null
          ? null
          : h(RoomDialog, {
              t,
              bots,
              room: roomDialog.id === undefined ? null : roomDialog,
              onCancel: () => setRoomDialog(null),
              onSubmit: submitRoom,
            }),
        memoryBotId === null
          ? null
          : (() => {
              const bot = bots.find((candidate) => candidate.id === memoryBotId);
              if (bot === undefined) return null;
              return h(MemoryDialog, {
                t,
                bot,
                onCancel: () => setMemoryBotId(null),
                onSave: saveMemory,
                onDistill: distillMemory,
              });
            })(),
        routineBotId === null
          ? null
          : (() => {
              const bot = bots.find((candidate) => candidate.id === routineBotId);
              if (bot === undefined) return null;
              return h(RoutineDialog, {
                t,
                bot,
                onCancel: () => setRoutineBotId(null),
                onAdd: addRoutine,
                onUpdate: updateRoutine,
                onDelete: deleteRoutine,
              });
            })(),
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
