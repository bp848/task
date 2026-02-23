
import React from 'react';

const SettingsView: React.FC = () => {
  return (
    <div className="p-12 bg-rose-50/10 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-slate-800 mb-12">設定</h2>
        
        <div className="space-y-12">
           <section>
              <h3 className="text-[11px] font-black text-rose-300 uppercase tracking-widest mb-6 border-b border-rose-100 pb-2">AI アシスタント設定</h3>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-rose-50 shadow-sm">
                    <span className="text-sm font-black text-slate-700">報告メールのトーン</span>
                    <select className="bg-rose-50 border-2 border-rose-100 text-xs p-2.5 rounded-xl outline-none font-bold text-rose-600">
                       <option>極めて丁寧（対 橋本社長様用）</option>
                       <option>簡潔・事実のみ（社内共有用）</option>
                       <option>標準（プロジェクトメンバー用）</option>
                    </select>
                 </div>
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-rose-50 shadow-sm">
                    <span className="text-sm font-black text-slate-700">証拠メモの自動解析</span>
                    <div className="w-12 h-6 bg-rose-500 rounded-full relative shadow-inner">
                       <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
                    </div>
                 </div>
              </div>
           </section>

           <section>
              <h3 className="text-[11px] font-black text-rose-300 uppercase tracking-widest mb-6 border-b border-rose-100 pb-2">ユーザーインターフェース</h3>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-rose-50 shadow-sm">
                    <span className="text-sm font-black text-slate-700">ダークモード</span>
                    <div className="w-12 h-6 bg-rose-100 rounded-full relative shadow-inner">
                       <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
                    </div>
                 </div>
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-rose-50 shadow-sm">
                    <span className="text-sm font-black text-slate-700">時間の表示形式</span>
                    <select className="bg-rose-50 border-2 border-rose-100 text-xs p-2.5 rounded-xl outline-none font-bold text-rose-600">
                       <option>24時間制</option>
                       <option>12時間制 (午前/午後)</option>
                    </select>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
