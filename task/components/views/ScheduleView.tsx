import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task } from '../../types';

interface ScheduleViewProps {
  tasks: Task[];
  targetDate: string;
  setTargetDate?: (date: string) => void;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function parseTime(timeStr: string): { h: number; m: number } | null {
  if (!timeStr) return null;
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return null;
    return { h: d.getHours(), m: d.getMinutes() };
  }
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { h: parts[0], m: parts[1] };
}

function getTopPx(h: number, m: number): number {
  return ((h - START_HOUR) * HOUR_HEIGHT) + (m / 60 * HOUR_HEIGHT);
}

function getHeightPx(seconds: number): number {
  return Math.max((seconds / 3600) * HOUR_HEIGHT, 24);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ tasks, targetDate, setTargetDate }) => {
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const h = now.getHours();
      const scrollTo = Math.max(getTopPx(h, 0) - 100, 0);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []);

  const isToday = targetDate === now.toISOString().split('T')[0];

  const dayTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === targetDate && t.startTime)
      .sort((a, b) => {
        const ta = parseTime(a.startTime!);
        const tb = parseTime(b.startTime!);
        if (!ta || !tb) return 0;
        return (ta.h * 60 + ta.m) - (tb.h * 60 + tb.m);
      });
  }, [tasks, targetDate]);

  const calendarEvents = useMemo(() => dayTasks.filter(t => t.tags.includes('Google Calendar')), [dayTasks]);
  const regularTasks = useMemo(() => dayTasks.filter(t => !t.tags.includes('Google Calendar')), [dayTasks]);

  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i), []);

  const dateObj = new Date(targetDate + 'T00:00:00');
  const dayLabel = dateObj.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const goToDate = (offset: number) => {
    const d = new Date(targetDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setTargetDate?.(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setTargetDate?.(new Date().toISOString().split('T')[0]);
  };

  const computeColumns = (items: Task[]) => {
    const positions: { task: Task; col: number; totalCols: number; top: number; height: number }[] = [];
    const placed: { task: Task; col: number; top: number; bottom: number }[] = [];

    for (const task of items) {
      const time = parseTime(task.startTime!);
      if (!time) continue;
      const top = getTopPx(time.h, time.m);
      const duration = task.timeSpent > 0 ? task.timeSpent : task.estimatedTime;
      const height = getHeightPx(duration);
      const bottom = top + height;

      const overlapping = placed.filter(p => p.top < bottom && p.bottom > top);
      const usedCols = new Set(overlapping.map(p => p.col));
      let col = 0;
      while (usedCols.has(col)) col++;

      placed.push({ task, col, top, bottom });
      positions.push({ task, col, totalCols: 0, top, height });
    }

    for (const pos of positions) {
      const overlapping = positions.filter(p =>
        p.top < pos.top + pos.height && p.top + p.height > pos.top
      );
      const maxCol = Math.max(...overlapping.map(p => p.col)) + 1;
      for (const o of overlapping) {
        o.totalCols = Math.max(o.totalCols, maxCol);
      }
    }

    return positions;
  };

  const taskPositions = useMemo(() => computeColumns(regularTasks), [regularTasks]);
  const eventPositions = useMemo(() => computeColumns(calendarEvents), [calendarEvents]);

  const currentTimeTop = isToday ? getTopPx(now.getHours(), now.getMinutes()) : -100;
  const currentTimeLabel = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.completed).length;
  const totalTime = dayTasks.reduce((sum, t) => sum + (t.timeSpent > 0 ? t.timeSpent : t.estimatedTime), 0);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-zinc-100 px-6 py-3 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => goToDate(-1)} className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-all text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={goToToday} className="px-3 py-1 rounded-lg text-[11px] font-black text-zinc-500 hover:bg-zinc-100 transition-all">今日</button>
            <button onClick={() => goToDate(1)} className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-all text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <h2 className="text-base font-black text-zinc-800">{dayLabel}</h2>
          {isToday && <span className="text-[10px] font-black text-white bg-blue-500 px-2 py-0.5 rounded-full">TODAY</span>}
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400">
          <span>{totalTasks}件</span>
          <span>{completedTasks}完了</span>
          <span>{formatDuration(totalTime)}</span>
          <div className="flex items-center gap-2 ml-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-800 inline-block"></span>タスク</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>カレンダー</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex" style={{ minHeight: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
          {/* Time gutter */}
          <div className="w-16 shrink-0 border-r border-zinc-100 relative">
            {hours.map(h => (
              <div
                key={h}
                className="absolute w-full text-right pr-3"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-[11px] font-bold text-zinc-300 leading-none relative -top-2">
                  {`${h.toString().padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Main calendar area */}
          <div className="flex-1 relative">
            {/* Hour gridlines */}
            {hours.map(h => (
              <React.Fragment key={h}>
                <div
                  className="absolute left-0 right-0 border-t border-zinc-100"
                  style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                />
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-zinc-50"
                  style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                />
              </React.Fragment>
            ))}

            {/* Current time indicator */}
            {isToday && currentTimeTop >= 0 && currentTimeTop <= TOTAL_HOURS * HOUR_HEIGHT && (
              <div
                className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-md"></div>
                <div className="flex-1 h-[2px] bg-red-500"></div>
                <span className="text-[9px] font-black text-red-500 bg-white px-1.5 py-0.5 rounded shadow-sm mr-2">{currentTimeLabel}</span>
              </div>
            )}

            {/* Google Calendar events (left portion) */}
            {eventPositions.map(({ task, col, totalCols, top, height }) => {
              const width = totalCols > 0 ? (48 / totalCols) : 48;
              const left = 2 + col * width;
              return (
                <div
                  key={`cal-${task.id}`}
                  className="absolute rounded-lg px-2 py-1.5 text-xs border-l-[3px] border-blue-500 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer overflow-hidden z-20"
                  style={{ top: `${top}px`, height: `${height}px`, left: `${left}%`, width: `${width - 1}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span className="font-bold text-blue-800 truncate text-[11px]">{task.title}</span>
                  </div>
                  {height > 36 && task.startTime && (
                    <div className="text-[9px] text-blue-400 font-bold mt-0.5">
                      {(() => {
                        const t = parseTime(task.startTime!);
                        if (!t) return '';
                        const start = `${t.h.toString().padStart(2, '0')}:${t.m.toString().padStart(2, '0')}`;
                        if (task.endTime) {
                          const e = parseTime(task.endTime);
                          if (e) return `${start} - ${e.h.toString().padStart(2, '0')}:${e.m.toString().padStart(2, '0')}`;
                        }
                        return start;
                      })()}
                    </div>
                  )}
                  {height > 50 && task.customerName && (
                    <div className="text-[9px] text-blue-500 font-bold mt-0.5 truncate">@{task.customerName}</div>
                  )}
                </div>
              );
            })}

            {/* Regular tasks */}
            {taskPositions.map(({ task, col, totalCols, top, height }) => {
              const hasCalEvents = eventPositions.length > 0;
              const baseLeft = hasCalEvents ? 52 : 2;
              const baseWidth = hasCalEvents ? 46 : 96;
              const width = totalCols > 0 ? (baseWidth / totalCols) : baseWidth;
              const left = baseLeft + col * width;

              return (
                <div
                  key={`task-${task.id}`}
                  className={`absolute rounded-lg px-2 py-1.5 text-xs border-l-[3px] transition-all cursor-pointer overflow-hidden z-20 ${
                    task.completed
                      ? 'bg-zinc-50 border-zinc-300 opacity-60'
                      : 'bg-zinc-800 border-zinc-900 hover:bg-zinc-700'
                  }`}
                  style={{ top: `${top}px`, height: `${height}px`, left: `${left}%`, width: `${width - 1}%` }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold truncate text-[11px] ${task.completed ? 'text-zinc-400 line-through' : 'text-white'}`}>
                      {task.title}
                    </span>
                    {task.timeSpent > 0 && (
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ml-1 ${task.completed ? 'bg-zinc-200 text-zinc-400' : 'bg-white/20 text-white/70'}`}>
                        {formatDuration(task.timeSpent)}
                      </span>
                    )}
                  </div>
                  {height > 36 && (
                    <div className={`text-[9px] font-bold mt-0.5 ${task.completed ? 'text-zinc-300' : 'text-white/50'}`}>
                      {task.startTime && (() => {
                        const t = parseTime(task.startTime!);
                        return t ? `${t.h.toString().padStart(2, '0')}:${t.m.toString().padStart(2, '0')}` : '';
                      })()}
                      {task.estimatedTime > 0 && ` (${formatDuration(task.estimatedTime)})`}
                    </div>
                  )}
                  {height > 50 && (
                    <div className={`flex items-center gap-1 mt-1 ${task.completed ? 'text-zinc-300' : 'text-white/60'}`}>
                      {task.customerName && <span className="text-[9px] font-bold truncate">@{task.customerName}</span>}
                      {task.tags.filter(t => t !== 'Google Calendar').map(tag => (
                        <span key={tag} className={`text-[8px] font-bold px-1 py-0.5 rounded ${task.completed ? 'bg-zinc-100' : 'bg-white/10'}`}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {dayTasks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-zinc-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p className="text-sm font-bold text-zinc-300">予定なし</p>
                  <p className="text-[10px] text-zinc-200 font-bold mt-1">「本日の業務」でタスクを追加してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
