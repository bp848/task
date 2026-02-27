
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

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;

    const isTSV = bulkText.includes('\t') && bulkText.includes('朝');
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

  return (
    <div className="h-full bg-zinc-50/10 flex flex-col overflow-hidden border-t-2 border-zinc-100">
      <div className="p-6 pb-0 flex-shrink-0">
        <header className="mb-4 flex justify-between items-center">
          <h2 className="text-base font-black text-zinc-800 tracking-tight">週間プランナー</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsBulkMode(!isBulkMode)}
              className="bg-white text-zinc-600 border-2 border-zinc-200 px-4 py-2 rounded-xl font-black text-xs shadow-sm hover:bg-zinc-50 transition-all"
            >
              {isBulkMode ? '閉じる' : 'テキストから一括追加'}
            </button>
          </div>
        </header>

        {isBulkMode && (
          <div className="mb-4 bg-white p-5 rounded-2xl border-2 border-zinc-200 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-zinc-800">テキストから一括追加</h3>
              <select
                value={bulkTargetDate}
                onChange={e => setBulkTargetDate(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none text-zinc-700"
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
              className="w-full p-3 rounded-xl outline-none text-xs font-bold text-zinc-800 border border-zinc-200 bg-zinc-50 min-h-[100px] mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsBulkMode(false)} className="px-4 py-2 rounded-xl font-black text-xs text-zinc-500 hover:bg-zinc-100">キャンセル</button>
              <button onClick={handleBulkSubmit} disabled={!bulkText.trim()} className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${bulkText.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-900' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}>追加する</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto flex custom-scrollbar bg-zinc-50/5 min-h-0">
        {weekDays.map(date => {
          const { day, dateNum, month } = getDayInfo(date);
          const dayTasks = tasks.filter(t => t.date === date);
          const completedCount = dayTasks.filter(t => t.completed).length;
          const totalCount = dayTasks.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const isToday = date === new Date().toISOString().split('T')[0];
          const currentInput = inlineInputs[date] || '';

          return (
            <div key={date} className={`min-w-[160px] border-r border-zinc-100 flex flex-col h-full ${isToday ? 'bg-white shadow-lg z-10 relative' : ''}`}>
              {/* 日付ヘッダー */}
              <div className="flex-shrink-0 px-2 pt-2 pb-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-sm font-black ${isToday ? 'text-zinc-900' : 'text-zinc-600'}`}>{month}/{dateNum}</span>
                    <span className="text-[10px] font-bold text-zinc-400">{day}</span>
                  </div>
                  {isToday && <span className="text-[8px] font-black bg-zinc-800 text-white px-1.5 py-0.5 rounded-full">今日</span>}
                </div>
                <div className="h-0.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* タスクリスト */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-1.5 py-1 space-y-1">
                {dayTasks.length > 0 ? (
                  dayTasks.map(t => (
                    <div key={t.id} className={`px-1.5 py-1 rounded-md border transition-all ${t.completed ? 'bg-zinc-50 border-zinc-100 opacity-40' : 'bg-white border-zinc-200 hover:border-zinc-400'}`}>
                      {t.startTime && (
                        <div className="text-[10px] font-black text-zinc-800 leading-none mb-0.5">{t.startTime}</div>
                      )}
                      <div className={`text-[11px] font-medium leading-tight ${t.completed ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>{t.title}</div>
                      {t.customerName && <div className="text-[9px] text-zinc-400 mt-0.5 truncate">@{t.customerName}</div>}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-4 opacity-20">
                    <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" /></svg>
                  </div>
                )}
              </div>

              {/* 入力欄 */}
              <div className="flex-shrink-0 px-1.5 py-1.5 border-t border-zinc-100">
                <input
                  value={currentInput}
                  onChange={(e) => setInlineInputs({ ...inlineInputs, [date]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd(date)}
                  placeholder="+"
                  className="w-full text-xs p-1 rounded outline-none border border-zinc-100 bg-zinc-50 placeholder:text-zinc-300 font-bold focus:border-zinc-400 transition-all"
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
