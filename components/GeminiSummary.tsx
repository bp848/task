
import React, { useState } from 'react';
import { Task } from '../types';
import { businessMetricsData } from '../constants';

interface GeminiSummaryProps {
  tasks: Task[];
  targetDate: string;
}

const GeminiSummary: React.FC<GeminiSummaryProps> = ({ tasks, targetDate }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateDailyReport = async () => {
    setLoading(true);
    try {
      const dayTasks = tasks.filter(t => t.date === targetDate);
      
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
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
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

      const dateObj = new Date(targetDate);
      const monthStr = (dateObj.getMonth() + 1).toString();
      const dateStr = `${monthStr}月${dateObj.getDate()}日`;

      const m = businessMetricsData.monthly;
      const c = businessMetricsData.cumulative;

      const reportText = `橋本社長様
いつもありがとうございます。

${dateStr}の報告です。

${taskList}

${monthStr}月
PQ
目標${m.pq.target}　実績${m.pq.actual}　目標差額▲${(m.pq.target - m.pq.actual).toFixed(1)}
前年${m.pq.prevYear}　　　　　    前年差額▲${(m.pq.prevYear - m.pq.actual).toFixed(1)}
MQ
目標${m.mq.target}　実績${m.mq.actual}　  目標差額▲${(m.mq.target - m.mq.actual).toFixed(1)}
前年${m.mq.prevYear}　　　　　　　前年差額▲${(m.mq.prevYear - m.mq.actual).toFixed(1)}

累計
PQ
目標${c.pq.target}　実績${c.pq.actual}　目標差額▲${(c.pq.target - c.pq.actual).toFixed(1)}
前年${c.pq.prevYear}　　　　　      前年差額▲${(c.pq.prevYear - c.pq.actual).toFixed(1)}
MQ
目標${c.mq.target}　実績${c.mq.actual}　  目標差額▲${(c.mq.target - c.mq.actual).toFixed(1)}
前年${c.mq.prevYear}　　　　　　　  前年差額▲${(c.mq.prevYear - c.mq.actual).toFixed(1)}`;

      // Simulate slight delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setReport(reportText);
    } catch (err) {
      console.error(err);
      setReport('エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={generateDailyReport}
        disabled={loading}
        className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 shadow-xl shadow-zinc-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border border-zinc-700"
      >
        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        <span className="tracking-widest">{loading ? '生成中...' : '社長報告メール用フォーマットを生成'}</span>
      </button>

      {report && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-widest">REPORT GENERATED</h3>
              <button onClick={() => setReport(null)} className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
              </button>
            </div>
            <div className="bg-zinc-50/20 rounded-2xl p-6 text-[13px] text-zinc-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-medium border-2 border-zinc-50 shadow-inner custom-scrollbar font-mono">
              {report}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(report);
                alert('コピーしました。');
                setReport(null);
              }}
              className="w-full mt-6 py-4 bg-zinc-900 text-white rounded-2xl font-black shadow-lg shadow-zinc-200"
            >
              クリップボードにコピー
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiSummary;
