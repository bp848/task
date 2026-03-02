import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, X, Maximize2 } from 'lucide-react';
import { Task } from '../../types';
import MeetingNotesAI from '../tools/MeetingNotesAI';

/* ────────────────────────────────────────────
   Tool Registry Types
   ──────────────────────────────────────────── */
export interface ToolProps {
  task?: Task | null;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: React.FC<ToolProps>;
  tags: string[];
  category: 'productivity' | 'developer' | 'utility' | 'communication';
  size?: 'small' | 'wide' | 'fullPage';
}

/* ────────────────────────────────────────────
   Built-in Tool Components
   ──────────────────────────────────────────── */

const PomodoroTimer: React.FC<ToolProps> = () => {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = window.setInterval(() => setSeconds(s => s - 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (seconds === 0 && running) {
        setRunning(false);
        if (mode === 'focus') { setMode('break'); setSeconds(5 * 60); }
        else { setMode('focus'); setSeconds(25 * 60); }
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, seconds, mode]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const reset = () => { setRunning(false); setSeconds(mode === 'focus' ? 25 * 60 : 5 * 60); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${mode === 'focus' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
          {mode === 'focus' ? '集中' : '休憩'}
        </span>
      </div>
      <div className="text-center mb-4">
        <span className="text-4xl font-mono font-bold text-gray-800 tabular-nums">{mm}:{ss}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(!running)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all" style={{ backgroundColor: running ? '#EF4444' : 'var(--color-accent)' }}>
          {running ? '停止' : '開始'}
        </button>
        <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">リセット</button>
      </div>
    </div>
  );
};

const Stopwatch: React.FC<ToolProps> = () => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    setElapsed(baseRef.current + (Date.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => { startRef.current = Date.now(); baseRef.current = elapsed; setRunning(true); rafRef.current = requestAnimationFrame(tick); };
  const stop = () => { setRunning(false); cancelAnimationFrame(rafRef.current); baseRef.current = elapsed; };
  const reset = () => { stop(); setElapsed(0); baseRef.current = 0; };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const totalSec = Math.floor(elapsed / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  const ms = String(Math.floor((elapsed % 1000) / 10)).padStart(2, '0');

  return (
    <div>
      <div className="text-center mb-4">
        <span className="text-3xl font-mono font-bold text-gray-800 tabular-nums">{h}:{m}:{s}</span>
        <span className="text-lg font-mono text-gray-400 tabular-nums">.{ms}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={running ? stop : start} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all" style={{ backgroundColor: running ? '#EF4444' : 'var(--color-accent)' }}>
          {running ? '停止' : '開始'}
        </button>
        <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">リセット</button>
      </div>
    </div>
  );
};

const TextTools: React.FC<ToolProps> = () => {
  const [text, setText] = useState('');
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;
  const bytes = new TextEncoder().encode(text).length;

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="テキストを入力..."
        className="w-full h-28 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 outline-none resize-y focus:border-[var(--color-accent)] transition-all" />
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
        <span>{chars} 文字</span><span>{charsNoSpace} 文字(空白除外)</span><span>{words} 単語</span><span>{lines} 行</span><span>{bytes} bytes</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => setText(text.replace(/[\x21-\x7E]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0)).replace(/ /g, '\u3000'))} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">全角変換</button>
        <button onClick={() => setText(text.replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\u3000/g, ' '))} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">半角変換</button>
        <button onClick={() => setText(text.toUpperCase())} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">大文字</button>
        <button onClick={() => setText(text.toLowerCase())} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">小文字</button>
        <button onClick={() => navigator.clipboard.writeText(text)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ backgroundColor: 'var(--color-accent)' }}>コピー</button>
      </div>
    </div>
  );
};

const JsonFormatter: React.FC<ToolProps> = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const prettify = () => { try { setOutput(JSON.stringify(JSON.parse(input), null, 2)); setError(''); } catch { setError('JSONの形式が正しくありません'); } };
  const minify = () => { try { setOutput(JSON.stringify(JSON.parse(input))); setError(''); } catch { setError('JSONの形式が正しくありません'); } };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder='{"key": "value"}'
          className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 outline-none resize-y focus:border-[var(--color-accent)] transition-all" />
        <textarea readOnly value={output} placeholder="結果がここに表示されます"
          className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 outline-none resize-y" />
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button onClick={prettify} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ backgroundColor: 'var(--color-accent)' }}>整形</button>
        <button onClick={minify} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">圧縮</button>
        <button onClick={() => navigator.clipboard.writeText(output)} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">コピー</button>
      </div>
    </div>
  );
};

const QuickMemo: React.FC<ToolProps> = () => {
  const [memo, setMemo] = useState(() => localStorage.getItem('zenwork_memo') || '');
  const [saved, setSaved] = useState(false);

  const save = () => { localStorage.setItem('zenwork_memo', memo); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        {saved && <span className="text-xs text-green-600 font-semibold">保存しました</span>}
      </div>
      <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモを入力... (ブラウザに保存されます)"
        className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 outline-none resize-y focus:border-[var(--color-accent)] transition-all" />
      <div className="flex gap-2 mt-3">
        <button onClick={save} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ backgroundColor: 'var(--color-accent)' }}>保存</button>
        <button onClick={() => { setMemo(''); localStorage.removeItem('zenwork_memo'); }} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">クリア</button>
      </div>
    </div>
  );
};

const Base64Tool: React.FC<ToolProps> = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const encode = () => { try { setOutput(btoa(unescape(encodeURIComponent(input)))); } catch { setOutput('エンコードエラー'); } };
  const decode = () => { try { setOutput(decodeURIComponent(escape(atob(input)))); } catch { setOutput('デコードエラー'); } };

  return (
    <div>
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="テキストを入力..."
        className="w-full h-20 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 outline-none resize-y focus:border-[var(--color-accent)] transition-all" />
      {output && <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 break-all max-h-20 overflow-y-auto">{output}</div>}
      <div className="flex gap-2 mt-3">
        <button onClick={encode} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ backgroundColor: 'var(--color-accent)' }}>エンコード</button>
        <button onClick={decode} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">デコード</button>
      </div>
    </div>
  );
};

const UrlTool: React.FC<ToolProps> = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const encode = () => { try { setOutput(encodeURIComponent(input)); } catch { setOutput('エラー'); } };
  const decode = () => { try { setOutput(decodeURIComponent(input)); } catch { setOutput('エラー'); } };

  return (
    <div>
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="URLまたはテキスト..."
        className="w-full h-20 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 outline-none resize-y focus:border-[var(--color-accent)] transition-all" />
      {output && <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 break-all max-h-20 overflow-y-auto">{output}</div>}
      <div className="flex gap-2 mt-3">
        <button onClick={encode} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ backgroundColor: 'var(--color-accent)' }}>エンコード</button>
        <button onClick={decode} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">デコード</button>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────
   Tool Registry — アプリストアのカタログ
   ──────────────────────────────────────────── */
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'meeting-notes-ai',
    name: 'Meeting Notes AI',
    description: '会議を録音・テキスト入力してAIが自動で議事録・タスク抽出',
    icon: '🎙️',
    component: MeetingNotesAI,
    tags: ['MTG', '会議', '議事録', 'ミーティング', '録音', '打ち合わせ', '面談', '商談'],
    category: 'communication',
    size: 'fullPage',
  },
  {
    id: 'pomodoro',
    name: 'ポモドーロタイマー',
    description: '25分集中 + 5分休憩のサイクルで生産性を向上',
    icon: '🍅',
    component: PomodoroTimer,
    tags: ['集中', '作業', 'focus', 'ポモドーロ', '制作', 'デザイン'],
    category: 'productivity',
  },
  {
    id: 'stopwatch',
    name: 'ストップウォッチ',
    description: '経過時間の正確な計測',
    icon: '⏱️',
    component: Stopwatch,
    tags: ['計測', '時間', 'タイマー'],
    category: 'productivity',
  },
  {
    id: 'text-tools',
    name: 'テキストツール',
    description: '文字数カウント・全角半角変換・大小文字変換',
    icon: '📝',
    component: TextTools,
    tags: ['テキスト', '文字', 'メール', '変換', '原稿', '文章', '校正'],
    category: 'utility',
    size: 'wide',
  },
  {
    id: 'json-formatter',
    name: 'JSON整形',
    description: 'JSONの整形・圧縮・バリデーション',
    icon: '{ }',
    component: JsonFormatter,
    tags: ['JSON', 'API', '開発', 'データ', '設定'],
    category: 'developer',
    size: 'wide',
  },
  {
    id: 'quick-memo',
    name: 'クイックメモ',
    description: 'ブラウザに保存される即座メモ帳',
    icon: '📋',
    component: QuickMemo,
    tags: ['メモ', '覚書', '記録', 'ノート'],
    category: 'utility',
    size: 'wide',
  },
  {
    id: 'base64',
    name: 'Base64',
    description: 'Base64エンコード/デコード変換',
    icon: '🔐',
    component: Base64Tool,
    tags: ['エンコード', 'Base64', '開発', '暗号'],
    category: 'developer',
  },
  {
    id: 'url-encode',
    name: 'URLエンコード',
    description: 'URLエンコード/デコード変換',
    icon: '🔗',
    component: UrlTool,
    tags: ['URL', 'エンコード', 'リンク', 'Web'],
    category: 'developer',
  },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  productivity: { label: '生産性', icon: '⚡' },
  utility: { label: 'ユーティリティ', icon: '🛠️' },
  developer: { label: '開発ツール', icon: '💻' },
  communication: { label: 'コミュニケーション', icon: '💬' },
};

/* ────────────────────────────────────────────
   タスクとツールのマッチング
   ──────────────────────────────────────────── */
export function matchToolsForTask(task: Task | null, registry: ToolDefinition[] = TOOL_REGISTRY): ToolDefinition[] {
  if (!task) return [];
  const text = `${task.title} ${task.details || ''} ${task.customerName || ''} ${task.tags.join(' ')}`.toLowerCase();
  return registry.filter(tool =>
    tool.tags.some(tag => text.includes(tag.toLowerCase()))
  );
}

/* ════════════════════════════════════════════
   TOOLS VIEW — アプリストア
   ════════════════════════════════════════════ */
interface ToolsViewProps {
  task?: Task | null;
}

const ToolsView: React.FC<ToolsViewProps> = ({ task }) => {
  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const [fullPageToolId, setFullPageToolId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const matchedToolIds = useMemo(() => {
    if (!task) return new Set<string>();
    return new Set(matchToolsForTask(task).map(t => t.id));
  }, [task]);

  const filteredTools = useMemo(() => {
    let tools = TOOL_REGISTRY;
    if (filter !== 'all') tools = tools.filter(t => t.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return tools;
  }, [filter, search]);

  const categories = useMemo(() => {
    const cats = new Set(TOOL_REGISTRY.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const openTool = filteredTools.find(t => t.id === openToolId);
  const fullPageTool = TOOL_REGISTRY.find(t => t.id === fullPageToolId);

  const handleToolClick = (tool: ToolDefinition) => {
    if (tool.size === 'fullPage') {
      setFullPageToolId(tool.id);
      setOpenToolId(null);
    } else {
      setOpenToolId(openToolId === tool.id ? null : tool.id);
    }
  };

  /* ─── Full Page Mode ─── */
  if (fullPageTool) {
    const Comp = fullPageTool.component;
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <button onClick={() => setFullPageToolId(null)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors">
            <ArrowLeft size={18} /> ツール一覧
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg">{fullPageTool.icon}</span>
            <span className="text-sm font-bold text-gray-800">{fullPageTool.name}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Comp task={task} />
        </div>
      </div>
    );
  }

  /* ─── App Store Grid ─── */
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">ツール</h2>
            <p className="text-xs text-gray-400 mt-1">
              業務で使えるアプリ集 — タスクに応じて自動で提案されます
            </p>
          </div>
        </div>

        {/* Search + Category Filter */}
        <div className="mb-5 space-y-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ツールを検索..."
            className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[var(--color-accent)] transition-all"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === cat
                    ? 'bg-zinc-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? '🏠 すべて' : `${CATEGORY_LABELS[cat]?.icon || ''} ${CATEGORY_LABELS[cat]?.label || cat}`}
              </button>
            ))}
          </div>
        </div>

        {/* Task context badge */}
        {task && matchedToolIds.size > 0 && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="text-[10px] font-bold text-blue-600 tracking-widest mb-1">タスク連動</div>
            <div className="text-xs text-blue-800 font-medium">
              「{task.title}」に関連するツール {matchedToolIds.size}件がハイライトされています
            </div>
          </div>
        )}

        {/* Full-page app cards (featured) */}
        {filteredTools.filter(t => t.size === 'fullPage').length > 0 && (
          <div className="mb-5">
            {filteredTools.filter(t => t.size === 'fullPage').map(tool => {
              const isMatched = matchedToolIds.has(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all hover:shadow-lg mb-3 ${
                    isMatched
                      ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md ring-1 ring-blue-200'
                      : 'border-gray-100 bg-gradient-to-r from-white to-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                      {tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-800">{tool.name}</h3>
                        {isMatched && (
                          <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md flex-shrink-0">推奨</span>
                        )}
                        <Maximize2 size={14} className="text-gray-300 ml-auto flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-400">{tool.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tool.tags.slice(0, 5).map(tag => (
                          <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded widget tool */}
        {openTool && openTool.size !== 'fullPage' && (
          <div className="mb-6 bg-white border-2 border-zinc-200 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{openTool.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{openTool.name}</h3>
                  <p className="text-[10px] text-gray-400">{openTool.description}</p>
                </div>
              </div>
              <button
                onClick={() => setOpenToolId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <openTool.component task={task} />
          </div>
        )}

        {/* Widget Tool Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredTools.filter(t => t.size !== 'fullPage').map(tool => {
            const isMatched = matchedToolIds.has(tool.id);
            const isOpen = openToolId === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  tool.size === 'wide' ? 'col-span-2' : ''
                } ${
                  isOpen
                    ? 'border-zinc-800 bg-zinc-800 text-white shadow-lg'
                    : isMatched
                      ? 'border-blue-300 bg-blue-50 shadow-md ring-1 ring-blue-200'
                      : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{tool.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold truncate ${isOpen ? 'text-white' : 'text-gray-800'}`}>{tool.name}</h3>
                      {isMatched && !isOpen && (
                        <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md flex-shrink-0">推奨</span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 truncate ${isOpen ? 'text-zinc-300' : 'text-gray-400'}`}>{tool.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">該当するツールがありません</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsView;
