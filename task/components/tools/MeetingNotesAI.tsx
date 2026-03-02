import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  Mic, Square, List, ArrowLeft, Trash2, Calendar, Clock,
  CheckSquare, FileText, MessageSquare, ChevronRight, Loader2,
  Volume2, AlertCircle, Mail, Plus, Edit3, Send
} from 'lucide-react';
import type { ToolProps } from '../views/ToolsView';

/* ─── helpers ─── */
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
const pad = (n: number) => String(n).padStart(2, '0');
const fmtSec = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};
const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDateJa = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

/* ─── Types ─── */
interface Meeting {
  id: string;
  title: string;
  date: number;
  startTime: number;
  endTime: number;
  transcription: string;
  summary: string;
  tasks: string[];
}

/* ─── Gemini AI call ─── */
async function analyzeWithAI(text: string): Promise<Partial<Meeting>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `あなたは優秀な議事録作成アシスタントです。以下の会議テキストを解析し、JSONのみを返してください（マークダウンや説明は不要）。

テキスト:
"""
${text}
"""

以下のJSON形式で出力:
{"title":"会議タイトル","summary":"簡潔な要約","tasks":["タスク1","タスク2"],"transcription":"整形した文字起こし"}

タスクが明示的でない場合でも、議論から必要なフォローアップ事項を推測してください。`,
  });
  const raw = response.text || '{}';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* ─── Demo data ─── */
const DEMO_MEETINGS: Meeting[] = [
  {
    id: uid(), title: 'Q3プロダクト戦略会議', date: Date.now() - 86400000,
    startTime: Date.now() - 86400000, endTime: Date.now() - 86400000 + 2700000,
    transcription: '田中：Q3のロードマップについて議論しましょう。新しいダッシュボード機能の優先度が高いと思います。\n\n鈴木：ユーザーからのフィードバックでも一番多いリクエストですね。モバイル対応も含めて検討すべきです。\n\n佐藤：技術的には2ヶ月で実装可能です。ただしバックエンドのリファクタリングが先に必要です。',
    summary: 'Q3のプロダクトロードマップを議論。新ダッシュボード機能を最優先とし、モバイル対応も含めて開発を進めることで合意。実装には約2ヶ月を見込むが、バックエンドの改修が前提条件となる。',
    tasks: ['佐藤：バックエンドリファクタリングの技術設計書を来週金曜までに作成', '田中：ダッシュボードのUI/UXモックアップを作成', '鈴木：ユーザーインタビュー5件を今月中に実施']
  },
  {
    id: uid(), title: 'デザインレビュー：ランディングページ', date: Date.now() - 172800000,
    startTime: Date.now() - 172800000, endTime: Date.now() - 172800000 + 1800000,
    transcription: '山田：新しいLPのデザイン案を3パターン用意しました。A案はミニマル、B案はビジュアル重視、C案はコンバージョン最適化です。\n\n高橋：A案のトーンが好みですが、CTAボタンはC案の配置が効果的だと思います。',
    summary: 'ランディングページのデザイン3案をレビュー。A案のミニマルデザインをベースに、C案のCTA配置を採用するハイブリッド案で進めることに決定。',
    tasks: ['山田：ハイブリッド案のモックアップを水曜までに作成', '高橋：コピーライティングの最終版を確認']
  }
];

/* ═══════════════════════════════════════════
   Components
   ═══════════════════════════════════════════ */

/* ─── MeetingList ─── */
function MeetingList({ meetings, onSelect, onDelete }: {
  meetings: Meeting[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!meetings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
          <Calendar size={36} className="text-indigo-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">ミーティングがありません</h2>
        <p className="text-sm">右上の「新しく録音」ボタンから会議の録音を開始してください。</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight mb-6 text-gray-900">ミーティング一覧</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {meetings.map(m => (
          <div key={m.id} onClick={() => onSelect(m.id)}
            className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex-1 mr-2 leading-tight">{m.title}</h3>
              <button onClick={e => { e.stopPropagation(); onDelete(m.id); }}
                className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="flex gap-4 text-xs text-gray-400 mb-3 flex-wrap">
              <span className="flex items-center gap-1"><Calendar size={13} />{fmtDate(m.date)}</span>
              <span className="flex items-center gap-1"><Clock size={13} />{fmtTime(m.startTime)}〜{fmtTime(m.endTime)}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{m.summary}</p>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                <CheckSquare size={15} /> {m.tasks.length} タスク
              </span>
              <span className="flex items-center text-indigo-300 font-medium">
                詳細を見る <ChevronRight size={15} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MeetingDetail ─── */
function MeetingDetail({ meeting, onBack, onDelete }: {
  meeting: Meeting;
  onBack: () => void;
  onDelete: () => void;
}) {
  const handleEmail = () => {
    const subj = encodeURIComponent(`【議事録】${meeting.title}`);
    const body = encodeURIComponent(
      `会議名: ${meeting.title}\n日時: ${fmtDate(meeting.date)} ${fmtTime(meeting.startTime)}〜${fmtTime(meeting.endTime)}\n\n■ 要約\n${meeting.summary}\n\n■ タスク\n${meeting.tasks.map(t => `- ${t}`).join('\n')}\n\n■ 文字起こし\n${meeting.transcription}`
    );
    window.open(`mailto:?subject=${subj}&body=${body}`, '_blank');
  };

  const Section = ({ icon: Icon, title, children }: { icon: React.FC<{ size: number; className?: string }>; title: string; children: React.ReactNode }) => (
    <section className="mb-8">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-900">
        <Icon size={22} className="text-indigo-500" /> {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-7 flex-wrap gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors">
          <ArrowLeft size={18} /> 戻る
        </button>
        <div className="flex gap-2.5">
          <button onClick={() => { if (confirm('削除しますか？')) onDelete(); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
            <Trash2 size={15} /> 削除
          </button>
          <button onClick={handleEmail}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors">
            <Mail size={15} /> メール送信
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">{meeting.title}</h1>
        <div className="flex gap-5 text-gray-400 text-sm mb-7 pb-7 border-b border-gray-100 flex-wrap">
          <span className="flex items-center gap-1.5"><Calendar size={16} />{fmtDateJa(meeting.date)}</span>
          <span className="flex items-center gap-1.5"><Clock size={16} />{fmtTime(meeting.startTime)}〜{fmtTime(meeting.endTime)}</span>
        </div>

        <Section icon={FileText} title="要約">
          <div className="bg-gray-50 rounded-xl p-5 text-gray-600 leading-relaxed text-sm">{meeting.summary}</div>
        </Section>

        <Section icon={CheckSquare} title={`タスク (${meeting.tasks.length})`}>
          {meeting.tasks.length ? (
            <div className="flex flex-col gap-2.5">
              {meeting.tasks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 font-medium text-sm leading-relaxed">{t}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">タスクは抽出されませんでした。</p>
          )}
        </Section>

        <Section icon={MessageSquare} title="文字起こし">
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-gray-500 leading-loose whitespace-pre-wrap text-sm">
            {meeting.transcription}
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ─── Recorder ─── */
function Recorder({ onComplete, onCancel }: {
  onComplete: (meeting: Meeting) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<'choose' | 'record' | 'text'>('choose');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [procStep, setProcStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recTime, setRecTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
    if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop();
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const processAudioBlob = useCallback(async (_blob: Blob, start: number, end: number) => {
    setIsProcessing(true);
    setProcStep('saving');
    try {
      setProcStep('analyzing');
      const dur = Math.round((end - start) / 1000);
      const meeting: Meeting = {
        id: uid(), title: `録音ミーティング (${dur}秒)`, date: Date.now(),
        startTime: start, endTime: end,
        transcription: `[${dur}秒の音声が録音されました]\n\n※ 音声の文字起こしにはサーバーサイドの音声認識APIが必要です。\nこのデモでは「テキスト入力」モードでAI解析をお試しください。`,
        summary: '音声録音が完了しました。テキスト入力モードを使用すると、AIによる要約・タスク抽出が利用できます。',
        tasks: ['テキスト入力モードでAI解析機能を試す']
      };
      onComplete(meeting);
    } catch {
      setError('音声の処理中にエラーが発生しました。');
      setIsProcessing(false);
      setProcStep(null);
    }
  }, [onComplete]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const update = () => {
        const arr = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(arr);
        setAudioLevel(arr.reduce((a, b) => a + b, 0) / arr.length);
        rafRef.current = requestAnimationFrame(update);
      };
      update();

      const rec = new MediaRecorder(stream);
      mediaRecRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const end = Date.now();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudioBlob(blob, startRef.current, end);
        stream.getTracks().forEach(t => t.stop());
      };

      startRef.current = Date.now();
      rec.start(1000);
      setIsRecording(true);
      setRecTime(0);
      timerRef.current = window.setInterval(() => setRecTime(p => p + 1), 1000);
    } catch {
      setError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && isRecording) {
      mediaRecRef.current.stop();
      setIsRecording(false);
      cleanup();
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    setProcStep('analyzing');
    setError(null);
    try {
      const result = await analyzeWithAI(textInput);
      const now = Date.now();
      onComplete({
        id: uid(),
        title: result.title || '無題のミーティング',
        date: now, startTime: now - 1800000, endTime: now,
        transcription: result.transcription || textInput,
        summary: result.summary || '要約を生成できませんでした。',
        tasks: result.tasks || []
      });
    } catch (err) {
      console.error(err);
      setError('AIによる解析中にエラーが発生しました。もう一度お試しください。');
      setIsProcessing(false);
      setProcStep(null);
    }
  };

  /* ─── Choose Mode ─── */
  if (mode === 'choose' && !isProcessing) {
    return (
      <div className="max-w-xl mx-auto pt-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-gray-900">ミーティングの記録</h2>
          <p className="text-gray-400 mb-9 text-sm leading-relaxed">
            録音またはテキスト入力で会議を記録し、AIが自動で要約・タスク抽出します。
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => setMode('record')}
              className="flex flex-col items-center gap-3 px-9 py-7 rounded-2xl text-white font-semibold text-sm min-w-[180px] transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
              <Mic size={28} />
              <span>マイクで録音</span>
              <span className="text-[11px] font-normal opacity-80">リアルタイム録音</span>
            </button>
            <button onClick={() => setMode('text')}
              className="flex flex-col items-center gap-3 px-9 py-7 rounded-2xl text-white font-semibold text-sm min-w-[180px] transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}>
              <Edit3 size={28} />
              <span>テキスト入力</span>
              <span className="text-[11px] font-normal opacity-80">議事メモをAI解析</span>
            </button>
          </div>
          <div className="mt-6">
            <button onClick={onCancel} className="text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">キャンセル</button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Text Input Mode ─── */
  if (mode === 'text') {
    return (
      <div className="max-w-xl mx-auto pt-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-left">
          <h2 className="text-xl font-bold mb-2 text-gray-900 text-center">テキストから議事録を作成</h2>
          <p className="text-gray-400 mb-6 text-sm text-center leading-relaxed">
            会議の内容をテキストで入力すると、AIが要約とタスクを抽出します。
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl mb-5 flex gap-2.5 text-xs">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="text-center py-10">
              <Loader2 size={40} className="text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="font-semibold text-gray-900 mb-1.5">AIが解析中...</p>
              <p className="text-xs text-gray-400">少々お待ちください。</p>
            </div>
          ) : (
            <>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={'例：\n田中：来月のリリーススケジュールを確認しましょう。\n鈴木：フロントエンドは来週金曜に完了予定です。\n佐藤：バックエンドのAPI修正が必要です。木曜までに対応します。\n田中：了解です。QAテストは再来週月曜からでお願いします。'}
                className="w-full min-h-[200px] p-4 rounded-xl border border-gray-200 text-sm leading-relaxed resize-y outline-none text-gray-600 bg-gray-50 focus:border-indigo-300 transition-colors"
              />
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => { setMode('choose'); setError(null); }}
                  className="text-gray-500 text-sm font-medium hover:text-gray-700 px-7 py-3 transition-colors">戻る</button>
                <button onClick={handleTextSubmit} disabled={!textInput.trim()}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors disabled:opacity-50">
                  <Send size={16} /> AIで解析する
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ─── Recording Mode ─── */
  return (
    <div className="max-w-xl mx-auto pt-10">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
        <h2 className="text-xl font-bold mb-2 text-gray-900">マイクで録音</h2>
        <p className="text-gray-400 mb-9 text-sm leading-relaxed">録音終了後、自動的に処理が開始されます。</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3.5 rounded-xl mb-6 flex gap-2.5 text-xs text-left">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isProcessing ? (
          <div className="py-8">
            <Loader2 size={40} className="text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="font-semibold text-gray-900 mb-1.5">
              {procStep === 'saving' ? '音声を保存中...' : 'AIが解析中...'}
            </p>
            <p className="text-xs text-gray-400">ブラウザを閉じないでください。</p>
          </div>
        ) : (
          <>
            <div className="relative w-[180px] h-[180px] mx-auto mb-7 flex items-center justify-center">
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 transition-transform"
                  style={{ transform: `scale(${1 + audioLevel / 100})`, opacity: 0.5 + audioLevel / 200 }} />
              )}
              <div className={`w-[120px] h-[120px] rounded-full flex items-center justify-center z-10 transition-all ${isRecording ? 'bg-red-100 shadow-[0_0_30px_rgba(239,68,68,.15)]' : 'bg-gray-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-300 text-gray-400'}`}>
                  <Mic size={30} />
                </div>
              </div>
              {isRecording && (
                <div className="absolute -bottom-5 flex flex-col items-center gap-1.5 w-full">
                  <div className="flex gap-[3px] items-center">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-[5px] rounded transition-all"
                        style={{ height: 8 + Math.min(audioLevel / 2, 24), background: audioLevel > i * 10 ? '#6366f1' : '#e2e8f0' }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-gray-300 tracking-widest uppercase">
                    <Volume2 size={9} /> INPUT
                  </div>
                </div>
              )}
            </div>

            <div className={`mb-8 ${isRecording ? 'mt-6' : ''}`}>
              <div className="text-4xl font-mono font-light tracking-widest text-gray-800">{fmtSec(recTime)}</div>
              {isRecording && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-red-500 mt-1.5 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500" /> REC
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3">
              {!isRecording ? (
                <>
                  <button onClick={() => { setMode('choose'); setError(null); }}
                    className="text-gray-500 text-sm font-medium hover:text-gray-700 px-7 py-3 transition-colors">戻る</button>
                  <button onClick={startRecording}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors">
                    <Mic size={16} /> 録音開始
                  </button>
                </>
              ) : (
                <button onClick={stopRecording}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  <Square size={16} /> 録音停止
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main MeetingNotesAI Component
   ═══════════════════════════════════════════ */
const MeetingNotesAI: React.FC<ToolProps> = () => {
  const [meetings, setMeetings] = useState<Meeting[]>(DEMO_MEETINGS);
  const [view, setView] = useState<'list' | 'record' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAdd = (m: Meeting) => { setMeetings([m, ...meetings]); setSelectedId(m.id); setView('detail'); };
  const handleDelete = (id: string) => { setMeetings(meetings.filter(m => m.id !== id)); if (selectedId === id) setView('list'); };
  const selected = meetings.find(m => m.id === selectedId);

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div onClick={() => setView('list')} className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
            <Mic size={16} />
          </div>
          <h1 className="text-base font-bold tracking-tight">Meeting Notes AI</h1>
        </div>
        <nav className="flex items-center gap-2">
          <button onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            <List size={18} />
          </button>
          <button onClick={() => setView('record')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors">
            <Plus size={14} />
            <span>新しく録音</span>
          </button>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-5">
        {view === 'list' && (
          <MeetingList meetings={meetings} onSelect={id => { setSelectedId(id); setView('detail'); }} onDelete={handleDelete} />
        )}
        {view === 'record' && (
          <Recorder onComplete={handleAdd} onCancel={() => setView('list')} />
        )}
        {view === 'detail' && selected && (
          <MeetingDetail meeting={selected} onBack={() => setView('list')} onDelete={() => handleDelete(selected.id)} />
        )}
      </div>
    </div>
  );
};

export default MeetingNotesAI;
