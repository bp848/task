import React, { useState } from 'react';

interface TriggerConfig {
  timing: string;
  timeBefore: number;
  timeUnit: string;
  eventTypes: string[];
  applyToFuture: boolean;
}

interface ActionConfig {
  id: string;
  type: string;
  senderName: string;
  template: string;
  subject: string;
  body: string;
  includeCalendar: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  trigger: TriggerConfig;
  actions: ActionConfig[];
  lastRun?: string;
  runs: number;
}

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: 'wf1',
    name: 'Gmail → タスク自動変換',
    description: '受信メールを自動的にタスクとして登録',
    active: true,
    trigger: { timing: 'on_receive', timeBefore: 0, timeUnit: '分', eventTypes: ['INBOX'], applyToFuture: true },
    actions: [
      { id: 'a1', type: 'create_task', senderName: 'ZenWork', template: 'task_from_email', subject: '{送信者} - {件名}', body: '{メール本文の先頭200文字}\n\n元メール: {メールID}', includeCalendar: false },
    ],
    lastRun: '2分前',
    runs: 47,
  },
  {
    id: 'wf2',
    name: '日報リマインダー',
    description: 'タスク完了状況から日報メールを自動生成・送信',
    active: true,
    trigger: { timing: 'scheduled', timeBefore: 18, timeUnit: '時', eventTypes: [], applyToFuture: false },
    actions: [
      { id: 'a1', type: 'send_email', senderName: 'ZenWork', template: 'reminder', subject: 'Reminder: {イベントの名前} - {イベントの日付_ddd, MMM D, YYYY h:mma}', body: 'Hi {出席者の名前},\n\nThis is a reminder about your upcoming event.\n\nEvent: {イベントの名前}\nDate & time: {イベントの日付_ddd, MMM D, YYYY h:mma} - {イベントの終了時刻} ({タイムゾーン})\nAttendees: You & {主催者名}', includeCalendar: true },
    ],
    lastRun: '昨日 18:00',
    runs: 23,
  },
  {
    id: 'wf3',
    name: 'カレンダー同期通知',
    description: 'Google Calendarの新規イベントをSlack通知',
    active: false,
    trigger: { timing: 'before_event', timeBefore: 24, timeUnit: '時間', eventTypes: [], applyToFuture: true },
    actions: [
      { id: 'a1', type: 'send_email', senderName: 'Cal.com', template: 'reminder', subject: '{イベント名} のリマインダー', body: '{出席者名}さん\n\n明日のイベントのお知らせです。', includeCalendar: false },
    ],
    runs: 0,
  },
];

const TIMING_OPTIONS = [
  { value: 'before_event', label: 'イベント開始前に' },
  { value: 'after_event', label: 'イベント終了後に' },
  { value: 'on_receive', label: '受信時に' },
  { value: 'scheduled', label: '毎日スケジュール' },
  { value: 'on_cancel', label: 'キャンセル時に' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: '出席者にメールを送る' },
  { value: 'create_task', label: 'タスクを作成する' },
  { value: 'send_slack', label: 'Slackに通知する' },
  { value: 'webhook', label: 'Webhookを送信する' },
  { value: 'ai_summary', label: 'AI要約を生成する' },
];

const TEMPLATE_OPTIONS = [
  { value: 'reminder', label: 'リマインダー' },
  { value: 'confirmation', label: '確認メール' },
  { value: 'followup', label: 'フォローアップ' },
  { value: 'custom', label: 'カスタム' },
  { value: 'task_from_email', label: 'メール→タスク変換' },
];

const VARIABLES = [
  '{イベントの名前}', '{イベントの日付_ddd, MMM D, YYYY h:mma}', '{イベントの終了時刻}',
  '{タイムゾーン}', '{出席者の名前}', '{主催者名}', '{送信者}', '{件名}', '{メール本文の先頭200文字}',
];

const NODE_INTEGRATIONS = [
  { name: 'Gmail', category: 'Google', description: 'メールの送受信・監視', color: '#EA4335' },
  { name: 'Google Calendar', category: 'Google', description: 'イベントの作成・同期', color: '#4285F4' },
  { name: 'Google Sheets', category: 'Google', description: 'スプレッドシートの読み書き', color: '#34A853' },
  { name: 'Slack', category: 'Communication', description: 'チャンネルへの通知・メッセージ送信', color: '#4A154B' },
  { name: 'Supabase', category: 'Database', description: 'データベースのCRUD操作', color: '#3ECF8E' },
  { name: 'Gemini AI', category: 'AI', description: 'テキスト要約・分類・生成', color: '#FBBC04' },
  { name: 'Webhook', category: 'Developer', description: '外部APIへのHTTPリクエスト', color: '#6366F1' },
  { name: 'LINE Notify', category: 'Communication', description: 'LINEグループへの通知', color: '#06C755' },
];

const WorkflowsView: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>(SAMPLE_WORKFLOWS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showVarMenu, setShowVarMenu] = useState<string | null>(null);

  const selected = workflows.find(w => w.id === selectedId);

  const toggleWorkflow = (id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  const updateTrigger = (id: string, updates: Partial<TriggerConfig>) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, trigger: { ...w.trigger, ...updates } } : w));
  };

  const updateAction = (wfId: string, actionId: string, updates: Partial<ActionConfig>) => {
    setWorkflows(prev => prev.map(w =>
      w.id === wfId
        ? { ...w, actions: w.actions.map(a => a.id === actionId ? { ...a, ...updates } : a) }
        : w
    ));
  };

  const removeAction = (wfId: string, actionId: string) => {
    setWorkflows(prev => prev.map(w =>
      w.id === wfId ? { ...w, actions: w.actions.filter(a => a.id !== actionId) } : w
    ));
  };

  const addAction = (wfId: string) => {
    const newAction: ActionConfig = {
      id: `a${Date.now()}`, type: 'send_email', senderName: 'ZenWork',
      template: 'reminder', subject: '', body: '', includeCalendar: false,
    };
    setWorkflows(prev => prev.map(w =>
      w.id === wfId ? { ...w, actions: [...w.actions, newAction] } : w
    ));
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left sidebar */}
      <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">ワークフロー</h2>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="フィルタ..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-gray-50" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {workflows.map(wf => (
            <button
              key={wf.id}
              onClick={() => { setSelectedId(wf.id); setShowIntegrations(false); }}
              className={`w-full text-left p-3 rounded-lg transition-all ${selectedId === wf.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 truncate">{wf.name}</span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? '' : 'bg-gray-300'}`} style={wf.active ? { backgroundColor: '#0D9488' } : {}} />
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">{wf.description}</p>
              {wf.lastRun && <p className="text-xs text-gray-300 mt-1">最終実行: {wf.lastRun}</p>}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => { setShowIntegrations(true); setSelectedId(null); }}
            className={`sidebar-item w-full ${showIntegrations ? 'sidebar-item-active' : ''}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>連携アプリ</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-400">ワークフロー /</span>
                <span className="text-sm font-bold text-gray-800">{selected.name}</span>
                <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-all" title="削除">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => toggleWorkflow(selected.id)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${selected.active ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  style={selected.active ? { backgroundColor: '#0D9488' } : {}}
                >
                  保存
                </button>
              </div>
            </div>

            {/* Form content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto py-8 px-6 space-y-6">
                {/* TRIGGER */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm font-bold text-gray-700">トリガー</span>
                  </div>
                  <div className="p-5 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">日時</label>
                      <select
                        value={selected.trigger.timing}
                        onChange={e => updateTrigger(selected.id, { timing: e.target.value })}
                        className="input-base"
                      >
                        {TIMING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {(selected.trigger.timing === 'before_event' || selected.trigger.timing === 'scheduled') && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          {selected.trigger.timing === 'before_event' ? 'イベント開始までにどのくらいありますか？' : '実行時刻（24h）'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={selected.trigger.timeBefore}
                            onChange={e => updateTrigger(selected.id, { timeBefore: Number(e.target.value) })}
                            className="input-base flex-1"
                          />
                          <select
                            value={selected.trigger.timeUnit}
                            onChange={e => updateTrigger(selected.id, { timeUnit: e.target.value })}
                            className="input-base w-24"
                          >
                            <option value="分">分</option>
                            <option value="時間">時間</option>
                            <option value="日">日</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">これはどのイベントタイプに適用されますか？</label>
                      <select className="input-base">
                        <option value="">Select...</option>
                        <option value="all">すべてのイベント</option>
                        <option value="meeting">ミーティング</option>
                        <option value="task">タスク</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.trigger.applyToFuture}
                        onChange={e => updateTrigger(selected.id, { applyToFuture: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 accent-[#0D9488]"
                      />
                      <span className="text-sm text-gray-600">将来のイベントタイプを含むすべてのイベントタイプに適用</span>
                    </label>
                  </div>
                </div>

                {/* ACTIONS */}
                {selected.actions.map((action, idx) => (
                  <div key={action.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-sm font-bold text-gray-700">アクション {idx + 1}</span>
                      </div>
                      <button
                        onClick={() => removeAction(selected.id, action.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-5 space-y-5">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">これを実行する</label>
                        <select
                          value={action.type}
                          onChange={e => updateAction(selected.id, action.id, { type: e.target.value })}
                          className="input-base"
                        >
                          {ACTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>

                      {action.type === 'send_email' && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">送信者の名前</label>
                            <input
                              type="text"
                              value={action.senderName}
                              onChange={e => updateAction(selected.id, action.id, { senderName: e.target.value })}
                              className="input-base"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">メッセージテンプレート</label>
                            <select
                              value={action.template}
                              onChange={e => updateAction(selected.id, action.id, { template: e.target.value })}
                              className="input-base"
                            >
                              {TEMPLATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-sm font-medium text-gray-700">メールの件名</label>
                              <div className="relative">
                                <button
                                  onClick={() => setShowVarMenu(showVarMenu === `${action.id}-subject` ? null : `${action.id}-subject`)}
                                  className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition-all"
                                  style={{ color: '#0D9488' }}
                                >
                                  変数を追加 ▾
                                </button>
                                {showVarMenu === `${action.id}-subject` && (
                                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 max-h-48 overflow-y-auto">
                                    {VARIABLES.map(v => (
                                      <button
                                        key={v}
                                        onClick={() => {
                                          updateAction(selected.id, action.id, { subject: action.subject + v });
                                          setShowVarMenu(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 font-mono"
                                        style={{ color: '#0D9488' }}
                                      >
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <textarea
                              value={action.subject}
                              onChange={e => updateAction(selected.id, action.id, { subject: e.target.value })}
                              className="input-base min-h-[80px] resize-y font-mono text-xs"
                              rows={2}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-sm font-medium text-gray-700">メールの本文</label>
                              <div className="relative">
                                <button
                                  onClick={() => setShowVarMenu(showVarMenu === `${action.id}-body` ? null : `${action.id}-body`)}
                                  className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition-all"
                                  style={{ color: '#0D9488' }}
                                >
                                  変数を追加 ▾
                                </button>
                                {showVarMenu === `${action.id}-body` && (
                                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 max-h-48 overflow-y-auto">
                                    {VARIABLES.map(v => (
                                      <button
                                        key={v}
                                        onClick={() => {
                                          updateAction(selected.id, action.id, { body: action.body + v });
                                          setShowVarMenu(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 font-mono"
                                        style={{ color: '#0D9488' }}
                                      >
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <textarea
                              value={action.body}
                              onChange={e => updateAction(selected.id, action.id, { body: e.target.value })}
                              className="input-base min-h-[160px] resize-y font-mono text-xs leading-relaxed"
                              rows={6}
                            />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={action.includeCalendar}
                              onChange={e => updateAction(selected.id, action.id, { includeCalendar: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 accent-[#0D9488]"
                            />
                            <span className="text-sm text-gray-600">カレンダーのイベントを含める</span>
                          </label>
                        </>
                      )}

                      {action.type === 'create_task' && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">タスク名テンプレート</label>
                            <input
                              type="text"
                              value={action.subject}
                              onChange={e => updateAction(selected.id, action.id, { subject: e.target.value })}
                              className="input-base font-mono text-xs"
                              placeholder="{送信者} - {件名}"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">タスク詳細テンプレート</label>
                            <textarea
                              value={action.body}
                              onChange={e => updateAction(selected.id, action.id, { body: e.target.value })}
                              className="input-base min-h-[100px] resize-y font-mono text-xs"
                              rows={4}
                            />
                          </div>
                        </>
                      )}

                      {(action.type === 'send_slack' || action.type === 'webhook') && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                            {action.type === 'send_slack' ? 'チャンネル / メッセージ' : 'Webhook URL'}
                          </label>
                          <input
                            type="text"
                            value={action.subject}
                            onChange={e => updateAction(selected.id, action.id, { subject: e.target.value })}
                            className="input-base"
                            placeholder={action.type === 'send_slack' ? '#general' : 'https://...'}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add action button */}
                <button
                  onClick={() => addAction(selected.id)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all"
                >
                  + アクションを追加
                </button>

                <div className="pb-8" />
              </div>
            </div>
          </div>
        ) : showIntegrations ? (
          <div className="p-8 max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-1">連携アプリ</h3>
            <p className="text-sm text-gray-400 mb-8">ワークフローで使用できる外部サービス・APIの一覧</p>

            <div className="space-y-2">
              {NODE_INTEGRATIONS.map(app => (
                <div key={app.name} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: app.color }}>
                      {app.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">{app.name}</span>
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{app.category}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{app.description}</p>
                    </div>
                  </div>
                  <button className="text-sm font-medium text-gray-400 hover:text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
                    + 追加する
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-400 mb-2">ワークフローを選択</h3>
              <p className="text-sm text-gray-300">左のリストからワークフローを選択するか、新規作成してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsView;
