
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface HabitsViewProps {
  userId: string;
}

interface Habit {
  id: string;
  title: string;
  streak: number;
}

const HabitsView: React.FC<HabitsViewProps> = ({ userId }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: habitsData }, { data: logsData }] = await Promise.all([
        supabase.from('habits').select('id, title, streak').order('created_at'),
        supabase.from('habit_logs').select('habit_id').eq('completed_date', today),
      ]);
      if (habitsData) setHabits(habitsData);
      if (logsData) setTodayLogs(new Set(logsData.map((l: { habit_id: string }) => l.habit_id)));
      setLoading(false);
    };
    load();
  }, [today]);

  const handleCheck = async (habit: Habit) => {
    const isDone = todayLogs.has(habit.id);

    if (isDone) {
      // チェック解除: habit_log 削除、streak を -1
      await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_date', today);
      const newStreak = Math.max(0, habit.streak - 1);
      await supabase.from('habits').update({ streak: newStreak }).eq('id', habit.id);
      setTodayLogs(prev => { const next = new Set(prev); next.delete(habit.id); return next; });
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, streak: newStreak } : h));
    } else {
      // チェック: habit_log 追加、streak を +1
      await supabase.from('habit_logs').insert({ habit_id: habit.id, completed_date: today });
      const newStreak = habit.streak + 1;
      await supabase.from('habits').update({ streak: newStreak }).eq('id', habit.id);
      setTodayLogs(prev => new Set([...prev, habit.id]));
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, streak: newStreak } : h));
    }
  };

  const handleAddHabit = async () => {
    if (!newTitle.trim()) return;
    const { data } = await supabase
      .from('habits')
      .insert({ user_id: userId, title: newTitle.trim(), streak: 0 })
      .select('id, title, streak')
      .single();
    if (data) {
      setHabits(prev => [...prev, data]);
      setNewTitle('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-black tracking-widest">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 bg-zinc-50/10 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-zinc-800 mb-2">習慣管理</h2>
        <p className="text-sm text-zinc-400 font-bold mb-12 uppercase tracking-widest">信頼を支える日々のルーチン</p>

        <div className="grid grid-cols-2 gap-6">
          {habits.map(h => {
            const isDone = todayLogs.has(h.id);
            return (
              <div
                key={h.id}
                className={`bg-white rounded-3xl p-8 border-2 flex items-center justify-between group transition-all shadow-lg shadow-zinc-800/5 ${
                  isDone ? 'border-zinc-800 bg-zinc-50' : 'border-zinc-50 hover:border-zinc-400'
                }`}
              >
                <div>
                  <div className={`text-base font-black mb-2 ${isDone ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                    {h.title}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full shadow-sm shadow-zinc-200 ${isDone ? 'bg-emerald-400' : 'bg-zinc-800'}`}></div>
                    <span className="text-[11px] font-black text-zinc-800 tracking-widest uppercase">
                      {h.streak} 日連続継続中
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCheck(h)}
                  className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center transition-all active:scale-90 ${
                    isDone
                      ? 'bg-zinc-800 border-zinc-800 text-white'
                      : 'border-zinc-50 text-zinc-100 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeWidth="4" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* 新規習慣追加カード */}
          <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-zinc-100 flex items-center gap-4 hover:border-zinc-300 transition-all shadow-lg shadow-zinc-800/5">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
              placeholder="新しい習慣を追加..."
              className="flex-1 bg-transparent outline-none text-sm font-black text-zinc-700 placeholder:text-zinc-200"
            />
            <button
              onClick={handleAddHabit}
              disabled={!newTitle.trim()}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                newTitle.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeWidth="2.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitsView;
