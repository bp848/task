
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dayTasks = tasks.filter(t => t.date === targetDate && t.completed);
      
      const taskList = dayTasks
        .sort((a,b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
        .map(t => `${t.startTime || '??:??'}-${t.endTime || '??:??'}　${t.title}`)
        .join('\n');

      const dateObj = new Date(targetDate);
      const monthStr = (dateObj.getMonth() + 1).toString();
      const dateStr = `${monthStr}月${dateObj.getDate()}日`;

      const m = businessMetricsData.monthly;
      const c = businessMetricsData.cumulative;

      const prompt = `
        あなたはCSG制作部の社員「三神 杏友」です。橋本社長への日報を作成してください。
        以下のフォーマットを【一字一句変えずに】出力してください。
        AIとしての解説、導入文、結びの言葉などは「一切」不要です。

        【出力フォーマット】
        橋本社長様
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
        前年${c.mq.prevYear}　　　　　　　  前年差額▲${(c.mq.prevYear - c.mq.actual).toFixed(1)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setReport(response.text || '報告書を作成できませんでした。');
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
        className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-rose-700 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-rose-200"
      >
        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        <span>社長報告メール用フォーマットを生成</span>
      </button>

      {report && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">REPORT GENERATED</h3>
              <button onClick={() => setReport(null)} className="p-2 hover:bg-rose-50 rounded-full text-rose-400">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
              </button>
            </div>
            <div className="bg-rose-50/20 rounded-2xl p-6 text-[13px] text-slate-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-medium border-2 border-rose-50 shadow-inner custom-scrollbar font-mono">
              {report}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(report);
                alert('コピーしました。');
                setReport(null);
              }}
              className="w-full mt-6 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-200"
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
