
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
    <div className="p-8 h-full bg-zinc-50/10 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-xl font-black text-zinc-800">受信トレイ (メール連携)</h2>
            <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mt-1">ステータス: 接続済み</p>
          </div>
          <div className="flex bg-white rounded-2xl border-2 border-zinc-50 p-1.5 shadow-sm">
            <button onClick={() => setFilter('unread')} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${filter === 'unread' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-300 hover:text-zinc-800'}`}>未読</button>
            <button onClick={() => setFilter('all')} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${filter === 'all' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-300 hover:text-zinc-800'}`}>すべて</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             {filteredEmails.map(email => (
               <div key={email.id} className="bg-white rounded-3xl border-2 border-zinc-50 p-6 hover:border-zinc-400 transition-all shadow-lg shadow-zinc-800/5 group">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-[10px] font-black text-zinc-800 uppercase tracking-tighter">{email.sender}</span>
                     <span className="text-[10px] font-bold text-zinc-400">{email.date}</span>
                  </div>
                  <h3 className="text-base font-black text-zinc-800 mb-3 leading-tight">{email.subject}</h3>
                  <p className="text-xs text-zinc-500 mb-6 line-clamp-2 leading-relaxed font-medium">{email.snippet}</p>
                  <button 
                    onClick={() => onConvertToTask(email)}
                    className="w-full py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-900 hover:bg-zinc-800 hover:text-white hover:border-zinc-800 transition-all shadow-sm"
                  >
                    このメールをタスク化してAI支援を受ける
                  </button>
               </div>
             ))}
          </div>
          <div className="space-y-6">
             <div className="bg-zinc-950 rounded-3xl p-6 text-white shadow-xl shadow-zinc-200">
                <h4 className="text-xs font-black text-zinc-300 mb-4 flex items-center uppercase tracking-widest">
                   <div className="w-2 h-2 bg-zinc-800 rounded-full mr-3 shadow-sm shadow-zinc-400"></div>
                   AI 推奨アクション
                </h4>
                {(() => {
                  const unread = emails.filter(e => !e.isRead);
                  if (unread.length === 0) {
                    return (
                      <p className="text-[13px] text-zinc-50/80 leading-relaxed font-bold">
                        未読メールはありません。受信トレイはクリーンです。
                      </p>
                    );
                  }
                  const senders = [...new Set(unread.map(e => e.sender).filter(Boolean))];
                  const senderText = senders.length <= 2 ? senders.join('・') : `${senders[0]} 他${senders.length - 1}名`;
                  return (
                    <p className="text-[13px] text-zinc-50/80 leading-relaxed font-bold">
                      {senderText}から未読メールが{unread.length}件届いています。タスク化して対応を進めましょう。
                    </p>
                  );
                })()}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxView;
