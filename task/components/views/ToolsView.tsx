import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, X, Upload, Trash2 } from 'lucide-react';
import { Task } from '../../types';
import MeetingNotesAI from '../tools/MeetingNotesAI';
import ProcurementAnalyzer from '../tools/ProcurementAnalyzer';
import { compileJSX, loadCustomTools, saveCustomTool, deleteCustomTool, type CustomToolMeta } from '../../lib/jsxRuntime';

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
    id: 'procurement-analyzer',
    name: '入札準備アナライザー',
    description: '調達情報PDFをAI分析し、入札準備に必要な情報を自動抽出',
    icon: '📄',
    component: ProcurementAnalyzer,
    tags: ['入札', '調達', 'PDF', '官公庁', '仕様書', '公共事業', '契約', '提案'],
    category: 'productivity',
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

/* ────────────────────────────────────────────
   JSX アップロード / ペースト ダイアログ
   ──────────────────────────────────────────── */
const JsxUploadDialog: React.FC<{
  onRegister: (tool: CustomToolMeta) => void;
  onClose: () => void;
}> = ({ onRegister, onClose }) => {
  const [jsxCode, setJsxCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🧩');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState<CustomToolMeta['category']>('utility');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsxCode(content);
      if (!name) setName(file.name.replace(/\.(jsx|tsx)$/, ''));
    };
    reader.readAsText(file);
  };

  const handleRegister = () => {
    if (!jsxCode.trim()) { setError('JSXコードを入力してください'); return; }
    if (!name.trim()) { setError('アプリ名を入力してください'); return; }
    setError('');

    // コンパイルテスト
    try {
      compileJSX(jsxCode);
    } catch (err) {
      setError(`コンパイルエラー: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const tool: CustomToolMeta = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || `${name}カスタムツール`,
      icon,
      tags: tagsInput.split(/[,、\s]+/).filter(Boolean),
      category,
      jsxSource: jsxCode,
      createdAt: Date.now(),
    };

    saveCustomTool(tool);
    onRegister(tool);
    onClose();
  };

  // プレビューコンポーネント
  const PreviewComponent = useMemo(() => {
    if (!preview || !jsxCode.trim()) return null;
    try {
      return compileJSX(jsxCode);
    } catch {
      return null;
    }
  }, [preview, jsxCode]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800">JSXツール登録</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* JSX入力エリア */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-600">JSXコード</label>
              <div className="flex gap-2">
                <button onClick={() => setPreview(!preview)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${preview ? 'bg-[#ccfbf1] text-[#0d9488]' : 'bg-gray-100 text-gray-500'}`}>
                  {preview ? 'プレビュー中' : 'プレビュー'}
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200">
                  <Upload size={11} /> ファイル
                </button>
                <input ref={fileInputRef} type="file" accept=".jsx,.tsx,.js,.ts" onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
            <textarea
              value={jsxCode}
              onChange={e => setJsxCode(e.target.value)}
              placeholder="JSX / TSX コードをペーストまたはファイルをアップロード..."
              className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-700 outline-none resize-y focus:border-[#0d9488] transition-all"
            />
          </div>

          {/* プレビュー */}
          {preview && PreviewComponent && (
            <div className="border border-[#99f6e4] rounded-xl p-4 bg-[#f0fdfa]">
              <div className="text-[10px] font-bold text-[#0d9488] mb-2">PREVIEW</div>
              <div className="bg-white rounded-lg p-3 border border-[#e2e8f0] max-h-60 overflow-auto">
                <PreviewComponent />
              </div>
            </div>
          )}

          {/* メタデータ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">アプリ名 *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Meeting Notes AI"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#0d9488]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">アイコン</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🧩"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#0d9488]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">説明</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="何に使うツールか..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#0d9488]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">タグ（カンマ区切り）</label>
              <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="会議, MTG, 議事録"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#0d9488]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">カテゴリ</label>
              <select value={category} onChange={e => setCategory(e.target.value as CustomToolMeta['category'])}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#0d9488]">
                <option value="productivity">生産性</option>
                <option value="utility">ユーティリティ</option>
                <option value="developer">開発ツール</option>
                <option value="communication">コミュニケーション</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">キャンセル</button>
          <button onClick={handleRegister}
            className="px-5 py-2 text-sm font-bold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-xl transition-colors">
            登録する
          </button>
        </div>
      </div>
    </div>
  );
};

const ToolsView: React.FC<ToolsViewProps> = ({ task }) => {
  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const [fullPageToolId, setFullPageToolId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [customTools, setCustomTools] = useState<CustomToolMeta[]>([]);

  // localStorage からカスタムツール読み込み
  useEffect(() => {
    setCustomTools(loadCustomTools());
  }, []);

  // ビルトイン + カスタムツールを統合したレジストリ
  const allTools = useMemo(() => {
    const customDefs: ToolDefinition[] = customTools.map(ct => ({
      id: ct.id,
      name: ct.name,
      description: ct.description,
      icon: ct.icon,
      component: compileJSX(ct.jsxSource) as React.FC<ToolProps>,
      tags: ct.tags,
      category: ct.category,
      size: 'fullPage' as const,
    }));
    return [...TOOL_REGISTRY, ...customDefs];
  }, [customTools]);

  const matchedToolIds = useMemo(() => {
    if (!task) return new Set<string>();
    return new Set(matchToolsForTask(task, allTools).map(t => t.id));
  }, [task, allTools]);

  const filteredTools = useMemo(() => {
    let tools = allTools;
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
  }, [filter, search, allTools]);

  const categories = useMemo(() => {
    const cats = new Set(allTools.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [allTools]);

  const openTool = filteredTools.find(t => t.id === openToolId);
  const fullPageTool = allTools.find(t => t.id === fullPageToolId);

  const handleCustomToolRegister = (tool: CustomToolMeta) => {
    setCustomTools(loadCustomTools());
    setFullPageToolId(tool.id);
  };

  const handleDeleteCustomTool = (id: string) => {
    if (!confirm('このカスタムツールを削除しますか？')) return;
    deleteCustomTool(id);
    setCustomTools(loadCustomTools());
    if (fullPageToolId === id) setFullPageToolId(null);
    if (openToolId === id) setOpenToolId(null);
  };

  const handleToolClick = (tool: ToolDefinition) => {
    if (tool.size === 'fullPage') {
      setFullPageToolId(tool.id);
      setOpenToolId(null);
    } else {
      setOpenToolId(openToolId === tool.id ? null : tool.id);
    }
  };

  const isCustomTool = (id: string) => id.startsWith('custom-');

  /* ─── Full Page Mode ─── */
  if (fullPageTool) {
    const Comp = fullPageTool.component;
    return (
      <div className="h-full flex flex-col bg-[#f8fafb]">
        <div className="flex items-center justify-between px-6 h-14 border-b border-[#e2e8f0] bg-white flex-shrink-0">
          <button onClick={() => setFullPageToolId(null)}
            className="flex items-center gap-2 text-[#94a3b8] hover:text-[#0f172a] text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> ツール一覧
          </button>
          <span className="text-sm font-semibold text-[#0f172a]">{fullPageTool.name}</span>
          {isCustomTool(fullPageTool.id) && (
            <button onClick={() => { handleDeleteCustomTool(fullPageTool.id); }}
              className="text-[#94a3b8] hover:text-[#ef4444] transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Comp task={task} />
        </div>
      </div>
    );
  }

  /* ─── Main View ─── */
  return (
    <div className="h-full overflow-y-auto bg-[#f8fafb]">
      <div className="max-w-4xl mx-auto px-6 py-8 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">ツール</h1>
          <button onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] transition-colors">
            登録
          </button>
        </div>

        {/* JSX Upload Dialog */}
        {showUploadDialog && (
          <JsxUploadDialog onRegister={handleCustomToolRegister} onClose={() => setShowUploadDialog(false)} />
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#e2e8f0] mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === cat
                  ? 'border-[#0d9488] text-[#0d9488]'
                  : 'border-transparent text-[#94a3b8] hover:text-[#64748b]'
              }`}
            >
              {cat === 'all' ? 'すべて' : CATEGORY_LABELS[cat]?.label || cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ツールを検索..."
            className="w-full h-10 px-4 text-sm bg-white border border-[#e2e8f0] rounded-lg outline-none focus:border-[#0d9488] text-[#0f172a] placeholder-[#cbd5e1] transition-colors"
          />
        </div>

        {/* Task context */}
        {task && matchedToolIds.size > 0 && (
          <div className="mb-6 text-sm text-[#64748b]">
            「{task.title}」に関連: <span className="font-semibold text-[#0d9488]">{matchedToolIds.size}件</span>
          </div>
        )}

        {/* Tool Table */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left text-xs font-semibold text-[#94a3b8] px-6 py-3">ツール名</th>
                <th className="text-left text-xs font-semibold text-[#94a3b8] px-4 py-3 hidden sm:table-cell">カテゴリ</th>
                <th className="text-left text-xs font-semibold text-[#94a3b8] px-4 py-3 hidden md:table-cell">タグ</th>
                <th className="text-right text-xs font-semibold text-[#94a3b8] px-6 py-3">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {filteredTools.map((tool, i) => {
                const isMatched = matchedToolIds.has(tool.id);
                const isOpen = openToolId === tool.id;
                const isFullPage = tool.size === 'fullPage';

                return (
                  <React.Fragment key={tool.id}>
                    <tr
                      onClick={() => handleToolClick(tool)}
                      className={`border-b border-[#f1f5f9] cursor-pointer transition-colors ${
                        isOpen ? 'bg-[#f0fdfa]' : 'hover:bg-[#f8fafb]'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-base flex-shrink-0">{tool.icon}</span>
                          <div>
                            <div className="text-sm font-semibold text-[#0f172a]">{tool.name}</div>
                            <div className="text-xs text-[#94a3b8] mt-0.5">{tool.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-xs text-[#64748b]">{CATEGORY_LABELS[tool.category]?.label || tool.category}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {tool.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] text-[#94a3b8]">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isMatched && (
                            <span className="text-[10px] font-semibold text-[#0d9488]">推奨</span>
                          )}
                          {isCustomTool(tool.id) && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteCustomTool(tool.id); }}
                              className="text-[#cbd5e1] hover:text-[#ef4444] transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {isFullPage && (
                            <span className="text-xs text-[#94a3b8]">開く →</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline expanded widget */}
                    {isOpen && !isFullPage && (
                      <tr>
                        <td colSpan={4} className="px-6 py-5 bg-[#f8fafb] border-b border-[#e2e8f0]">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-[#0f172a]">{openTool?.name}</span>
                            <button onClick={() => setOpenToolId(null)} className="text-[#94a3b8] hover:text-[#64748b]">
                              <X size={16} />
                            </button>
                          </div>
                          {openTool && <openTool.component task={task} />}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {filteredTools.length === 0 && (
            <div className="text-center py-16 text-[#94a3b8]">
              <p className="text-sm">該当するツールがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsView;
