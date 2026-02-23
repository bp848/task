
import React, { useState, useMemo } from 'react';
import { Task, Project } from '../../types';
import GeminiSummary from '../GeminiSummary';
import { commonTaskSuggestions } from '../../constants';

interface TodayViewProps {
  tasks: Task[];
  projects: Project[];
  onAddTask: (title: string, projectId: string, tags: string[], estimate: number, date: string, startTime?: string, isRoutine?: boolean, customerName?: string, projectName?: string) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  activeTaskId: string | null;
  onToggleTimer: (id: string) => void;
  targetDate: string;
  setTargetDate: (date: string) => void;
  onAddRoutines: () => void;
}

const formatStopwatch = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TodayView: React.FC<TodayViewProps> = ({ 
  tasks, projects, onAddTask, onToggleTask, activeTaskId, onToggleTimer, targetDate 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [projectInput, setProjectInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return commonTaskSuggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()));
  }, [inputValue]);

  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => t.date === targetDate);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.customerName?.toLowerCase().includes(q) || 
        t.projectName?.toLowerCase().includes(q)
      );
    }
    return list.sort((a,b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
    });
  }, [tasks, targetDate, searchQuery]);

  const handleAddTask = () => {
    if (!inputValue.trim()) return;
    onAddTask(inputValue, 'p1', [], 3600, targetDate, undefined, false, customerInput, projectInput);
    setInputValue('');
    setCustomerInput('');
    setProjectInput('');
    setShowSuggestions(false);
  };

  // 未入力時は「非常に薄い赤」、入力済みは「緑」のボーダー
  const getInputStyle = (val: string) => 
    `transition-all duration-300 border-2 ${val.trim() ? 'border-emerald-500 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/5'} focus:ring-4 focus:ring-opacity-20 ${val.trim() ? 'focus:ring-emerald-500' : 'focus:ring-rose-200'}`;

  return (
    <div className="flex flex-col h-full bg-rose-50/10 overflow-y-auto items-center py-8 px-4 pb-32">
      
      {/* 実行中タイマー */}
      {activeTask && (
        <div className="w-full max-w-3xl mb-10">
          <div className="bg-slate-900 rounded-3xl p-10 shadow-2xl border-4 border-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-3 h-full bg-rose-500"></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <span className="text-[12px] font-black text-rose-400 tracking-[0.2em] mb-3 block">現在計測中</span>
                <h3 className="text-3xl font-black">{activeTask.title}</h3>
                <p className="text-base text-slate-400 mt-2 font-bold">{activeTask.customerName} @ {activeTask.projectName}</p>
              </div>
              <div className="text-right">
                <div className="text-6xl font-mono font-black tracking-tighter mb-6">{formatStopwatch(activeTask.timeSpent)}</div>
                <button 
                  onClick={() => onToggleTimer(activeTask.id)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-base transition-all shadow-xl shadow-rose-900/40 active:scale-95"
                >
                  計測ストップ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="w-full max-w-3xl mb-10">
        <div className="bg-white rounded-3xl shadow-xl border-2 border-rose-50 overflow-hidden">
          <div className="p-8 space-y-6">
             <div className="relative">
               <label className="text-[11px] font-black text-rose-300 tracking-widest mb-2 block">新しいタスクの追加</label>
               <input 
                 value={inputValue}
                 onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                 onFocus={() => setShowSuggestions(true)}
                 placeholder="例: ZENBI 4月号 進行管理・校正依頼" 
                 className={`w-full p-5 rounded-2xl outline-none text-xl font-black text-slate-800 ${getInputStyle(inputValue)}`}
               />
               {showSuggestions && filteredSuggestions.length > 0 && (
                 <div className="absolute left-0 right-0 top-full mt-3 bg-white border-2 border-rose-50 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                   {filteredSuggestions.map((s, i) => (
                     <button
                       key={i}
                       className="w-full text-left px-6 py-4 text-sm text-slate-700 hover:bg-rose-50 font-black border-b border-rose-50 last:border-0 flex justify-between items-center"
                       onClick={() => { setInputValue(s); setShowSuggestions(false); }}
                     >
                       <span>{s}</span>
                       <span className="text-[10px] bg-rose-100 text-rose-600 px-3 py-1 rounded-full">AI予測</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
             <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-[11px] font-black text-rose-300 tracking-widest mb-2 block">顧客名</label>
                  <input 
                    value={customerInput} 
                    onChange={(e) => setCustomerInput(e.target.value)} 
                    placeholder="例: 全美" 
                    className={`w-full text-sm p-4 rounded-2xl outline-none font-black ${getInputStyle(customerInput)}`} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-black text-rose-300 tracking-widest mb-2 block">案件名</label>
                  <input 
                    value={projectInput} 
                    onChange={(e) => setProjectInput(e.target.value)} 
                    placeholder="例: 4月号" 
                    className={`w-full text-sm p-4 rounded-2xl outline-none font-black ${getInputStyle(projectInput)}`} 
                  />
                </div>
             </div>
          </div>
          <div className="bg-rose-50/30 px-8 py-5 flex items-center justify-between border-t-2 border-rose-50">
             <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${inputValue ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-rose-200 animate-pulse'}`}></div>
                <span className="text-[11px] text-rose-400 font-black tracking-widest">
                  {inputValue ? '登録できます' : 'タスク名を入力してください'}
                </span>
             </div>
             <button 
               onClick={handleAddTask} 
               disabled={!inputValue.trim()}
               className={`px-10 py-3.5 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 ${inputValue.trim() ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
               タスクを追加
             </button>
          </div>
        </div>
      </div>

      {/* タスクリスト */}
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between px-3 mb-6">
           <div className="flex items-center space-x-4">
             <h3 className="text-sm font-black text-slate-800 tracking-[0.2em]">本日のタスク</h3>
             <span className="text-[11px] bg-rose-100 text-rose-600 px-3 py-1 rounded-full font-black">{filteredTasks.length}</span>
           </div>
           <div className="flex items-center space-x-3">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タスク、顧客、案件で検索..." 
                className="bg-white border-2 border-rose-50 text-[11px] font-black px-5 py-2.5 rounded-full outline-none focus:ring-4 ring-rose-500/10 w-56 transition-all"
              />
           </div>
        </div>

        {filteredTasks.length > 0 ? filteredTasks.map(task => {
          const isActive = activeTaskId === task.id;
          return (
            <div key={task.id} className={`bg-white rounded-3xl border-2 p-6 flex items-center transition-all ${
              task.completed 
                ? 'opacity-60 grayscale bg-slate-50 border-slate-100' 
                : isActive 
                  ? 'border-rose-500 ring-4 ring-rose-50 shadow-2xl scale-[1.02]' 
                  : 'border-slate-200 hover:border-rose-400 shadow-lg'
            }`}>
              <button 
                onClick={() => onToggleTask(task.id)} 
                className={`w-8 h-8 rounded-2xl border-4 flex items-center justify-center shrink-0 mr-6 transition-all ${task.completed ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'border-slate-200 hover:border-rose-500'}`}
              >
                {task.completed && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4 mb-2">
                  {task.startTime && <span className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full font-black tracking-tighter shadow-sm">{task.startTime}</span>}
                  <span className={`text-lg font-black truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</span>
                </div>
                <div className="flex items-center space-x-4 text-[11px] font-black text-slate-400">
                  {task.customerName && <span className="text-rose-400 tracking-tighter">@{task.customerName}</span>}
                  {task.projectName && <span className="text-slate-200">|</span>}
                  {task.projectName && <span className="tracking-tighter">{task.projectName}</span>}
                </div>
              </div>

              <div className="flex items-center space-x-8 ml-8">
                <div className="text-right">
                  <div className={`text-xl font-mono font-black ${isActive ? 'text-rose-600' : 'text-slate-600'}`}>{formatStopwatch(task.timeSpent)}</div>
                  <div className="text-[9px] text-slate-400 font-black tracking-widest">実績時間</div>
                </div>
                {!task.completed && (
                  <button 
                    onClick={() => onToggleTimer(task.id)}
                    className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 ${isActive ? 'bg-white text-rose-500 border-rose-500 shadow-rose-100' : 'bg-slate-900 text-white hover:bg-rose-500 border-slate-900 shadow-slate-200'}`}
                  >
                    {isActive ? (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
            <svg className="w-20 h-20 mb-6 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="1.5"/></svg>
            <p className="text-lg font-black text-rose-300 tracking-[0.3em]">タスクが見つかりません</p>
          </div>
        )}
      </div>

      <div className="mt-20 w-full max-w-2xl">
        <GeminiSummary tasks={tasks} targetDate={targetDate} />
      </div>
    </div>
  );
};

export default TodayView;
