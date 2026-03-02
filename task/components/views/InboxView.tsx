
import React, { useState } from 'react';
import { Task, Email } from '../../types';

interface ConvertModal {
  email: Email;
  date: string;
  startTime: string;
  estimatedTime: number;
}

interface InboxViewProps {
  tasks: Task[];
  emails: Email[];
  onConvertToTask: (email: Email, date: string, startTime: string, estimatedTime: number) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ tasks, emails, onConvertToTask }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [modal, setModal] = useState<ConvertModal | null>(null);

  const filteredEmails = filter === 'unread' ? emails.filter(e => !e.isRead) : emails;

  const openModal = (email: Email) => {
    setModal({
      email,
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      estimatedTime: 1800,
    });
  };

  const handleConvert = () => {
    if (!modal) return;
    onConvertToTask(modal.email, modal.date, modal.startTime, modal.estimatedTime);
    setModal(null);
  };

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

        <div className="space-y-4">
          {filteredEmails.length === 0 && (
            <div className="text-center py-20 text-zinc-300 font-black tracking-widest text-sm">メールがありません</div>
          )}
          {filteredEmails.map(email => (
            <div key={email.id} className="bg-white rounded-3xl border-2 border-zinc-50 p-6 hover:border-zinc-400 transition-all shadow-lg shadow-zinc-800/5 group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-zinc-800 uppercase tracking-tighter">{email.sender}</span>
                <span className="text-[10px] font-bold text-zinc-400">{email.date}</span>
              </div>
              <h3 className="text-base font-black text-zinc-800 mb-3 leading-tight">{email.subject}</h3>
              <p className="text-xs text-zinc-500 mb-6 line-clamp-2 leading-relaxed font-medium">{email.snippet}</p>
              <button
                onClick={() => openModal(email)}
                className="w-full py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-900 hover:bg-zinc-800 hover:text-white hover:border-zinc-800 transition-all shadow-sm"
              >
                このメールをタスク化する
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* タスク化モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-zinc-900 tracking-widest">タスク化</h3>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" /></svg>
              </button>
            </div>

            <p className="text-sm font-black text-zinc-800 mb-6 bg-zinc-50 rounded-2xl p-4 leading-relaxed">
              {modal.email.subject}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 tracking-widest mb-2 block">実施日</label>
                <input
                  type="date"
                  value={modal.date}
                  onChange={e => setModal({ ...modal, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-100 text-sm font-black outline-none focus:border-zinc-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 tracking-widest mb-2 block">開始時刻（任意）</label>
                <input
                  type="time"
                  value={modal.startTime}
                  onChange={e => setModal({ ...modal, startTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-100 text-sm font-black outline-none focus:border-zinc-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 tracking-widest mb-2 block">見積時間</label>
                <select
                  value={modal.estimatedTime}
                  onChange={e => setModal({ ...modal, estimatedTime: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-100 text-sm font-black outline-none focus:border-zinc-400 transition-all bg-white"
                >
                  <option value={900}>15分</option>
                  <option value={1800}>30分</option>
                  <option value={3600}>1時間</option>
                  <option value={5400}>1.5時間</option>
                  <option value={7200}>2時間</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleConvert}
              className="w-full mt-8 py-4 bg-zinc-900 text-white rounded-2xl font-black shadow-lg hover:bg-zinc-800 transition-all"
            >
              タスクに追加してスケジュールへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxView;
