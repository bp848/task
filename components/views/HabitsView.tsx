
import React from 'react';

const HabitsView: React.FC = () => {
  const habits = [
    { id: '1', title: '基幹システム入力チェック', streak: 12 },
    { id: '2', title: '未完了タスクの証拠メモ記入', streak: 45 },
    { id: '3', title: '社長報告メール案の生成', streak: 8 },
    { id: '4', title: '制作サーバーの整理', streak: 3 },
  ];

  return (
    <div className="p-12 bg-zinc-50/10 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-zinc-800 mb-2">習慣管理</h2>
        <p className="text-sm text-zinc-400 font-bold mb-12 uppercase tracking-widest">三神さんの信頼を支える日々のルーチン</p>
        
        <div className="grid grid-cols-2 gap-6">
          {habits.map(h => (
            <div key={h.id} className="bg-white rounded-3xl p-8 border-2 border-zinc-50 flex items-center justify-between group hover:border-zinc-400 transition-all shadow-lg shadow-zinc-800/5">
               <div>
                  <div className="text-base font-black text-zinc-700 mb-2">{h.title}</div>
                  <div className="flex items-center space-x-3">
                     <div className="w-3 h-3 bg-zinc-800 rounded-full shadow-sm shadow-zinc-200"></div>
                     <span className="text-[11px] font-black text-zinc-800 tracking-widest uppercase">{h.streak} 日連続継続中</span>
                  </div>
               </div>
               <button className="w-14 h-14 rounded-2xl border-4 border-zinc-50 flex items-center justify-center hover:bg-zinc-800 hover:text-white transition-all text-zinc-100 active:scale-90">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
               </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HabitsView;
