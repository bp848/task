
import React, { useState } from 'react';
import { Task, Email } from '../../types';

interface InboxViewProps {
  tasks: Task[];
  emails: Email[];
  onConvertToTask: (email: Email) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ tasks, emails, onConvertToTask }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const filteredEmails = filter === 'unread' ? emails.filter(e => !e.isRead) : emails;

  return (
    <div className="p-8 h-full bg-rose-50/10 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-xl font-black text-slate-800">受信トレイ (メール連携)</h2>
            <p className="text-[11px] text-rose-400 font-black uppercase tracking-widest mt-1">ステータス: 接続済み</p>
          </div>
          <div className="flex bg-white rounded-2xl border-2 border-rose-50 p-1.5 shadow-sm">
            <button onClick={() => setFilter('unread')} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${filter === 'unread' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-300 hover:text-rose-500'}`}>未読</button>
            <button onClick={() => setFilter('all')} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${filter === 'all' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-300 hover:text-rose-500'}`}>すべて</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             {filteredEmails.map(email => (
               <div key={email.id} className="bg-white rounded-3xl border-2 border-rose-50 p-6 hover:border-rose-400 transition-all shadow-lg shadow-rose-500/5 group">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">{email.sender}</span>
                     <span className="text-[10px] font-bold text-slate-400">{email.date}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-800 mb-3 leading-tight">{email.subject}</h3>
                  <p className="text-xs text-slate-500 mb-6 line-clamp-2 leading-relaxed font-medium">{email.snippet}</p>
                  <button 
                    onClick={() => onConvertToTask(email)}
                    className="w-full py-3 bg-rose-50 border-2 border-rose-100 rounded-2xl text-[10px] font-black text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm"
                  >
                    このメールをタスク化してAI支援を受ける
                  </button>
               </div>
             ))}
          </div>
          <div className="space-y-6">
             <div className="bg-rose-900 rounded-3xl p-6 text-white shadow-xl shadow-rose-200">
                <h4 className="text-xs font-black text-rose-300 mb-4 flex items-center uppercase tracking-widest">
                   <div className="w-2 h-2 bg-rose-500 rounded-full mr-3 shadow-sm shadow-rose-400"></div>
                   AI 推奨アクション
                </h4>
                <p className="text-[13px] text-rose-50/80 leading-relaxed font-bold">
                  社長からのメールが1件届いています。「ZENBI 4月号」の進捗報告メールのドラフトを作成することをお勧めします。
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxView;
