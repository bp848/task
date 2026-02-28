
import React, { useState } from 'react';
import { Task } from '../../types';
import { extractCategories } from '../../constants';

interface PlannerViewProps {
  tasks: Task[];
  onAddTask: (title: string, projectId: string, tags: string[], estimate: number, date: string, startTime?: string, isRoutine?: boolean, customerName?: string, projectName?: string, details?: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onNavigateToDay?: (date: string) => void;
  weekOffset: number;
  setWeekOffset: (fn: (w: number) => number) => void;
  isBulkMode: boolean;
  setIsBulkMode: (v: boolean) => void;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`;
};

const PlannerView: React.FC<PlannerViewProps> = ({ tasks, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onNavigateToDay, weekOffset, setWeekOffset: _setWeekOffset, isBulkMode, setIsBulkMode }) => {
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [bulkText, setBulkText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState<string>('');

  const getWeekStart = (offset: number) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const monday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + offset * 7;
    const start = new Date(d);
    start.setDate(monday);
    return start;
  };

  const getISODateFromDate = (d: Date) => d.toISOString().split('T')[0];

  const getDayInfo = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('ja-JP', { weekday: 'short' });
    const dateNum = d.getDate();
    const month = d.getMonth() + 1;
    return { day, dateNum, month };
  };

  const weekStart = getWeekStart(weekOffset);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return getISODateFromDate(d);
  });
  const [bulkTargetDate, setBulkTargetDate] = useState(weekDays[0]);

  const handleInlineAdd = (date: string) => {
    const title = inlineInputs[date];
    if (title?.trim()) {
      const now = new Date();
      const startTime = date === now.toISOString().split('T')[0]
        ? now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '09:00';
      onAddTask(title, 'p1', [], 3600, date, startTime);
      setInlineInputs({ ...inlineInputs, [date]: '' });
    }
  };

  const handleSelectTask = (task: Task) => {
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    } else {
      setSelectedTaskId(task.id);
      setEditingDetails(task.details || '');
    }
  };

  const handleSaveDetails = (taskId: string) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, { details: editingDetails });
    }
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;

    const isTSV = bulkText.includes('\t') && /\d{1,2}\/\d{1,2}/.test(bulkText);
    const tasksToAdd: any[] = [];

    if (isTSV) {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < bulkText.length; i++) {
        const char = bulkText[i];
        const nextChar = bulkText[i + 1];

        if (inQuotes) {
          if (char === '"' && nextChar === '"') {
            currentCell += '"';
            i++;
          } else if (char === '"') {
            inQuotes = false;
          } else {
            currentCell += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === '\t') {
            currentRow.push(currentCell);
            currentCell = '';
          } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            if (char === '\r') i++;
          } else {
            currentCell += char;
          }
        }
      }
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
      }

      const hasOldHeaders = rows.some(r => r[0] && ['朝', 'AM', 'PM', '夜'].includes(r[0].trim()));

      if (hasOldHeaders) {
        let currentDates: string[] = [];
        let amCount = 0;
        let pmCount = 0;

        for (const row of rows) {
          if (!row || row.length === 0) continue;
          const rowHeader = row[0].trim();

          if (rowHeader === '朝') {
            currentDates = [];
            amCount = 0;
            pmCount = 0;
            for (let i = 1; i < row.length; i++) {
              const dateStr = row[i].trim();
              if (dateStr) {
                const [m, d] = dateStr.split('/');
                if (m && d) {
                  let year = new Date().getFullYear();
                  const currentMonth = new Date().getMonth() + 1;
                  if (parseInt(m) < currentMonth - 6) year++;
                  const isoDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                  currentDates[i] = isoDate;
                }
              }
            }
          } else if (['AM', 'PM', '夜'].includes(rowHeader)) {
            let startTime = '';
            if (rowHeader === 'AM') {
              startTime = amCount === 0 ? '09:00' : '10:30';
              amCount++;
            } else if (rowHeader === 'PM') {
              startTime = pmCount === 0 ? '13:00' : '15:00';
              pmCount++;
            } else if (rowHeader === '夜') {
              startTime = '18:00';
            }

            for (let i = 1; i < row.length; i++) {
              const cell = row[i]?.trim();
              const date = currentDates[i];
              if (cell && date) {
                let title = cell;
                let details = '';
                if (cell.includes('\n')) {
                  const lines = cell.split('\n');
                  title = lines[0].replace(/^学ぶこと、行うこと：/, '').trim();
                  details = lines.slice(1).join('\n').trim();
                } else {
                  title = cell.replace(/^学ぶこと、行うこと：/, '').trim();
                }
                if (title === '学ぶこと、行うこと：' || title === '') continue;
                let customerName = '';
                const customerMatch = title.match(/^(.+?)様/);
                if (customerMatch) customerName = customerMatch[1];
                tasksToAdd.push({ title, customerName, startTime, estimatedTime: 3600, details, date });
              }
            }
          }
        }
      } else {
        const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        let currentDates: (string | null)[] = [];
        let taskRowIndex = 0;

        for (const row of rows) {
          if (!row || row.every(c => !c.trim())) continue;

          const dateMatches = row.filter(c => /^\d{1,2}\/\d{1,2}$/.test(c.trim()));
          if (dateMatches.length >= 2) {
            currentDates = row.map(c => {
              const match = c.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
              if (!match) return null;
              const [, m, d] = match;
              let year = new Date().getFullYear();
              const currentMonth = new Date().getMonth() + 1;
              const mon = parseInt(m);
              if (mon < currentMonth - 6) year++;
              return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            });
            taskRowIndex = 0;
            continue;
          }

          if (currentDates.length === 0) continue;
          const startTime = TIME_SLOTS[Math.min(taskRowIndex, TIME_SLOTS.length - 1)];

          for (let i = 0; i < row.length; i++) {
            const cell = row[i]?.trim();
            const date = currentDates[i];
            if (!cell || !date) continue;

            let title = cell;
            let details = '';

            if (cell.includes('\n')) {
              const lines = cell.split('\n');
              title = lines[0].replace(/^学ぶこと、行うこと：/, '').trim();
              details = lines.slice(1).join('\n').trim();
            } else {
              title = cell.replace(/^学ぶこと、行うこと：/, '').trim();
            }

            if (!title || title === '学ぶこと、行うこと：') continue;

            let customerName = '';
            const customerMatch = title.match(/^(.+?)様/);
            if (customerMatch) customerName = customerMatch[1];

            tasksToAdd.push({ title, customerName, startTime, estimatedTime: 3600, details, date });
          }
          taskRowIndex++;
        }
      }
    } else {
      const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
      let currentStartTime = '';
      let currentEstimate = 3600;
      let currentTask: any = null;

      for (const line of lines) {
        if (line.startsWith('■')) {
          const timeMatch = line.match(/(\d{1,2}:\d{2})\s*[-–~〜]\s*(\d{1,2}:\d{2})/);
          if (timeMatch) {
            currentStartTime = timeMatch[1];
            const [sh, sm] = currentStartTime.split(':').map(Number);
            const [eh, em] = timeMatch[2].split(':').map(Number);
            let duration = (eh * 60 + em) - (sh * 60 + sm);
            if (duration < 0) duration += 24 * 60;
            currentEstimate = duration * 60;
          }
        } else if (line.startsWith('・') || line.startsWith('-') || line.startsWith('•')) {
          if (currentTask) tasksToAdd.push(currentTask);
          let title = line.replace(/^[・\-•]\s*/, '').trim();
          let customerName = '';
          const customerMatch = title.match(/^(.+?)様/);
          if (customerMatch) customerName = customerMatch[1];
          currentTask = { title, customerName, startTime: currentStartTime, estimatedTime: currentEstimate, details: '', date: bulkTargetDate };
        } else if (line.startsWith('（') || line.startsWith('(')) {
          if (currentTask) {
            const detailLine = line.replace(/^[（(]/, '').replace(/[）)]$/, '').trim();
            currentTask.details = currentTask.details ? currentTask.details + '\n' + detailLine : detailLine;
          }
        } else {
          if (currentTask) {
            currentTask.details = currentTask.details ? currentTask.details + '\n' + line : line;
          }
        }
      }
      if (currentTask) tasksToAdd.push(currentTask);
      tasksToAdd.reverse();
    }

    tasksToAdd.forEach(t => {
      onAddTask(t.title, 'p1', [], t.estimatedTime, t.date, t.startTime || undefined, false, t.customerName || undefined, undefined, t.details || undefined);
    });

    setBulkText('');
    setIsBulkMode(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 一括追加パネル（ヘッダーは左メニューに移動済み） */}
      {isBulkMode && (
        <div className="flex-shrink-0 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-sm text-slate-800">テキストから一括追加</h3>
            <select
              value={bulkTargetDate}
              onChange={e => setBulkTargetDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-slate-700"
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
            placeholder="■13:00–13:15&#10;・GSX様依頼連絡&#10;（ご依頼に対するメールの返信）"
            className="w-full p-3 rounded-lg outline-none text-sm font-bold text-slate-800 border border-slate-200 bg-white min-h-[100px] mb-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsBulkMode(false)} className="px-4 py-2 rounded-lg font-black text-xs text-slate-500 hover:bg-slate-100 cursor-pointer">閉じる</button>
            <button onClick={handleBulkSubmit} disabled={!bulkText.trim()} className={`px-5 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${bulkText.trim() ? 'bg-indigo-800 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>追加する</button>
          </div>
        </div>
      )}

      {/* 週間グリッド - フル画面使用 */}
      <div className="flex-1 grid grid-cols-7 min-h-0 overflow-hidden">
        {weekDays.map(date => {
          const { day, dateNum, month } = getDayInfo(date);
          const dayTasks = tasks.filter(t => t.date === date).sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
          const completedCount = dayTasks.filter(t => t.completed).length;
          const totalCount = dayTasks.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const isToday = date === todayStr;
          const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
          const currentInput = inlineInputs[date] || '';
          const totalTime = dayTasks.reduce((sum, t) => sum + t.estimatedTime, 0);

          return (
            <div key={date} className={`flex flex-col h-full border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-indigo-50/30' : isWeekend ? 'bg-slate-50/50' : 'bg-white'}`}>
              {/* 日付ヘッダー */}
              <div className={`flex-shrink-0 px-3 py-2.5 border-b ${isToday ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-lg font-black ${isToday ? 'text-indigo-800' : 'text-slate-700'}`}>{dateNum}</span>
                    <span className={`text-[11px] font-bold ${isToday ? 'text-indigo-500' : isWeekend ? 'text-red-400' : 'text-slate-400'}`}>{day}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {isToday && <span className="text-[9px] font-black bg-indigo-800 text-white px-2 py-0.5 rounded-full">今日</span>}
                    {totalCount > 0 && <span className="text-[9px] font-black text-slate-400">{completedCount}/{totalCount}</span>}
                  </div>
                </div>
                {/* 進捗バー */}
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-700 rounded-full ${isToday ? 'bg-indigo-600' : 'bg-slate-400'}`} style={{ width: `${progress}%` }} />
                </div>
                {totalTime > 0 && <div className="text-[9px] font-bold text-slate-400 mt-1">{formatTime(totalTime)}</div>}
              </div>

              {/* タスクリスト */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 p-2 space-y-1.5">
                {dayTasks.length > 0 ? (
                  dayTasks.map(t => {
                    const isSelected = selectedTaskId === t.id;
                    const cats = extractCategories(t.title, t.details);
                    return (
                      <div key={t.id}>
                        <div
                          onClick={() => handleSelectTask(t)}
                          className={`px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white border-indigo-400 ring-2 ring-indigo-100 shadow-md'
                              : t.completed
                                ? 'bg-slate-50 border-slate-100 opacity-50'
                                : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {onToggleTask && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleTask(t.id); }}
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                                  t.completed ? 'bg-indigo-700 border-indigo-700 text-white' : 'border-slate-300 hover:border-indigo-500'
                                }`}
                              >
                                {t.completed && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>}
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {t.startTime && <span className="text-[9px] font-black text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">{t.startTime}</span>}
                              </div>
                              <div className={`text-xs font-bold leading-snug ${t.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</div>
                              {t.customerName && <div className="text-[9px] text-slate-500 mt-0.5">@{t.customerName}</div>}
                              {cats.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {cats.map(cat => (
                                    <span key={cat.name} className="text-[8px] font-black px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: cat.color }}>
                                      {cat.icon} {cat.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {t.details && !isSelected && (
                                <div className="text-[9px] text-slate-400 mt-1 truncate">{t.details.split('\n')[0]}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 展開される詳細エリア */}
                        {isSelected && (
                          <div className="mt-1 bg-slate-50 rounded-lg border border-slate-200 p-2.5 animate-in fade-in">
                            <textarea
                              value={editingDetails}
                              onChange={(e) => setEditingDetails(e.target.value)}
                              onBlur={() => handleSaveDetails(t.id)}
                              placeholder="詳細・プロセスメモを入力..."
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 min-h-[60px] resize-y placeholder:text-slate-400"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2">
                                {onDeleteTask && (
                                  <button
                                    onClick={() => { onDeleteTask(t.id); setSelectedTaskId(null); }}
                                    className="text-[10px] font-black text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-all cursor-pointer"
                                  >
                                    削除
                                  </button>
                                )}
                              </div>
                              {onNavigateToDay && (
                                <button
                                  onClick={() => onNavigateToDay(date)}
                                  className="text-[10px] font-black text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <span>本日の業務で開く</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 opacity-30">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" /></svg>
                  </div>
                )}
              </div>

              {/* 入力欄 */}
              <div className="flex-shrink-0 px-2 py-2 border-t border-slate-100">
                <input
                  value={currentInput}
                  onChange={(e) => setInlineInputs({ ...inlineInputs, [date]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd(date)}
                  placeholder="タスクを追加..."
                  className="w-full text-xs p-2 rounded-lg outline-none border border-slate-100 bg-slate-50 placeholder:text-slate-300 font-bold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlannerView;
