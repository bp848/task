
import React, { useState } from 'react';
import { Task } from '../types';

interface GeminiSummaryProps {
  tasks: Task[];
  targetDate: string;
}

interface MetricsGroup {
  target: number;
  actual: number;
  prevYear: number;
}

interface MetricsData {
  monthly: { pq: MetricsGroup; mq: MetricsGroup };
  cumulative: { pq: MetricsGroup; mq: MetricsGroup };
}

const GeminiSummary: React.FC<GeminiSummaryProps> = ({ tasks, targetDate }) => {
  const [report, setReport] = useState<string | null>(null);
  const [showMetricsEditor, setShowMetricsEditor] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [metrics, setMetrics] = useState<MetricsData>({
    monthly: { pq: { target: 0, actual: 0, prevYear: 0 }, mq: { target: 0, actual: 0, prevYear: 0 } },
    cumulative: { pq: { target: 0, actual: 0, prevYear: 0 }, mq: { target: 0, actual: 0, prevYear: 0 } },
  });

  const updateMetric = (
    period: 'monthly' | 'cumulative',
    kpi: 'pq' | 'mq',
    field: 'target' | 'actual' | 'prevYear',
    value: string
  ) => {
    const num = parseFloat(value) || 0;
    setMetrics(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [kpi]: { ...prev[period][kpi], [field]: num }
      }
    }));
  };

  const generateReport = () => {
    const dayTasks = tasks.filter(t => t.date === targetDate && t.completed);

    const timeGroups: Record<string, Task[]> = {};
    dayTasks.forEach(t => {
      const start = t.startTime || '??:??';
      let end = t.endTime;
      if (!end && t.startTime && t.estimatedTime) {
        const [h, m] = t.startTime.split(':').map(Number);
        const totalMins = h * 60 + m + Math.floor(t.estimatedTime / 60);
        const eh = Math.floor(totalMins / 60) % 24;
        const em = totalMins % 60;
        end = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
      } else if (!end) {
        end = '??:??';
      }
      const timeKey = `■${start}–${end}`;
      if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
      timeGroups[timeKey].push(t);
    });

    const taskList = Object.entries(timeGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timeKey, tasksInGroup]) => {
        const tasksStr = tasksInGroup.map(t => {
          let str = `・${t.title}`;
          if (t.details) {
            const detailsLines = t.details.split('\n').map(d => {
              if (d.startsWith('（') || d.startsWith('(')) return d;
              return `（${d}）`;
            }).join('\n');
            str += `\n${detailsLines}`;
          }
          return str;
        }).join('\n');
        return `${timeKey}\n${tasksStr}`;
      })
      .join('\n');

    const dateObj = new Date(targetDate + 'T00:00:00');
    const monthStr = (dateObj.getMonth() + 1).toString();
    const dateStr = `${monthStr}月${dateObj.getDate()}日`;

    const m = metrics.monthly;
    const c = metrics.cumulative;

    const diff = (a: number, b: number) => {
      const d = (a - b).toFixed(1);
      return Number(d) >= 0 ? `▲${d}` : `△${Math.abs(Number(d)).toFixed(1)}`;
    };

    const body = [
      recipientName ? `${recipientName}様` : '（宛先未設定）',
      'いつもありがとうございます。',
      '',
      `${dateStr}の報告です。`,
      '',
      taskList || '（本日の完了タスクがありません）',
      '',
      `${monthStr}月`,
      'PQ',
      `目標${m.pq.target}　実績${m.pq.actual}　目標差額${diff(m.pq.target, m.pq.actual)}`,
      `前年${m.pq.prevYear}　　　　　    前年差額${diff(m.pq.prevYear, m.pq.actual)}`,
      'MQ',
      `目標${m.mq.target}　実績${m.mq.actual}　  目標差額${diff(m.mq.target, m.mq.actual)}`,
      `前年${m.mq.prevYear}　　　　　　　前年差額${diff(m.mq.prevYear, m.mq.actual)}`,
      '',
      '累計',
      'PQ',
      `目標${c.pq.target}　実績${c.pq.actual}　目標差額${diff(c.pq.target, c.pq.actual)}`,
      `前年${c.pq.prevYear}　　　　　      前年差額${diff(c.pq.prevYear, c.pq.actual)}`,
      'MQ',
      `目標${c.mq.target}　実績${c.mq.actual}　  目標差額${diff(c.mq.target, c.mq.actual)}`,
      `前年${c.mq.prevYear}　　　　　　　  前年差額${diff(c.mq.prevYear, c.mq.actual)}`,
    ].join('\n');

    setReport(body);
  };

  const MetricRow = ({
    period, kpi, label
  }: { period: 'monthly' | 'cumulative'; kpi: 'pq' | 'mq'; label: string }) => {
    const g = metrics[period][kpi];
    const inputClass = "w-20 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400 text-center";
    return (
      <div className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
        <span className="text-[11px] font-black text-zinc-400 tracking-widest w-8">{label}</span>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-300 font-bold">目標</label>
          <input type="number" value={g.target} onChange={e => updateMetric(period, kpi, 'target', e.target.value)} className={inputClass} step="0.1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-300 font-bold">実績</label>
          <input type="number" value={g.actual} onChange={e => updateMetric(period, kpi, 'actual', e.target.value)} className={inputClass} step="0.1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-300 font-bold">前年</label>
          <input type="number" value={g.prevYear} onChange={e => updateMetric(period, kpi, 'prevYear', e.target.value)} className={inputClass} step="0.1" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 数値編集パネル */}
      <div className="bg-white border-2 border-zinc-50 rounded-3xl overflow-hidden shadow-lg">
        <button
          onClick={() => setShowMetricsEditor(!showMetricsEditor)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-zinc-50/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-[11px] font-black text-zinc-500 tracking-widest">PQ / MQ 数値を編集</span>
          </div>
          <svg
            className={`w-5 h-5 text-zinc-300 transition-transform ${showMetricsEditor ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMetricsEditor && (
          <div className="px-8 pb-7 border-t-2 border-zinc-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mt-5 mb-5">
              <p className="text-[10px] font-black text-zinc-300 tracking-widest mb-2">宛先（敬称略）</p>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="例: 山田太郎"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-zinc-300 tracking-widest mb-3">当月</p>
                <MetricRow period="monthly" kpi="pq" label="PQ" />
                <MetricRow period="monthly" kpi="mq" label="MQ" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-300 tracking-widest mb-3">累計</p>
                <MetricRow period="cumulative" kpi="pq" label="PQ" />
                <MetricRow period="cumulative" kpi="mq" label="MQ" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 生成ボタン */}
      <button
        onClick={generateReport}
        className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-zinc-800 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-zinc-200 active:scale-[0.98]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>社長報告メール用フォーマットを生成</span>
      </button>

      {/* プレビューモーダル */}
      {report && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-widest">REPORT GENERATED</h3>
              <button onClick={() => setReport(null)} className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" />
                </svg>
              </button>
            </div>
            <div className="bg-zinc-50/20 rounded-2xl p-6 text-[13px] text-zinc-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-medium border-2 border-zinc-50 shadow-inner custom-scrollbar font-mono leading-relaxed">
              {report}
            </div>
            <div className="flex gap-3 mt-6">
              {/* Gmailで開くボタン */}
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`${new Date(targetDate + 'T00:00:00').getMonth() + 1}月${new Date(targetDate + 'T00:00:00').getDate()}日 社長報告`)}&body=${encodeURIComponent(report)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-4 bg-[#EA4335] text-white rounded-2xl font-black shadow-lg hover:bg-[#d33426] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
                Gmailで開く
              </a>
              {/* コピーボタン */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report);
                  alert('コピーしました。');
                  setReport(null);
                }}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-black shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] text-sm"
              >
                クリップボードにコピー
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiSummary;
