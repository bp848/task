
import React, { useState } from 'react';
import { Task } from '../../types';

interface PlannerViewProps {
  tasks: Task[];
  onAddTask: (title: string, projectId: string, tags: string[], estimate: number, date: string, startTime?: string, isRoutine?: boolean, customerName?: string, projectName?: string, details?: string) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ tasks, onAddTask }) => {
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

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
  const [bulkTargetDate, setBulkTargetDate] = useState(weekDays[0]);

  const handleInlineAdd = (date: string) => {
    const title = inlineInputs[date];
    if (title?.trim()) {
      onAddTask(title, 'p1', [], 3600, date);
      setInlineInputs({ ...inlineInputs, [date]: '' });
    }
  };

  const getInputStyle = (val: string) => 
    `transition-all duration-300 border-2 ${val?.trim() ? 'border-zinc-700 bg-zinc-100/20' : 'border-zinc-100 bg-zinc-50/5'} focus:ring-4 focus:ring-opacity-20 ${val?.trim() ? 'focus:ring-zinc-700' : 'focus:ring-zinc-200'}`;

  return (
    <div className="h-full bg-zinc-50/10 flex flex-col overflow-hidden border-t-2 border-zinc-100">
      <div className="p-8 pb-0">
        <header className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">週間プランナー</h2>
            <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest">AIが最適なスケジュールを提案します</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsBulkMode(!isBulkMode)} 
              className="bg-white text-zinc-600 border-2 border-zinc-200 px-6 py-3 rounded-xl font-black text-sm shadow-sm hover:bg-zinc-50 transition-all"
            >
              {isBulkMode ? '閉じる' : 'テキストから一括追加'}
            </button>
            <button className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>AI自動スケジューリング</span>
            </button>
          </div>
        </header>

        {isBulkMode && (
          <div className="mb-8 bg-white p-6 rounded-3xl border-2 border-zinc-200 shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-zinc-800">テキストから一括追加</h3>
              <select 
                value={bulkTargetDate} 
                onChange={e => setBulkTargetDate(e.target.value)} 
                className="bg-zinc-50 border-2 border-zinc-100 rounded-lg px-3 py-1.5 text-sm font-bold outline-none text-zinc-700"
              >
                {weekDays.map(d => {
                  const info = getDayInfo(d);
                  return <option key={d} value={d}>{info.month}/{info.dateNum} ({info.day})</option>;
                })}
              </select>
            </div>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="■13:00–13:15\n・GSX様依頼連絡\n（ご依頼に対するメールの返信）"
              className="w-full p-4 rounded-xl outline-none text-sm font-black text-zinc-800 border-2 border-zinc-100 bg-zinc-50/5 focus:ring-4 focus:ring-zinc-200 min-h-[120px] mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setIsBulkMode(false)} className="px-6 py-2 rounded-xl font-black text-sm text-zinc-500 hover:bg-zinc-100">キャンセル</button>
              <button onClick={handleBulkSubmit} disabled={!bulkText.trim()} className={`px-6 py-2 rounded-xl font-black text-sm shadow-md transition-all ${bulkText.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-900' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}>追加する</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto flex custom-scrollbar bg-zinc-50/5">
        {weekDays.map(date => {
          const { day, dateNum, month } = getDayInfo(date);
          const dayTasks = tasks.filter(t => t.date === date);
          const completedCount = dayTasks.filter(t => t.completed).length;
          const totalCount = dayTasks.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const isToday = date === new Date().toISOString().split('T')[0];
          const currentInput = inlineInputs[date] || '';
          
          return (
            <div key={date} className={`min-w-[360px] border-r-2 border-zinc-100 flex flex-col p-8 transition-all ${isToday ? 'bg-white shadow-2xl z-10 relative ring-4 ring-zinc-800/5' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-baseline space-x-3">
                   <span className={`text-3xl font-black ${isToday ? 'text-zinc-900' : 'text-zinc-800'}`}>{month}/{dateNum}</span>
                   <span className="text-xs font-black text-zinc-400 tracking-widest">{day}曜</span>
                </div>
                {isToday && <span className="text-[11px] font-black bg-zinc-800 text-white px-4 py-1.5 rounded-full tracking-widest shadow-lg shadow-zinc-100">今日</span>}
              </div>

              {/* 進捗バー */}
              <div className="mb-10">
                <div className="flex justify-between items-end mb-3">
                   <span className="text-[11px] font-black text-zinc-300 tracking-[0.2em]">一日の進捗</span>
                   <span className="text-sm font-black text-zinc-800">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                   <div className="h-full bg-zinc-800 transition-all duration-1000 shadow-[0_0_8px_rgba(244,63,94,0.3)]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mb-8 space-y-4 pr-1">
                {dayTasks.length > 0 ? (
                  dayTasks.map(t => (
                    <div key={t.id} className={`p-5 rounded-3xl border-2 transition-all ${t.completed ? 'bg-zinc-50 border-zinc-100 text-zinc-400 opacity-60' : 'bg-white border-zinc-200 text-zinc-700 shadow-md hover:border-zinc-400 hover:shadow-xl'}`}>
                       <div className="font-black text-base mb-3 leading-tight">{t.title}</div>
                       <div className="flex justify-between items-center text-[10px] font-black text-zinc-400 tracking-widest">
                          <span className="bg-zinc-50 text-zinc-400 px-3 py-1 rounded-full border border-zinc-100">{t.startTime || '予定なし'}</span>
                          {t.customerName && <span className="text-zinc-800 font-black">@{t.customerName}</span>}
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-zinc-100 rounded-[3rem] py-20 opacity-30">
                    <svg className="w-12 h-12 mb-3 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5"/></svg>
                    <span className="text-[11px] font-black tracking-[0.3em] text-zinc-300">予定なし</span>
                  </div>
                )}
              </div>
              
              <div className="pt-8 border-t-2 border-zinc-50">
                <div className="relative group">
                   <input 
                    value={currentInput}
                    onChange={(e) => setInlineInputs({ ...inlineInputs, [date]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd(date)}
                    placeholder="タスクを入力してEnter..."
                    className={`w-full text-sm p-5 rounded-2xl outline-none transition-all font-black placeholder:text-zinc-200 shadow-inner ${getInputStyle(currentInput)}`}
                  />
                  {!currentInput.trim() && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[10px] font-black text-zinc-300 tracking-widest animate-pulse">必須入力</span>
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
