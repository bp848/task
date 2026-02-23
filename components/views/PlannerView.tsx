
import React, { useState } from 'react';
import { Task } from '../../types';

interface PlannerViewProps {
  tasks: Task[];
  onAddTask: (title: string, projectId: string, tags: string[], estimate: number, date: string) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ tasks, onAddTask }) => {
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  const getISODate = (daysOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  const getDayInfo = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('ja-JP', { weekday: 'short' });
    const dateNum = d.getDate();
    const month = d.getMonth() + 1;
    return { day, dateNum, month };
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => getISODate(i));

  const handleInlineAdd = (date: string) => {
    const title = inlineInputs[date];
    if (title?.trim()) {
      onAddTask(title, 'p1', [], 3600, date);
      setInlineInputs({ ...inlineInputs, [date]: '' });
    }
  };

  const getInputStyle = (val: string) => 
    `transition-all duration-300 border-2 ${val?.trim() ? 'border-emerald-500 bg-emerald-50/20' : 'border-rose-100 bg-rose-50/5'} focus:ring-4 focus:ring-opacity-20 ${val?.trim() ? 'focus:ring-emerald-500' : 'focus:ring-rose-200'}`;

  return (
    <div className="h-full bg-rose-50/10 flex flex-col overflow-hidden border-t-2 border-rose-100">
      <div className="flex-1 overflow-x-auto flex custom-scrollbar bg-rose-50/5">
        {weekDays.map(date => {
          const { day, dateNum, month } = getDayInfo(date);
          const dayTasks = tasks.filter(t => t.date === date);
          const completedCount = dayTasks.filter(t => t.completed).length;
          const totalCount = dayTasks.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const isToday = date === new Date().toISOString().split('T')[0];
          const currentInput = inlineInputs[date] || '';
          
          return (
            <div key={date} className={`min-w-[360px] border-r-2 border-rose-100 flex flex-col p-8 transition-all ${isToday ? 'bg-white shadow-2xl z-10 relative ring-4 ring-rose-500/5' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-baseline space-x-3">
                   <span className={`text-3xl font-black ${isToday ? 'text-rose-600' : 'text-slate-800'}`}>{month}/{dateNum}</span>
                   <span className="text-xs font-black text-slate-400 tracking-widest">{day}曜</span>
                </div>
                {isToday && <span className="text-[11px] font-black bg-rose-500 text-white px-4 py-1.5 rounded-full tracking-widest shadow-lg shadow-rose-100">今日</span>}
              </div>

              {/* 進捗バー */}
              <div className="mb-10">
                <div className="flex justify-between items-end mb-3">
                   <span className="text-[11px] font-black text-rose-300 tracking-[0.2em]">一日の進捗</span>
                   <span className="text-sm font-black text-slate-800">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-rose-50 rounded-full overflow-hidden border border-rose-100">
                   <div className="h-full bg-rose-500 transition-all duration-1000 shadow-[0_0_8px_rgba(244,63,94,0.3)]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mb-8 space-y-4 pr-1">
                {dayTasks.length > 0 ? (
                  dayTasks.map(t => (
                    <div key={t.id} className={`p-5 rounded-3xl border-2 transition-all ${t.completed ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60' : 'bg-white border-slate-200 text-slate-700 shadow-md hover:border-rose-400 hover:shadow-xl'}`}>
                       <div className="font-black text-base mb-3 leading-tight">{t.title}</div>
                       <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-widest">
                          <span className="bg-rose-50 text-rose-400 px-3 py-1 rounded-full border border-rose-100">{t.startTime || '予定なし'}</span>
                          {t.customerName && <span className="text-rose-500 font-black">@{t.customerName}</span>}
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-rose-100 rounded-[3rem] py-20 opacity-30">
                    <svg className="w-12 h-12 mb-3 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5"/></svg>
                    <span className="text-[11px] font-black tracking-[0.3em] text-rose-300">予定なし</span>
                  </div>
                )}
              </div>
              
              <div className="pt-8 border-t-2 border-rose-50">
                <div className="relative group">
                   <input 
                    value={currentInput}
                    onChange={(e) => setInlineInputs({ ...inlineInputs, [date]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd(date)}
                    placeholder="タスクを入力してEnter..."
                    className={`w-full text-sm p-5 rounded-2xl outline-none transition-all font-black placeholder:text-rose-200 shadow-inner ${getInputStyle(currentInput)}`}
                  />
                  {!currentInput.trim() && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[10px] font-black text-rose-300 tracking-widest animate-pulse">必須入力</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlannerView;
