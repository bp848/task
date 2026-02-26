import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useHabits } from '../../hooks/useHabits';

interface HabitsViewProps {
  session: Session | null;
}

const HabitsView: React.FC<HabitsViewProps> = ({ session }) => {
  const { habits, loading, addHabit, toggleHabitLog, deleteHabit } = useHabits(session);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const handleAdd = async () => {
    if (!newHabitTitle.trim()) return;
    await addHabit(newHabitTitle);
    setNewHabitTitle('');
  };

  if (loading) {
    return (
      <div className="p-12 bg-zinc-50/10 h-full flex items-center justify-center">
        <div className="text-zinc-400 text-sm font-bold">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-12 bg-zinc-50/10 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-zinc-800 mb-2">習慣管理</h2>
        <p className="text-sm text-zinc-400 font-bold mb-12 uppercase tracking-widest">日々のルーチンを管理</p>

        {/* 習慣追加フォーム */}
        <div className="mb-10 flex items-center space-x-4">
          <input
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="新しい習慣を追加..."
            className="flex-1 p-4 rounded-2xl border-2 border-zinc-100 bg-white text-sm font-black text-zinc-800 outline-none focus:border-zinc-400 transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newHabitTitle.trim()}
            className={`px-8 py-4 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 ${
              newHabitTitle.trim()
                ? 'bg-zinc-800 text-white hover:bg-zinc-900 shadow-zinc-200'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
          >
            追加
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
            <p className="text-lg font-black text-zinc-300 tracking-[0.3em]">習慣がありません</p>
            <p className="text-sm text-zinc-300 mt-2">上のフォームから追加してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {habits.map(h => {
              const isCompletedToday = h.completedDays.includes(today);
              return (
                <div key={h.id} className="bg-white rounded-3xl p-8 border-2 border-zinc-50 flex items-center justify-between group hover:border-zinc-400 transition-all shadow-lg shadow-zinc-800/5">
                   <div className="flex-1 min-w-0">
                      <div className="text-base font-black text-zinc-700 mb-2 truncate">{h.title}</div>
                      <div className="flex items-center space-x-3">
                         <div className={`w-3 h-3 rounded-full shadow-sm ${h.streak > 0 ? 'bg-zinc-800 shadow-zinc-200' : 'bg-zinc-200'}`}></div>
                         <span className="text-[11px] font-black text-zinc-800 tracking-widest uppercase">
                           {h.streak > 0 ? `${h.streak} 日連続継続中` : '未開始'}
                         </span>
                      </div>
                   </div>
                   <div className="flex items-center space-x-3 ml-4">
                     <button
                       onClick={() => toggleHabitLog(h.id, today)}
                       className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center transition-all active:scale-90 ${
                         isCompletedToday
                           ? 'bg-zinc-800 border-zinc-800 text-white shadow-lg'
                           : 'border-zinc-100 hover:bg-zinc-800 hover:text-white hover:border-zinc-800 text-zinc-200'
                       }`}
                     >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                     </button>
                     <button
                       onClick={() => deleteHabit(h.id)}
                       className="w-10 h-10 rounded-xl border-2 border-zinc-100 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:border-red-200 transition-all active:scale-90"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     </button>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitsView;
