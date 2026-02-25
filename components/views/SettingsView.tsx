
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SettingsViewProps {
  userId: string;
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

const SettingsView: React.FC<SettingsViewProps> = ({ userId }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('zenwork_settings')
        .select('email_tone, time_format, auto_memo, dark_mode')
        .single();
      if (data) {
        setSettings({
          email_tone: data.email_tone ?? defaultSettings.email_tone,
          time_format: data.time_format ?? defaultSettings.time_format,
          auto_memo: data.auto_memo ?? defaultSettings.auto_memo,
          dark_mode: data.dark_mode ?? defaultSettings.dark_mode,
        });
      }
    };
    loadSettings();
  }, []);

  const save = async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setSaving(true);
    await supabase.from('zenwork_settings').upsert({
      user_id: userId,
      ...newSettings,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  return (
    <div className="p-12 bg-zinc-50/10 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-black text-zinc-800">設定</h2>
          {saving && (
            <div className="flex items-center gap-2 text-xs font-black text-zinc-400 tracking-widest">
              <div className="w-3 h-3 border border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
              保存中...
            </div>
          )}
        </div>

        <div className="space-y-12">
          <section>
            <h3 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-6 border-b border-zinc-100 pb-2">
              AI アシスタント設定
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                <span className="text-sm font-black text-zinc-700">報告メールのトーン</span>
                <select
                  value={settings.email_tone}
                  onChange={e => save({ email_tone: e.target.value })}
                  className="bg-zinc-50 border-2 border-zinc-100 text-xs p-2.5 rounded-xl outline-none font-bold text-zinc-900"
                >
                  <option value="polite">極めて丁寧（上位者・社長向け）</option>
                  <option value="brief">簡潔・事実のみ（社内共有用）</option>
                  <option value="standard">標準（プロジェクトメンバー用）</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                <span className="text-sm font-black text-zinc-700">証拠メモの自動解析</span>
                <button
                  onClick={() => save({ auto_memo: !settings.auto_memo })}
                  className={`w-12 h-6 rounded-full relative shadow-inner transition-all ${settings.auto_memo ? 'bg-zinc-800' : 'bg-zinc-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.auto_memo ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-6 border-b border-zinc-100 pb-2">
              ユーザーインターフェース
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                <span className="text-sm font-black text-zinc-700">ダークモード</span>
                <button
                  onClick={() => save({ dark_mode: !settings.dark_mode })}
                  className={`w-12 h-6 rounded-full relative shadow-inner transition-all ${settings.dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.dark_mode ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-zinc-50 shadow-sm">
                <span className="text-sm font-black text-zinc-700">時間の表示形式</span>
                <select
                  value={settings.time_format}
                  onChange={e => save({ time_format: e.target.value })}
                  className="bg-zinc-50 border-2 border-zinc-100 text-xs p-2.5 rounded-xl outline-none font-bold text-zinc-900"
                >
                  <option value="24h">24時間制</option>
                  <option value="12h">12時間制 (午前/午後)</option>
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
