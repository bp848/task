
import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '../../types';

interface ScheduleViewProps {
  tasks: Task[];
  targetDate: string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ tasks, targetDate }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const hours = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`);

  const getTaskStyle = (startTime?: string, timeSpent: number = 0, estimatedTime: number = 3600) => {
    if (!startTime) return null;
    const [h, m] = startTime.split(':').map(Number);
    const top = (h * 80) + (m / 60 * 80); 
    const duration = timeSpent > 0 ? timeSpent : estimatedTime;
    const height = (duration / 3600) * 80;
    return { 
      top: `${top}px`,
      height: `${Math.max(height, 30)}px`
    };
  };

  const getCurrentTimePos = () => {
    const h = now.getHours();
    const m = now.getMinutes();
    return (h * 80) + (m / 60 * 80);
  };

  const isSelectedDateToday = targetDate === now.toISOString().split('T')[0];
  const currentTimePos = isSelectedDateToday ? getCurrentTimePos() : -100;

  const dayTasks = useMemo(() => {
    return tasks.filter(t => t.startTime && t.date === targetDate);
  }, [tasks, targetDate]);

  return (
    <div className="h-full bg-white flex flex-col border-t-2 border-rose-100">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="flex min-h-[1920px]">
          {/* 時間目盛り */}
          <div className="w-20 border-r border-rose-50 bg-rose-50/20 shrink-0">
            {hours.map(h => (
              <div key={h} className="h-20 px-4 text-[11px] font-black text-rose-300 pt-1 text-right border-b border-rose-50/50">
                {h}
              </div>
            ))}
          </div>

          {/* タイムライン */}
          <div className="flex-1 relative bg-white">
            {/* 現在時刻マーカー */}
            {currentTimePos > 0 && (
              <div 
                className="absolute left-0 right-0 h-[2px] bg-rose-500 z-30 pointer-events-none flex items-center"
                style={{ top: `${currentTimePos}px` }}
              >
                <div className="w-3 h-3 bg-rose-500 rounded-full -ml-1.5 shadow-md shadow-rose-200"></div>
                <div className="ml-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">現在時刻</div>
              </div>
            )}
            
            {/* 背景グリッド */}
            <div className="absolute inset-0 z-0">
               {hours.map(h => (
                 <div key={h} className="h-20 border-b border-rose-50/50 flex items-center justify-end pr-4 pointer-events-none">
                    <span className="text-[9px] font-bold text-rose-100 tracking-widest">{h} 枠</span>
                 </div>
               ))}
            </div>

            {/* タスクブロック */}
            {dayTasks.map(task => (
              <div 
                key={task.id} 
                className={`absolute left-4 right-10 rounded-xl p-3 text-xs shadow-lg z-20 border-l-[6px] transition-all cursor-pointer hover:scale-[1.01] hover:z-40 ${
                  task.completed 
                    ? 'bg-slate-50 text-slate-400 border-slate-300 opacity-60' 
                    : 'bg-rose-500 text-white border-rose-800'
                }`} 
                style={getTaskStyle(task.startTime, task.timeSpent, task.estimatedTime) || {}}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-[10px] opacity-80">{task.startTime}</span>
                  {task.timeSpent > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-bold">実績</span>}
                </div>
                <div className="font-bold truncate text-sm">{task.title}</div>
                {(task.customerName || task.projectName) && (
                  <div className="mt-1 opacity-70 text-[10px] font-bold truncate">
                    {task.customerName} @ {task.projectName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
