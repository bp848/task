
import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { extractCategories } from '../../constants';

interface CustomerViewProps {
  tasks: Task[];
  targetDate: string;
  onSelectTask?: (id: string) => void;
  onToggleTask?: (id: string) => void;
}

// Assign a stable color to each customer
const CUSTOMER_COLORS = [
  '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#EF4444', '#84CC16', '#A855F7',
];

const CustomerView: React.FC<CustomerViewProps> = ({ tasks, targetDate, onSelectTask, onToggleTask }) => {
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const filteredTasks = useMemo(() => {
    const now = new Date(targetDate);
    switch (dateRange) {
      case 'today':
        return tasks.filter(t => t.date === targetDate);
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return tasks.filter(t => t.date >= weekAgo.toISOString().split('T')[0] && t.date <= targetDate);
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return tasks.filter(t => t.date >= monthAgo.toISOString().split('T')[0] && t.date <= targetDate);
      }
      case 'all':
        return tasks;
    }
  }, [tasks, targetDate, dateRange]);

  const customers = useMemo(() => {
    const custMap: Record<string, {
      tasks: Task[];
      totalTime: number;
      completedCount: number;
      categories: Record<string, number>;
      dates: Set<string>;
    }> = {};

    filteredTasks.forEach(t => {
      const name = t.customerName || '（顧客未設定）';
      if (!custMap[name]) {
        custMap[name] = { tasks: [], totalTime: 0, completedCount: 0, categories: {}, dates: new Set() };
      }
      custMap[name].tasks.push(t);
      custMap[name].totalTime += t.timeSpent;
      if (t.completed) custMap[name].completedCount++;
      custMap[name].dates.add(t.date);

      extractCategories(t.title, t.details).forEach(cat => {
        custMap[name].categories[cat.name] = (custMap[name].categories[cat.name] || 0) + 1;
      });
    });

    return custMap;
  }, [filteredTasks]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`;
  };

  const getCustomerColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CUSTOMER_COLORS[Math.abs(hash) % CUSTOMER_COLORS.length];
  };

  const totalTasks = filteredTasks.length;
  const totalTime = filteredTasks.reduce((s, t) => s + t.timeSpent, 0);
  const customerCount = Object.keys(customers).filter(n => n !== '（顧客未設定）').length;

  if (filteredTasks.length === 0) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm font-bold text-zinc-400">対象期間のタスクがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-black text-zinc-800 tracking-tight">顧客ベース</h2>
            <p className="text-xs font-bold text-zinc-400 mt-1">顧客別の作業状況・時間集計</p>
          </div>
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
            {(['today', 'week', 'month', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide transition-all ${
                  dateRange === r ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {r === 'today' ? '本日' : r === 'week' ? '1週間' : r === 'month' ? '1ヶ月' : '全期間'}
              </button>
            ))}
          </div>
        </header>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border-2 border-zinc-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-zinc-800">{customerCount}</div>
            <div className="text-[9px] font-bold text-zinc-400 tracking-wide">顧客数</div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-zinc-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-blue-600">{totalTasks}</div>
            <div className="text-[9px] font-bold text-zinc-400 tracking-wide">全タスク</div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-zinc-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-green-600">{formatTime(totalTime)}</div>
            <div className="text-[9px] font-bold text-zinc-400 tracking-wide">合計時間</div>
          </div>
        </div>

        {/* Customer cards */}
        <div className="space-y-3">
          {Object.entries(customers)
            .sort(([, a], [, b]) => b.tasks.length - a.tasks.length)
            .map(([name, data]) => {
              const isExpanded = expandedCustomer === name;
              const color = getCustomerColor(name);
              const completionRate = data.tasks.length > 0 ? Math.round((data.completedCount / data.tasks.length) * 100) : 0;

              return (
                <div
                  key={name}
                  className={`bg-white rounded-2xl border-2 transition-all cursor-pointer ${
                    isExpanded ? 'border-zinc-300 shadow-lg' : 'border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200'
                  }`}
                  onClick={() => setExpandedCustomer(isExpanded ? null : name)}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-zinc-800">{name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-zinc-400">{data.tasks.length}件</span>
                            <span className="text-[10px] font-bold text-zinc-300">|</span>
                            <span className="text-[10px] font-bold text-zinc-400">{formatTime(data.totalTime)}</span>
                            {data.dates.size > 1 && (
                              <>
                                <span className="text-[10px] font-bold text-zinc-300">|</span>
                                <span className="text-[10px] font-bold text-zinc-400">{data.dates.size}日</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-lg font-black" style={{ color }}>{completionRate}%</span>
                        </div>
                        <svg className={`w-4 h-4 text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Category badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Object.entries(data.categories).map(([cat, count]) => (
                        <span key={cat} className="text-[9px] font-black text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                          {cat} {count}件
                        </span>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${completionRate}%`, backgroundColor: color }}
                      />
                    </div>

                    {/* Expanded task list */}
                    {isExpanded && (
                      <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                        {data.tasks
                          .sort((a, b) => (b.date + (b.startTime || '')).localeCompare(a.date + (a.startTime || '')))
                          .map(task => (
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
                                  {dateRange !== 'today' && (
                                    <span className="text-[9px] font-bold text-zinc-400">{task.date}</span>
                                  )}
                                  {task.startTime && (
                                    <span className="text-[9px] font-bold text-zinc-400">{task.startTime}{task.endTime ? `–${task.endTime}` : ''}</span>
                                  )}
                                  {task.details && (
                                    <span className="text-[9px] font-bold text-blue-400 truncate max-w-[150px]">{task.details}</span>
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
      </div>
    </div>
  );
};

export default CustomerView;
