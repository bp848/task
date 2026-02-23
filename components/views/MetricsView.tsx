
import React, { useMemo } from 'react';
import { Task } from '../../types';
import { businessMetricsData } from '../../constants';

interface MetricsViewProps {
  tasks: Task[];
}

const MetricsView: React.FC<MetricsViewProps> = ({ tasks }) => {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed);
    const totalTime = completed.reduce((acc, t) => acc + t.timeSpent, 0);
    const totalEstimated = tasks.reduce((acc, t) => acc + t.estimatedTime, 0);
    
    return {
      completedCount: completed.length,
      totalCount: tasks.length,
      totalTimeHours: (totalTime / 3600).toFixed(1),
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      estimatedTimeHours: (totalEstimated / 3600).toFixed(1)
    };
  }, [tasks]);

  return (
    <div className="p-8 h-full bg-rose-50/10 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">業務分析・実績レポート</h2>
          <p className="text-xs text-rose-400 font-bold mt-1 uppercase">三神 杏友さんのこれまでの業務実績を可視化しています。</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-lg shadow-rose-500/5">
             <span className="text-[10px] font-bold text-rose-300 tracking-widest">完了タスク率</span>
             <div className="flex items-end space-x-2 mt-2">
                <span className="text-3xl font-black text-slate-800">{stats.completionRate}%</span>
                <span className="text-xs text-slate-400 mb-1 font-bold">{stats.completedCount} / {stats.totalCount} 件</span>
             </div>
             <div className="mt-4 w-full bg-rose-50 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${stats.completionRate}%` }}></div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-lg shadow-rose-500/5">
             <span className="text-[10px] font-bold text-rose-300 tracking-widest">実稼働時間 (完了分)</span>
             <div className="flex items-end space-x-2 mt-2">
                <span className="text-3xl font-black text-slate-800">{stats.totalTimeHours}h</span>
                <span className="text-xs text-slate-400 mb-1 font-bold">実績合計</span>
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-lg shadow-rose-500/5">
             <span className="text-[10px] font-bold text-rose-300 tracking-widest">予定見積り合計</span>
             <div className="flex items-end space-x-2 mt-2">
                <span className="text-3xl font-black text-slate-800">{stats.estimatedTimeHours}h</span>
                <span className="text-xs text-slate-400 mb-1 font-bold">計画工数</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border-2 border-rose-50 shadow-lg shadow-rose-500/5 p-8">
             <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2 shadow-sm"></div>
                PQ/MQ 達成状況
             </h3>
             <div className="space-y-6">
                <div>
                   <div className="flex justify-between text-[11px] font-bold mb-2">
                      <span className="text-rose-400 tracking-widest uppercase">PQ (制作品質)</span>
                      <span className="text-rose-600 font-black">実績: {businessMetricsData.monthly.pq.actual} / 目標: {businessMetricsData.monthly.pq.target}</span>
                   </div>
                   <div className="w-full bg-rose-50 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full" style={{ width: `${(businessMetricsData.monthly.pq.actual / businessMetricsData.monthly.pq.target) * 100}%` }}></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between text-[11px] font-bold mb-2">
                      <span className="text-emerald-400 tracking-widest uppercase">MQ (利益管理)</span>
                      <span className="text-emerald-600 font-black">実績: {businessMetricsData.monthly.mq.actual} / 目標: {businessMetricsData.monthly.mq.target}</span>
                   </div>
                   <div className="w-full bg-emerald-50 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(businessMetricsData.monthly.mq.actual / businessMetricsData.monthly.mq.target) * 100}%` }}></div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-rose-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-rose-200">
             <div className="w-16 h-16 bg-white/10 text-rose-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2"/></svg>
             </div>
             <h4 className="font-bold text-white mb-2">AI パフォーマンス分析</h4>
             <p className="text-xs text-rose-100/70 leading-relaxed max-w-sm font-medium">
               現在のタスク完了ペースに基づくと、午後の制作集中時間を15%増やすことで、PQ目標を予定より3日早く達成できる可能性があります。
             </p>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-3xl p-8 border-2 border-rose-50 shadow-lg shadow-rose-500/5">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-slate-800 tracking-widest">業務活動頻度</h3>
              <span className="text-[10px] text-rose-300 font-bold uppercase">過去52週間</span>
           </div>
           <div className="flex items-end space-x-1 overflow-x-auto pb-4 custom-scrollbar">
              {Array.from({ length: 52 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-1 shrink-0">
                  {Array.from({ length: 7 }).map((_, j) => {
                    const opacity = Math.random() > 0.7 ? 'bg-rose-400' : Math.random() > 0.4 ? 'bg-rose-500' : 'bg-rose-50';
                    return <div key={j} className={`w-3 h-3 ${opacity} rounded-sm`}></div>;
                  })}
                </div>
              ))}
           </div>
           <div className="mt-4 flex items-center space-x-4 text-[9px] font-black text-rose-200 uppercase tracking-widest">
              <span>低頻度</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-rose-50 rounded-sm"></div>
                <div className="w-2 h-2 bg-rose-400 rounded-sm"></div>
                <div className="w-2 h-2 bg-rose-500 rounded-sm"></div>
              </div>
              <span>高頻度</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsView;
