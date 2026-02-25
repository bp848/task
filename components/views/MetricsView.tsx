
import React, { useMemo } from 'react';
import { Task } from '../../types';

interface MetricsViewProps {
  tasks: Task[];
  userName?: string;
}

const MetricsView: React.FC<MetricsViewProps> = ({ tasks, userName }) => {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed);
    const totalTime = completed.reduce((acc, t) => acc + t.timeSpent, 0);
    const totalEstimated = tasks.reduce((acc, t) => acc + t.estimatedTime, 0);
    return {
      completedCount: completed.length,
      totalCount: tasks.length,
      totalTimeHours: (totalTime / 3600).toFixed(1),
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      estimatedTimeHours: (totalEstimated / 3600).toFixed(1),
    };
  }, [tasks]);

  // 過去52週分のヒートマップ（実タスクデータから算出）
  const { heatmapWeeks, maxCount } = useMemo(() => {
    const completedByDate: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.completed && t.date) {
        completedByDate[t.date] = (completedByDate[t.date] || 0) + 1;
      }
    });

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 52 * 7 + 1);
    // 週の始まり（日曜）に揃える
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: string[][] = [];
    for (let w = 0; w < 52; w++) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        week.push(date.toISOString().split('T')[0]);
      }
      weeks.push(week);
    }

    const max = Math.max(1, ...Object.values(completedByDate));
    return { heatmapWeeks: weeks, maxCount: max };
  }, [tasks]);

  const getHeatColor = (date: string) => {
    const count = tasks.filter(t => t.completed && t.date === date).length;
    if (count === 0) return 'bg-zinc-50';
    const ratio = count / maxCount;
    if (ratio < 0.33) return 'bg-zinc-300';
    if (ratio < 0.66) return 'bg-zinc-500';
    return 'bg-zinc-800';
  };

  return (
    <div className="p-8 h-full bg-zinc-50/10 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h2 className="text-xl font-bold text-zinc-800 tracking-tight">業務分析・実績レポート</h2>
          {userName && (
            <p className="text-xs text-zinc-400 font-bold mt-1 uppercase">{userName}さんのこれまでの業務実績を可視化しています。</p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border-2 border-zinc-50 shadow-lg shadow-zinc-800/5">
            <span className="text-[10px] font-bold text-zinc-300 tracking-widest">完了タスク率</span>
            <div className="flex items-end space-x-2 mt-2">
              <span className="text-3xl font-black text-zinc-800">{stats.completionRate}%</span>
              <span className="text-xs text-zinc-400 mb-1 font-bold">{stats.completedCount} / {stats.totalCount} 件</span>
            </div>
            <div className="mt-4 w-full bg-zinc-50 h-2 rounded-full overflow-hidden">
              <div className="bg-zinc-800 h-full transition-all" style={{ width: `${stats.completionRate}%` }}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-zinc-50 shadow-lg shadow-zinc-800/5">
            <span className="text-[10px] font-bold text-zinc-300 tracking-widest">実稼働時間 (完了分)</span>
            <div className="flex items-end space-x-2 mt-2">
              <span className="text-3xl font-black text-zinc-800">{stats.totalTimeHours}h</span>
              <span className="text-xs text-zinc-400 mb-1 font-bold">実績合計</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-zinc-50 shadow-lg shadow-zinc-800/5">
            <span className="text-[10px] font-bold text-zinc-300 tracking-widest">予定見積り合計</span>
            <div className="flex items-end space-x-2 mt-2">
              <span className="text-3xl font-black text-zinc-800">{stats.estimatedTimeHours}h</span>
              <span className="text-xs text-zinc-400 mb-1 font-bold">計画工数</span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-3xl p-8 border-2 border-zinc-50 shadow-lg shadow-zinc-800/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-zinc-800 tracking-widest">業務活動頻度</h3>
            <span className="text-[10px] text-zinc-300 font-bold uppercase">過去52週間</span>
          </div>
          <div className="flex items-end space-x-1 overflow-x-auto pb-4 custom-scrollbar">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col space-y-1 shrink-0">
                {week.map(date => (
                  <div
                    key={date}
                    title={date}
                    className={`w-3 h-3 ${getHeatColor(date)} rounded-sm`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center space-x-4 text-[9px] font-black text-zinc-200 uppercase tracking-widest">
            <span>低頻度</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-zinc-50 rounded-sm border border-zinc-100"></div>
              <div className="w-2 h-2 bg-zinc-300 rounded-sm"></div>
              <div className="w-2 h-2 bg-zinc-500 rounded-sm"></div>
              <div className="w-2 h-2 bg-zinc-800 rounded-sm"></div>
            </div>
            <span>高頻度</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsView;
