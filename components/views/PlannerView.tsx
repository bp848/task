
import React, { useState, useMemo } from 'react';
import { Task } from '../../types';

interface PlannerViewProps {
  tasks: Task[];
  onAddTask: (title: string, projectId: string, tags: string[], estimate: number, date: string, startTime?: string, isRoutine?: boolean, customerName?: string, projectName?: string, details?: string) => void;
}

interface ParsedTask {
  title: string;
  details: string;
  date: string;
  startTime: string;
  slotLabel: string;
}

// RFC 4180準拠のTSVパーサー（セル内改行・ダブルクォート対応）
function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { cell += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === '\t') { row.push(cell); cell = ''; i++; }
      else if (ch === '\n' || ch === '\r') {
        row.push(cell); rows.push(row); row = []; cell = ''; i++;
        if (ch === '\r' && text[i] === '\n') i++;
      } else { cell += ch; i++; }
    }
  }
  if (cell || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// セル内容からタイトルを抽出
function extractTitle(content: string): string {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const patterns = [
    /^(?:学ぶこと[、,]行うこと)[：:]\s*(.+)/,
    /^訪問先[：:]\s*(.+)/,
    /^お客様名[：:]\s*(.+)/,
    /^機械・場所名[：:]\s*(.+)/,
    /^媒体名[：:]\s*(.+)/,
    /^電話営業[：:]\s*(.+)/,
    /^同行名[：:]\s*(.+)/,
    /^名前[：:]\s*(.+)/,
    /^訪問先[：:]\s*(.+)/,
  ];
  for (const line of lines) {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return lines[0] || '';
}

// スプレッドシートのスケジュールテキストをパース
function parseScheduleTSV(text: string): ParsedTask[] {
  const rows = parseTSV(text);
  const tasks: ParsedTask[] = [];

  // 時間帯 → 開始時刻のマッピング（複数行対応）
  const slotTimes: Record<string, string[]> = {
    '朝': ['07:00'],
    'AM': ['09:00', '10:30', '11:00'],
    'PM': ['13:00', '14:30', '16:00'],
    '夜': ['19:00', '20:00'],
  };
  const slotCount: Record<string, number> = {};
  let currentDates: string[] = []; // columns 1-6 の ISO日付
  const now = new Date();

  for (const row of rows) {
    const label = (row[0] || '').trim();

    // 「朝」行で日付が含まれていれば、週の日付マップを更新
    if (label === '朝') {
      const possibleDates = row.slice(1, 7);
      const hasDate = possibleDates.some(d => /^\d{1,2}\/\d{1,2}$/.test(d.trim()));
      if (hasDate) {
        // 週切り替えなので slotCount をリセット
        Object.keys(slotCount).forEach(k => delete slotCount[k]);
        currentDates = possibleDates.map(d => {
          const m = d.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
          if (!m) return '';
          const month = parseInt(m[1]);
          const day = parseInt(m[2]);
          // 年の推定：現在月より3ヶ月以上前の月は翌年として扱う
          let year = now.getFullYear();
          if (month < now.getMonth() + 1 - 3) year += 1;
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        });
        continue;
      }
    }

    // 時間帯ラベル行の処理
    if (['AM', 'PM', '夜'].includes(label) && currentDates.length > 0) {
      const times = slotTimes[label] || ['09:00'];
      const idx = slotCount[label] ?? 0;
      const startTime = times[Math.min(idx, times.length - 1)];
      slotCount[label] = idx + 1;

      for (let col = 1; col <= 6; col++) {
        const date = currentDates[col - 1];
        if (!date) continue;
        const cellContent = (row[col] || '').trim();
        if (!cellContent) continue;

        // 空テンプレートセル（全てコロン後が空）はスキップ
        const nonEmptyValues = cellContent.split('\n')
          .filter(l => /[：:]\s*\S/.test(l) || !/[：:]/.test(l));
        if (nonEmptyValues.length === 0) continue;

        const title = extractTitle(cellContent);
        if (!title) continue;

        tasks.push({ title, details: cellContent, date, startTime, slotLabel: label });
      }
    }
  }

  return tasks;
}

const PlannerView: React.FC<PlannerViewProps> = ({ tasks, onAddTask }) => {
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [previewTasks, setPreviewTasks] = useState<ParsedTask[] | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const getISODate = (daysOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  const getDayInfo = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.toLocaleDateString('ja-JP', { weekday: 'short' });
    const dateNum = d.getDate();
    const month = d.getMonth() + 1;
    return { day, dateNum, month };
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => getISODate(i));
  const [bulkTargetDate, setBulkTargetDate] = useState(weekDays[0]);

  // プレビュー生成
  const handleSchedulePreview = () => {
    if (!scheduleText.trim()) return;
    const parsed = parseScheduleTSV(scheduleText);
    setPreviewTasks(parsed);
    setImportResult(null);
  };

  // 一括登録実行
  const handleScheduleImport = () => {
    if (!previewTasks || previewTasks.length === 0) return;
    previewTasks.forEach(t => {
      onAddTask(t.title, 'p1', [], 3600, t.date, t.startTime, false, undefined, undefined, t.details);
    });
    setImportResult(`✅ ${previewTasks.length}件のタスクをインポートしました`);
    setPreviewTasks(null);
    setScheduleText('');
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentStartTime = '';
    let currentEstimate = 3600;
    let currentTask: { title: string; customerName: string; startTime: string; estimatedTime: number; details: string } | null = null;
    const tasksToAdd: typeof currentTask[] = [];

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
        const title = line.replace(/^[・\-•]\s*/, '').trim();
        const customerMatch = title.match(/^(.+?)様/);
        currentTask = { title, customerName: customerMatch ? customerMatch[1] : '', startTime: currentStartTime, estimatedTime: currentEstimate, details: '' };
      } else if (line.startsWith('（') || line.startsWith('(')) {
        if (currentTask) {
          const detailLine = line.replace(/^[（(]/, '').replace(/[）)]$/, '').trim();
          currentTask.details = currentTask.details ? currentTask.details + '\n' + detailLine : detailLine;
        }
      } else {
        if (currentTask) currentTask.details = currentTask.details ? currentTask.details + '\n' + line : line;
      }
    }
    if (currentTask) tasksToAdd.push(currentTask);
    tasksToAdd.forEach(t => {
      if (!t) return;
      onAddTask(t.title, 'p1', [], t.estimatedTime, bulkTargetDate, t.startTime || undefined, false, t.customerName || undefined, undefined, t.details || undefined);
    });
    setBulkText('');
    setIsBulkMode(false);
  };

  const handleInlineAdd = (date: string) => {
    const title = inlineInputs[date];
    if (title?.trim()) {
      onAddTask(title, 'p1', [], 3600, date);
      setInlineInputs({ ...inlineInputs, [date]: '' });
    }
  };

  const getInputStyle = (val: string) =>
    `transition-all duration-300 border-2 ${val?.trim() ? 'border-zinc-700 bg-zinc-100/20' : 'border-zinc-100 bg-zinc-50/5'} focus:ring-4 focus:ring-opacity-20 ${val?.trim() ? 'focus:ring-zinc-700' : 'focus:ring-zinc-200'}`;

  // プレビューの日付ごとグルーピング
  const previewByDate = useMemo((): Record<string, ParsedTask[]> => {
    if (!previewTasks) return {};
    const map: Record<string, ParsedTask[]> = {};
    for (const t of previewTasks) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [previewTasks]);

  return (
    <div className="h-full bg-zinc-50/10 flex flex-col overflow-hidden border-t-2 border-zinc-100">
      <div className="p-8 pb-0 shrink-0">
        <header className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">週間プランナー</h2>
            <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest">AIが最適なスケジュールを提案します</p>
          </div>
          <div className="flex space-x-3">
            {/* スプレッドシートインポートボタン */}
            <button
              onClick={() => { setIsScheduleMode(!isScheduleMode); setIsBulkMode(false); setPreviewTasks(null); setImportResult(null); }}
              className={`px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center gap-2 ${isScheduleMode ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              {isScheduleMode ? '閉じる' : 'CSGスケジュールをインポート'}
            </button>
            <button
              onClick={() => { setIsBulkMode(!isBulkMode); setIsScheduleMode(false); }}
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

        {/* ── CSGスケジュールインポートパネル ── */}
        {isScheduleMode && (
          <div className="mb-8 bg-white rounded-3xl border-2 border-emerald-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
            <div className="px-8 py-6 border-b-2 border-emerald-50">
              <h3 className="font-black text-zinc-800 text-lg">CSGスケジュール一括インポート</h3>
              <p className="text-xs text-zinc-400 font-bold mt-1 tracking-widest">
                ExcelやGoogleスプレッドシートから表全体をコピーしてペーストしてください
              </p>
            </div>

            {!previewTasks ? (
              <div className="p-8 space-y-4">
                <textarea
                  value={scheduleText}
                  onChange={e => { setScheduleText(e.target.value); setImportResult(null); }}
                  placeholder={"CSGスケジュール表全体をここにペースト...\n（スプレッドシートのセル全選択→コピー→ここにペースト）"}
                  className="w-full p-5 rounded-2xl outline-none text-sm text-zinc-800 border-2 border-zinc-100 bg-zinc-50/5 focus:ring-4 focus:ring-emerald-200 focus:border-emerald-300 min-h-[160px] font-mono resize-none"
                />
                {importResult && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-6 py-4 text-sm font-black text-emerald-700">
                    {importResult}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setIsScheduleMode(false); setScheduleText(''); }}
                    className="px-6 py-2 rounded-xl font-black text-sm text-zinc-500 hover:bg-zinc-100"
                  >キャンセル</button>
                  <button
                    onClick={handleSchedulePreview}
                    disabled={!scheduleText.trim()}
                    className={`px-8 py-3 rounded-xl font-black text-sm shadow-md transition-all ${scheduleText.trim() ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
                  >
                    プレビューを確認
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-zinc-700">
                    <span className="text-emerald-600 text-lg">{previewTasks.length}</span> 件のタスクを検出
                    <span className="text-zinc-400 font-bold ml-3 text-xs">（{Object.keys(previewByDate).length}日分）</span>
                  </p>
                  <button onClick={() => setPreviewTasks(null)} className="text-xs font-black text-zinc-400 hover:text-zinc-700">
                    ← ペースト画面に戻る
                  </button>
                </div>

                {/* プレビューリスト */}
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {Object.entries(previewByDate)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, dateTasks]: [string, ParsedTask[]]) => {
                      const d = new Date(date + 'T00:00:00');
                      const label = `${d.getMonth() + 1}/${d.getDate()} (${d.toLocaleDateString('ja-JP', { weekday: 'short' })})`;
                      return (
                        <div key={date} className="bg-zinc-50 rounded-2xl p-4">
                          <p className="text-[11px] font-black text-zinc-400 tracking-widest mb-2">{label}</p>
                          <div className="space-y-2">
                            {dateTasks.map((t, i) => (
                              <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-zinc-100">
                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{t.startTime}</span>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-zinc-800 truncate">{t.title}</p>
                                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5 line-clamp-1">{t.slotLabel}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t-2 border-zinc-50">
                  <button onClick={() => setPreviewTasks(null)} className="px-6 py-2 rounded-xl font-black text-sm text-zinc-500 hover:bg-zinc-100">
                    戻る
                  </button>
                  <button
                    onClick={handleScheduleImport}
                    className="px-8 py-3 rounded-xl font-black text-sm bg-emerald-700 text-white hover:bg-emerald-800 shadow-lg transition-all active:scale-95"
                  >
                    {previewTasks.length}件を一括登録
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 既存のテキスト一括追加パネル ── */}
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
              placeholder="■13:00–13:15&#10;・GSX様依頼連絡&#10;（ご依頼に対するメールの返信）"
              className="w-full p-4 rounded-xl outline-none text-sm font-black text-zinc-800 border-2 border-zinc-100 bg-zinc-50/5 focus:ring-4 focus:ring-zinc-200 min-h-[120px] mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setIsBulkMode(false)} className="px-6 py-2 rounded-xl font-black text-sm text-zinc-500 hover:bg-zinc-100">キャンセル</button>
              <button onClick={handleBulkSubmit} disabled={!bulkText.trim()} className={`px-6 py-2 rounded-xl font-black text-sm shadow-md transition-all ${bulkText.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-900' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}>追加する</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 週カラム ── */}
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
                  <div className="h-full bg-zinc-800 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
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
                    <svg className="w-12 h-12 mb-3 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" /></svg>
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
