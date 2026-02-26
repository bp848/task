
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
        const nextChar = bulkText[i+1];
        
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
                // Determine the year. If the month is less than the current month (e.g., it's Dec and we see Jan), it might be next year.
                // For simplicity, we'll use the current year, but if you need cross-year support, you can adjust this logic.
                let year = new Date().getFullYear();
                const currentMonth = new Date().getMonth() + 1;
                if (parseInt(m) < currentMonth - 6) { // Heuristic: if the month is far in the past, it's probably next year
                  year++;
                }
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
              
              if (title === '学ぶこと、行うこと：' || title === '') {
                 continue;
              }
              
              let customerName = '';
              const customerMatch = title.match(/^(.+?)様/);
              if (customerMatch) {
                customerName = customerMatch[1];
              }
              
              tasksToAdd.push({
                title,
                customerName,
                startTime,
                estimatedTime: 3600,
                details,
                date
              });
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
          if (customerMatch) {
            customerName = customerMatch[1];
          }
          currentTask = {
            title,
            customerName,
            startTime: currentStartTime,
            estimatedTime: currentEstimate,
            details: '',
            date: bulkTargetDate
          };
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
      onAddTask(
        t.title,
        'p1',
        [],
        t.estimatedTime,
        t.date,
        t.startTime || undefined,
        false,
        t.customerName || undefined,
        undefined,
        t.details || undefined
      );
    });

    setBulkText('');
    setIsBulkMode(false);
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
