
import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useHabits } from '../../hooks/useHabits';
import { Habit } from '../../types';

interface HabitsViewProps {
  session: Session | null;
  onAddTaskToPlanner?: (title: string, date: string, startTime?: string, estimatedMinutes?: number, customerName?: string, projectName?: string) => void;
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const FREQ_LABELS: Record<string, string> = { daily: '毎日', weekly: '毎週', monthly: '毎月', yearly: '毎年' };

const HabitsView: React.FC<HabitsViewProps> = ({ session, onAddTaskToPlanner }) => {
  const { habits, loading, addHabit, toggleHabitLog, deleteHabit } = useHabits(session);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formFreq, setFormFreq] = useState<Habit['frequency']>('daily');
  const [formTime, setFormTime] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(1);
  const [formMonthOfYear, setFormMonthOfYear] = useState<number>(1);
  const [formEstMinutes, setFormEstMinutes] = useState<number>(30);
  const [formCustomer, setFormCustomer] = useState('');
  const [formProject, setFormProject] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const resetForm = () => {
    setFormTitle(''); setFormFreq('daily'); setFormTime('');
    setFormDayOfWeek(1); setFormDayOfMonth(1); setFormMonthOfYear(1);
    setFormEstMinutes(30); setFormCustomer(''); setFormProject('');
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formTitle.trim()) return;
    await addHabit(formTitle, {
      frequency: formFreq,
      time: formTime || undefined,
      dayOfWeek: formFreq === 'weekly' ? formDayOfWeek : undefined,
      dayOfMonth: (formFreq === 'monthly' || formFreq === 'yearly') ? formDayOfMonth : undefined,
      monthOfYear: formFreq === 'yearly' ? formMonthOfYear : undefined,
      estimatedMinutes: formEstMinutes,
      customerName: formCustomer || undefined,
      projectName: formProject || undefined,
    });
    resetForm();
  };

  const getScheduleLabel = (h: Habit) => {
    const parts: string[] = [FREQ_LABELS[h.frequency]];
    if (h.frequency === 'weekly' && h.dayOfWeek !== undefined) parts.push(`(${DAYS_OF_WEEK[h.dayOfWeek]})`);
    if (h.frequency === 'monthly' && h.dayOfMonth !== undefined) parts.push(`(${h.dayOfMonth}日)`);
    if (h.frequency === 'yearly' && h.monthOfYear !== undefined && h.dayOfMonth !== undefined) parts.push(`(${h.monthOfYear}/${h.dayOfMonth})`);
    if (h.time) parts.push(h.time);
    if (h.estimatedMinutes) parts.push(`${h.estimatedMinutes}分`);
    return parts.join(' ');
  };

  const isScheduledToday = (h: Habit) => {
    const now = new Date();
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly' && h.dayOfWeek === now.getDay()) return true;
    if (h.frequency === 'monthly' && h.dayOfMonth === now.getDate()) return true;
    if (h.frequency === 'yearly' && h.monthOfYear === now.getMonth() + 1 && h.dayOfMonth === now.getDate()) return true;
    return false;
  };

  const todayRoutines = habits.filter(h => isScheduledToday(h));
  const otherRoutines = habits.filter(h => !isScheduledToday(h));

  if (loading) {
    return (
      <div className="p-12 bg-zinc-50/10 h-full flex items-center justify-center">
        <div className="text-zinc-400 text-sm font-bold">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-12 bg-zinc-50/10 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-zinc-800 mb-1">ルーティン管理</h2>
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">定期タスクのスケジュール設定</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-2xl text-sm font-black hover:bg-zinc-700 transition-all active:scale-95 shadow-lg cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            新規ルーティン
          </button>
        </div>

        {showForm && (
          <div className="mb-10 bg-white rounded-3xl p-6 border-2 border-zinc-100 shadow-xl animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-black text-zinc-800 mb-4">ルーティン設定</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">タスク名</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="例: 朝礼・共有事項確認" className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">頻度</label>
                  <select value={formFreq} onChange={(e) => setFormFreq(e.target.value as Habit['frequency'])} className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 bg-white">
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                    <option value="yearly">毎年</option>
                  </select>
                </div>
                {formFreq === 'weekly' && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">曜日</label>
                    <select value={formDayOfWeek} onChange={(e) => setFormDayOfWeek(Number(e.target.value))} className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 bg-white">
                      {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}曜日</option>)}
                    </select>
                  </div>
                )}
                {(formFreq === 'monthly' || formFreq === 'yearly') && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">日にち</label>
                    <select value={formDayOfMonth} onChange={(e) => setFormDayOfMonth(Number(e.target.value))} className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 bg-white">
                      {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
                    </select>
                  </div>
                )}
                {formFreq === 'yearly' && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">月</label>
                    <select value={formMonthOfYear} onChange={(e) => setFormMonthOfYear(Number(e.target.value))} className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 bg-white">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">開始時間</label>
                  <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">見積(分)</label>
                  <input type="number" min={5} step={5} value={formEstMinutes} onChange={(e) => setFormEstMinutes(Number(e.target.value))} className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">顧客名（任意）</label>
                  <input value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} placeholder="例: 日本卓球" className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1">案件名（任意）</label>
                  <input value={formProject} onChange={(e) => setFormProject(e.target.value)} placeholder="例: うちわ見積" className="w-full p-3 rounded-xl border-2 border-zinc-100 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={resetForm} className="px-6 py-3 text-sm font-black text-zinc-400 hover:text-zinc-800 rounded-xl transition-all cursor-pointer">キャンセル</button>
                <button onClick={handleAdd} disabled={!formTitle.trim()} className={`px-8 py-3 rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 cursor-pointer ${formTitle.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-700 shadow-zinc-200' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}>登録</button>
              </div>
            </div>
          </div>
        )}

        {todayRoutines.length > 0 && (
          <div className="mb-10">
            <h3 className="text-[11px] font-black text-indigo-700 tracking-widest uppercase mb-4 px-1">本日のルーティン</h3>
            <div className="space-y-3">
              {todayRoutines.map(h => {
                const done = h.completedDays.includes(today);
                return (
                  <div key={h.id} className={`bg-white rounded-2xl p-5 border-2 flex items-center justify-between group transition-all ${done ? 'border-green-200 bg-green-50/30' : 'border-zinc-100 hover:border-indigo-300'}`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <button onClick={() => toggleHabitLog(h.id, today)} className={`w-12 h-12 rounded-xl border-3 flex items-center justify-center transition-all active:scale-90 shrink-0 cursor-pointer ${done ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-200' : 'border-zinc-200 hover:bg-indigo-800 hover:text-white hover:border-indigo-800 text-zinc-200'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <div className="min-w-0">
                        <div className={`text-sm font-black truncate ${done ? 'text-green-700 line-through' : 'text-zinc-800'}`}>{h.title}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-zinc-400">{getScheduleLabel(h)}</span>
                          {h.customerName && <span className="text-[10px] font-bold text-indigo-500">@{h.customerName}</span>}
                          {h.streak > 0 && <span className="text-[10px] font-black text-orange-500">{h.streak}日連続</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {onAddTaskToPlanner && !done && (
                        <button onClick={() => onAddTaskToPlanner(h.title, today, h.time, h.estimatedMinutes, h.customerName, h.projectName)} className="px-3 py-1.5 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-700 hover:text-white hover:border-indigo-700 transition-all cursor-pointer">+プラン</button>
                      )}
                      <button onClick={() => deleteHabit(h.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-[11px] font-black text-zinc-400 tracking-widest uppercase mb-4 px-1">{todayRoutines.length > 0 ? 'その他のルーティン' : '登録済みルーティン'}</h3>
          {(todayRoutines.length > 0 ? otherRoutines : habits).length === 0 && todayRoutines.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
              <svg className="w-16 h-16 mb-4 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <p className="text-lg font-black text-zinc-300">ルーティンがありません</p>
              <p className="text-sm text-zinc-300 mt-2">「新規ルーティン」ボタンから追加してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(todayRoutines.length > 0 ? otherRoutines : habits).map(h => (
                <div key={h.id} className="bg-white rounded-2xl p-5 border-2 border-zinc-50 group hover:border-zinc-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-zinc-700 truncate">{h.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-white bg-zinc-700 px-2 py-0.5 rounded-full">{FREQ_LABELS[h.frequency]}</span>
                        {h.frequency === 'weekly' && h.dayOfWeek !== undefined && <span className="text-[10px] font-bold text-zinc-500">{DAYS_OF_WEEK[h.dayOfWeek]}曜</span>}
                        {h.frequency === 'monthly' && h.dayOfMonth !== undefined && <span className="text-[10px] font-bold text-zinc-500">{h.dayOfMonth}日</span>}
                        {h.time && <span className="text-[10px] font-bold text-zinc-500">{h.time}</span>}
                        {h.estimatedMinutes && <span className="text-[10px] font-bold text-zinc-400">{h.estimatedMinutes}分</span>}
                        {h.customerName && <span className="text-[10px] font-bold text-indigo-500">@{h.customerName}</span>}
                      </div>
                      {h.streak > 0 && <div className="mt-2 text-[10px] font-black text-orange-500">{h.streak}日連続継続中</div>}
                    </div>
                    <button onClick={() => deleteHabit(h.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HabitsView;
