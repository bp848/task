
import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { extractCategories, extractSoftware } from '../constants';

interface GeminiSummaryProps {
  tasks: Task[];
  targetDate: string;
}

const GeminiSummary: React.FC<GeminiSummaryProps> = ({ tasks, targetDate }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dayTasks = useMemo(() => tasks.filter(t => t.date === targetDate), [tasks, targetDate]);

  // --- 作業統計 ---
  const stats = useMemo(() => {
    const total = dayTasks.length;
    const completed = dayTasks.filter(t => t.completed).length;
    const totalTimeMin = Math.floor(dayTasks.reduce((s, t) => s + t.timeSpent, 0) / 60);
    const totalEstMin = Math.floor(dayTasks.reduce((s, t) => s + t.estimatedTime, 0) / 60);

    // 顧客別
    const byCustomer: Record<string, { count: number; completed: number; time: number; tasks: string[] }> = {};
    dayTasks.forEach(t => {
      const c = t.customerName || '（未設定）';
      if (!byCustomer[c]) byCustomer[c] = { count: 0, completed: 0, time: 0, tasks: [] };
      byCustomer[c].count++;
      if (t.completed) byCustomer[c].completed++;
      byCustomer[c].time += t.timeSpent;
      byCustomer[c].tasks.push(t.title);
    });

    // カテゴリ別
    const byCat: Record<string, number> = {};
    dayTasks.forEach(t => {
      extractCategories(t.title, t.details).forEach(cat => {
        byCat[cat.name] = (byCat[cat.name] || 0) + 1;
      });
    });

    // ソフト別
    const bySw: Record<string, number> = {};
    dayTasks.forEach(t => {
      extractSoftware(t.title, t.details).forEach(sw => {
        bySw[sw.name] = (bySw[sw.name] || 0) + 1;
      });
    });

    return { total, completed, totalTimeMin, totalEstMin, byCustomer, byCat, bySw };
  }, [dayTasks]);

  // --- 自動化できそうなパターン検出 ---
  const automationSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    // 定型タスクが多い → テンプレート化提案
    const routineCount = dayTasks.filter(t => t.isRoutine).length;
    if (routineCount >= 3) {
      suggestions.push(`定型タスクが${routineCount}件 → 一括登録テンプレートで時短可能`);
    }

    // メール系タスクが多い → 自動化提案
    const emailTasks = dayTasks.filter(t => extractCategories(t.title).some(c => c.name === 'メール'));
    if (emailTasks.length >= 3) {
      suggestions.push(`メール関連${emailTasks.length}件 → メール定型文の自動生成で効率化`);
    }

    // 同一顧客への複数タスク → まとめ提案
    Object.entries(stats.byCustomer).forEach(([name, data]) => {
      if (data.count >= 3 && name !== '（未設定）') {
        suggestions.push(`${name}向け${data.count}件 → まとめて処理でコンテキストスイッチ削減`);
      }
    });

    // 見積系 → 自動テンプレ提案
    const quoteCount = dayTasks.filter(t => extractCategories(t.title).some(c => c.name === '見積')).length;
    if (quoteCount >= 2) {
      suggestions.push(`見積関連${quoteCount}件 → 見積テンプレートの標準化で作成時間短縮`);
    }

    // 制作系が長時間 → 効率化提案
    const designTasks = dayTasks.filter(t => extractCategories(t.title).some(c => c.name === '制作'));
    const designTime = designTasks.reduce((s, t) => s + t.timeSpent, 0);
    if (designTime > 7200) {
      suggestions.push(`制作作業${Math.floor(designTime / 60)}分 → デザインテンプレート活用で短縮可能`);
    }

    // 顧客名×タスク内容から関連提案
    Object.entries(stats.byCustomer).forEach(([name, data]) => {
      if (name === '（未設定）') return;
      const taskTitles = data.tasks.join(' ');
      if (taskTitles.includes('名刺') || taskTitles.includes('経営計画')) {
        suggestions.push(`${name} → 名刺・経営計画書の提案確認をフォローアップ`);
      }
      if (taskTitles.includes('見積') && taskTitles.includes('うちわ')) {
        suggestions.push(`${name} → うちわ注文開始のメルマガ配信を検討`);
      }
      if (taskTitles.includes('チラシ') || taskTitles.includes('ポスター')) {
        suggestions.push(`${name} → 印刷物の校正→入稿フローを自動化提案`);
      }
    });

    return suggestions;
  }, [dayTasks, stats]);

  const generateDailyReport = async () => {
    setLoading(true);
    try {
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
            if (t.customerName) str += `（${t.customerName}様）`;
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
      const dateStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

      const reportText = `橋本社長

いつもありがとうございます。
CSGの三神です。

${dateStr}の業務報告です。

${taskList}

**************************************************
文唱堂印刷株式会社
三神 杏友

〒101-0025
東京都千代田区神田佐久間町3-37
Tel.03-3851-0111
**************************************************`;

      await new Promise(resolve => setTimeout(resolve, 300));
      setReport(reportText);
    } catch (err) {
      console.error(err);
      setReport('エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  if (dayTasks.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* 作業統計カード */}
      <div className="bg-white rounded-2xl border-2 border-zinc-200 p-5 shadow-sm">
        <h3 className="text-[11px] font-black text-zinc-500 tracking-widest mb-4">作業統計</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-black text-zinc-800">{stats.total}</div>
            <div className="text-[9px] font-bold text-zinc-400">全タスク</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-green-600">{stats.completed}</div>
            <div className="text-[9px] font-bold text-zinc-400">完了</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-blue-600">{stats.totalTimeMin}<span className="text-xs">分</span></div>
            <div className="text-[9px] font-bold text-zinc-400">実績時間</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-zinc-400">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}<span className="text-xs">%</span></div>
            <div className="text-[9px] font-bold text-zinc-400">完了率</div>
          </div>
        </div>
        {/* 進捗バー */}
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
          />
        </div>
        {/* カテゴリ・ソフト ミニ統計 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(stats.byCat).map(([name, count]) => (
            <span key={name} className="text-[9px] font-black text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">{name} {count}件</span>
          ))}
          {Object.entries(stats.bySw).map(([name, count]) => (
            <span key={name} className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-full">{name} {count}件</span>
          ))}
        </div>
      </div>

      {/* 自動化提案 */}
      {automationSuggestions.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
          <h3 className="text-[11px] font-black text-amber-700 tracking-widest mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            自動化・効率化の提案
          </h3>
          <div className="space-y-2">
            {automationSuggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800 font-medium">
                <span className="text-amber-500 shrink-0 mt-0.5">&#9679;</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日報メール生成ボタン */}
      <button
        onClick={generateDailyReport}
        disabled={loading}
        className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 shadow-xl shadow-zinc-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border border-zinc-700"
      >
        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        <span className="tracking-widest">{loading ? '生成中...' : '三神→橋本社長 日報メールを生成'}</span>
      </button>

      {report && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-widest">DAILY REPORT</h3>
              <button onClick={() => setReport(null)} className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" /></svg>
              </button>
            </div>
            <div className="bg-zinc-50/20 rounded-2xl p-6 text-[13px] text-zinc-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-medium border-2 border-zinc-50 shadow-inner custom-scrollbar font-mono">
              {report}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report);
                }}
                className="flex-1 py-4 bg-zinc-200 text-zinc-800 rounded-2xl font-black shadow-sm"
              >
                コピー
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report);
                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('業務報告')}&body=${encodeURIComponent(report)}`;
                  window.open(gmailUrl, '_blank');
                  setReport(null);
                }}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-black shadow-lg shadow-zinc-200"
              >
                Gmailで送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiSummary;
