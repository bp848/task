import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface SettingsViewProps {
  session: Session | null;
}

interface Settings {
  email_tone: string;
  time_format: string;
  auto_memo: boolean;
  dark_mode: boolean;
}

const defaultSettings: Settings = {
  email_tone: 'polite',
  time_format: '24h',
  auto_memo: true,
  dark_mode: false,
};

const SettingsView: React.FC<SettingsViewProps> = ({ session }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('zenwork_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            email_tone: data.email_tone,
            time_format: data.time_format,
            auto_memo: data.auto_memo,
            dark_mode: data.dark_mode,
          });
        }
      });
  }, [userId]);

  const updateSetting = async (key: keyof Settings, value: string | boolean) => {
    if (!userId) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);

    await supabase
      .from('zenwork_settings')
      .upsert({
        user_id: userId,
        ...updated,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);
  };

  const toneOptions = [
    { value: 'polite', label: '極めて丁寧（対 橋本社長様用）' },
    { value: 'concise', label: '簡潔・事実のみ（社内共有用）' },
    { value: 'standard', label: '標準（プロジェクトメンバー用）' },
  ];

  const timeOptions = [
    { value: '24h', label: '24時間制' },
    { value: '12h', label: '12時間制 (午前/午後)' },
  ];

  return (
    <div className="p-12 bg-zinc-50/10 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-black text-zinc-800">設定</h2>
          {saving && <span className="text-[10px] font-black text-zinc-400 animate-pulse">保存中...</span>}
        </div>

        <div className="space-y-12">
           <section>
              <h3 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-6 border-b border-zinc-100 pb-2">AI アシスタント設定</h3>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                    <span className="text-sm font-black text-zinc-700">報告メールのトーン</span>
                    <select
                      value={settings.email_tone}
                      onChange={(e) => updateSetting('email_tone', e.target.value)}
                      className="bg-zinc-50 border-2 border-zinc-100 text-xs p-2.5 rounded-xl outline-none font-bold text-zinc-900"
                    >
                       {toneOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                    <span className="text-sm font-black text-zinc-700">証拠メモの自動解析</span>
                    <button
                      onClick={() => updateSetting('auto_memo', !settings.auto_memo)}
                      className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${settings.auto_memo ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.auto_memo ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
              </div>
           </section>

           <section>
              <h3 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-6 border-b border-zinc-100 pb-2">ユーザーインターフェース</h3>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                    <span className="text-sm font-black text-zinc-700">ダークモード</span>
                    <button
                      onClick={() => updateSetting('dark_mode', !settings.dark_mode)}
                      className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${settings.dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.dark_mode ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                    <span className="text-sm font-black text-zinc-700">時間の表示形式</span>
                    <select
                      value={settings.time_format}
                      onChange={(e) => updateSetting('time_format', e.target.value)}
                      className="bg-zinc-50 border-2 border-zinc-100 text-xs p-2.5 rounded-xl outline-none font-bold text-zinc-900"
                    >
                       {timeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
