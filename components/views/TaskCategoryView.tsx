
import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { TASK_CATEGORY_KEYWORDS, extractCategories, extractSoftware } from '../../constants';

interface TaskCategoryViewProps {
  tasks: Task[];
  targetDate: string;
  onSelectTask?: (id: string) => void;
  onToggleTask?: (id: string) => void;
}

const TaskCategoryView: React.FC<TaskCategoryViewProps> = ({ tasks, targetDate, onSelectTask, onToggleTask }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const dayTasks = useMemo(() => tasks.filter(t => t.date === targetDate), [tasks, targetDate]);

  const categories = useMemo(() => {
    const catMap: Record<string, { color: string; icon: string; tasks: Task[]; totalTime: number; completedCount: number }> = {};

    // Uncategorized bucket
    const uncategorized: Task[] = [];

    dayTasks.forEach(t => {
      const cats = extractCategories(t.title, t.details);
      if (cats.length === 0) {
        uncategorized.push(t);
      } else {
        cats.forEach(cat => {
          if (!catMap[cat.name]) {
            catMap[cat.name] = { color: cat.color, icon: cat.icon, tasks: [], totalTime: 0, completedCount: 0 };
          }
          catMap[cat.name].tasks.push(t);
          catMap[cat.name].totalTime += t.timeSpent;
          if (t.completed) catMap[cat.name].completedCount++;
        });
      }
    });

    if (uncategorized.length > 0) {
      catMap['その他'] = {
        color: '#9CA3AF',
        icon: '📋',
        tasks: uncategorized,
        totalTime: uncategorized.reduce((s, t) => s + t.timeSpent, 0),
        completedCount: uncategorized.filter(t => t.completed).length,
      };
    }

    return catMap;
  }, [dayTasks]);

  // Software usage summary
  const softwareUsage = useMemo(() => {
    const swMap: Record<string, { icon: string; count: number; tasks: string[] }> = {};
    dayTasks.forEach(t => {
      extractSoftware(t.title, t.details).forEach(sw => {
        if (!swMap[sw.name]) swMap[sw.name] = { icon: sw.icon, count: 0, tasks: [] };
        swMap[sw.name].count++;
        swMap[sw.name].tasks.push(t.title);
      });
    });
    return swMap;
  }, [dayTasks]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`;
  };

  if (dayTasks.length === 0) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-sm font-bold text-zinc-400">本日のタスクがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="mb-6">
          <h2 className="text-xl font-black text-zinc-800 tracking-tight">作業ベース</h2>
          <p className="text-xs font-bold text-zinc-400 mt-1">タスクカテゴリ別の作業状況</p>
        </header>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(categories)
            .sort(([, a], [, b]) => b.tasks.length - a.tasks.length)
            .map(([name, data]) => {
              const isExpanded = expandedCategory === name;
              const completionRate = data.tasks.length > 0 ? Math.round((data.completedCount / data.tasks.length) * 100) : 0;

              return (
                <div
                  key={name}
                  className={`bg-white rounded-2xl border-2 transition-all cursor-pointer ${
                    isExpanded ? 'border-zinc-300 shadow-lg col-span-1 md:col-span-2' : 'border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200'
                  }`}
                  onClick={() => setExpandedCategory(isExpanded ? null : name)}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{data.icon}</span>
                        <div>
                          <h3 className="text-sm font-black text-zinc-800">{name}</h3>
                          <p className="text-[10px] font-bold text-zinc-400">{data.tasks.length}件 / {formatTime(data.totalTime)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-lg font-black" style={{ color: data.color }}>{completionRate}%</span>
                          <p className="text-[9px] font-bold text-zinc-400">完了</p>
                        </div>
                        <svg className={`w-4 h-4 text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${completionRate}%`, backgroundColor: data.color }}
                      />
                    </div>

                    {/* Expanded task list */}
                    {isExpanded && (
                      <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                        {data.tasks.map(task => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              task.completed ? 'opacity-50 bg-zinc-50' : 'bg-zinc-50/50 hover:bg-zinc-100/50'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTask?.(task.id);
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTask?.(task.id);
                              }}
                              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                task.completed ? 'bg-green-500 border-green-500' : 'border-zinc-300 hover:border-zinc-400'
                              }`}
                            >
                              {task.completed && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {task.customerName && (
                                  <span className="text-[9px] font-bold text-blue-500">{task.customerName}</span>
                                )}
                                {task.startTime && (
                                  <span className="text-[9px] font-bold text-zinc-400">{task.startTime}{task.endTime ? `–${task.endTime}` : ''}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-zinc-400 shrink-0">
                              {formatTime(task.timeSpent)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Software usage */}
        {Object.keys(softwareUsage).length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-zinc-100 p-5 shadow-sm">
            <h3 className="text-[11px] font-black text-zinc-500 tracking-widest mb-4">使用ソフトウェア</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(softwareUsage)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([name, data]) => (
                  <div key={name} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl">
                    <span className="text-lg">{data.icon}</span>
                    <div>
                      <span className="text-xs font-black text-blue-700">{name}</span>
                      <span className="text-[10px] font-bold text-blue-400 ml-1">{data.count}件</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCategoryView;
