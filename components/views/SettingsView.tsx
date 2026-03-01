
import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, callEdgeFunction } from '../../lib/gws';

interface SettingsViewProps {
  session: Session | null;
  onSettingsChange?: (settings: Settings) => void;
  onGoogleConnected?: () => void;
}

export interface Settings {
  email_tone: string;
  ai_persona: string;
  time_format: string;
  auto_memo: boolean;
  dark_mode: boolean;
  psychedelic_mode: boolean;
  email_recipient: string;
  email_sender_name: string;
  email_sender_company: string;
  email_signature: string;
}

export const defaultSettings: Settings = {
  email_tone: 'polite',
  ai_persona: 'polite',
  time_format: '24h',
  auto_memo: true,
  dark_mode: false,
  psychedelic_mode: false,
  email_recipient: '橋本社長',
  email_sender_name: '三神',
  email_sender_company: 'CSG',
  email_signature: `**************************************************
文唱堂印刷株式会社
三神 杏友

〒101-0025
東京都千代田区神田佐久間町3-37
Tel.03-3851-0111
**************************************************`,
};

const SettingsView: React.FC<SettingsViewProps> = ({ session, onSettingsChange, onGoogleConnected }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userId = session?.user?.id;

  // Check Google OAuth status via Edge Function
  useEffect(() => {
    if (!session) return;
    callEdgeFunction('google-oauth-status')
      .then((res) => {
        setIsConnected(!!res?.connected);
      })
      .catch(() => setIsConnected(false));
  }, [session]);

  const startOAuth = async () => {
    setIsLoading(true);
    try {
      const res = await callEdgeFunction('google-oauth-start', {
        body: { redirect_uri: window.location.origin + '/settings' },
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      console.error('Failed to start Google OAuth:', err);
      setIsLoading(false);
    }
  };

  // Handle OAuth callback code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && session) {
      setIsLoading(true);
      callEdgeFunction('google-oauth-callback', {
        body: { code, redirect_uri: window.location.origin + '/settings' },
      })
        .then(() => {
          setIsConnected(true);
          onGoogleConnected?.();
        })
        .catch((err) => console.error('OAuth callback failed:', err))
        .finally(() => {
          setIsLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [session]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('zenwork_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const loaded: Settings = {
            email_tone: data.email_tone ?? defaultSettings.email_tone,
            ai_persona: data.ai_persona ?? defaultSettings.ai_persona,
            time_format: data.time_format ?? defaultSettings.time_format,
            auto_memo: data.auto_memo ?? defaultSettings.auto_memo,
            dark_mode: data.dark_mode ?? defaultSettings.dark_mode,
            psychedelic_mode: data.psychedelic_mode ?? defaultSettings.psychedelic_mode,
            email_recipient: data.email_recipient ?? defaultSettings.email_recipient,
            email_sender_name: data.email_sender_name ?? defaultSettings.email_sender_name,
            email_sender_company: data.email_sender_company ?? defaultSettings.email_sender_company,
            email_signature: data.email_signature ?? defaultSettings.email_signature,
          };
          setSettings(loaded);
          onSettingsChange?.(loaded);
        }
      });
  }, [userId]);

  const updateSetting = async (key: keyof Settings, value: string | boolean) => {
    if (!userId) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onSettingsChange?.(updated);
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

  const personaOptions = [
    { value: 'polite', label: '標準（丁寧）', emoji: '🤖' },
    { value: 'comedian', label: 'お笑い芸人風', emoji: '🎤' },
    { value: 'cat', label: '猫風', emoji: '🐱' },
    { value: 'dog', label: '犬風', emoji: '🐶' },
    { value: 'newscaster', label: 'ニュースキャスター風', emoji: '📺' },
    { value: 'auntie', label: '世話好きなおば様', emoji: '👵' },
    { value: 'principal', label: '校長先生', emoji: '🎓' },
    { value: 'classmate', label: '同級生', emoji: '🧑‍🤝‍🧑' },
    { value: 'doraemon', label: '青いロボット猫', emoji: '🔵' },
    { value: 'pikachu', label: '黄色いモンスター風', emoji: '⚡' },
  ];

  const timeOptions = [
    { value: '24h', label: '24時間制' },
    { value: '12h', label: '12時間制 (午前/午後)' },
  ];

  return (
    <div className="p-8 md:p-12 bg-white h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-bold text-gray-800">設定</h2>
          {saving && <span className="text-xs font-medium text-gray-400 animate-pulse">保存中...</span>}
        </div>

        <div className="space-y-10">
           <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-6 border-b border-gray-200 pb-3">AI アシスタント設定</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">報告メールのトーン</span>
                    <select
                      value={settings.email_tone}
                      onChange={(e) => updateSetting('email_tone', e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-sm p-2.5 rounded-lg outline-none font-medium text-gray-700"
                    >
                       {toneOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                 </div>

                 <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Google Workspace連携</span>
                      <p className="text-xs text-gray-400 mt-1">
                        {isConnected ? '連携済み。メールやカレンダーにアクセスできます。' : 'GmailとCalendarに接続します。'}
                      </p>
                    </div>
                    <button
                      onClick={startOAuth}
                      disabled={isLoading || isConnected}
                      className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        isConnected
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'text-white hover:opacity-90'
                      }`}
                      style={!isConnected ? { backgroundColor: '#0D9488' } : {}}
                    >
                      {isLoading ? '処理中...' : isConnected ? '連携済み' : 'Googleと連携'}
                    </button>
                 </div>

                 <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-700">証拠メモの自動解析</span>
                      <button
                        onClick={() => updateSetting('auto_memo', !settings.auto_memo)}
                        className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${settings.auto_memo ? 'bg-gray-800' : 'bg-gray-100'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.auto_memo ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {personaOptions.map(p => (
                        <button
                          key={p.value}
                          onClick={() => updateSetting('ai_persona', p.value)}
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                            settings.ai_persona === p.value
                              ? 'border-gray-800 bg-gray-50 shadow-md scale-105'
                              : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="text-2xl mb-1">{p.emoji}</span>
                          <span className="text-xs font-semibold text-gray-600 leading-tight">{p.label}</span>
                        </button>
                      ))}
                    </div>
                 </div>
              </div>
           </section>

           <section>
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">日報メールフォーマット</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs font-semibold text-gray-400 tracking-widest mb-2 block">宛先名</label>
                    <input
                      value={settings.email_recipient}
                      onChange={(e) => updateSetting('email_recipient', e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-200 text-sm p-3 rounded-xl outline-none font-bold text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-zinc-100"
                    />
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs font-semibold text-gray-400 tracking-widest mb-2 block">差出人名</label>
                    <input
                      value={settings.email_sender_name}
                      onChange={(e) => updateSetting('email_sender_name', e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-200 text-sm p-3 rounded-xl outline-none font-bold text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-zinc-100"
                    />
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <label className="text-xs font-semibold text-gray-400 tracking-widest mb-2 block">会社名（挨拶文用）</label>
                  <input
                    value={settings.email_sender_company}
                    onChange={(e) => updateSetting('email_sender_company', e.target.value)}
                    placeholder="例: CSG"
                    className="w-full bg-gray-50 border-2 border-gray-200 text-sm p-3 rounded-xl outline-none font-bold text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-zinc-100"
                  />
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <label className="text-xs font-semibold text-gray-400 tracking-widest mb-2 block">メール署名</label>
                  <textarea
                    value={settings.email_signature}
                    onChange={(e) => updateSetting('email_signature', e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 text-xs p-3 rounded-xl outline-none font-mono font-bold text-gray-700 focus:border-gray-400 focus:ring-2 focus:ring-zinc-100 min-h-[120px] resize-y"
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 tracking-widest mb-2">プレビュー</p>
                  <div className="text-xs font-mono text-gray-700 whitespace-pre-wrap bg-white rounded-xl p-4 border border-gray-200">
{`${settings.email_recipient}

いつもありがとうございます。
${settings.email_sender_company}の${settings.email_sender_name}です。

○月○日の業務報告です。

■09:00–10:00
・タスク例（顧客名様）

${settings.email_signature}`}
                  </div>
                </div>
              </div>
           </section>

           <section>
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">改善履歴</h3>
              <div className="space-y-3">
                {[
                  { ver: 'v2.5', date: '2026-02-28', items: ['「習慣管理」→「ルーティン管理」に名称変更', 'ルーティンに頻度（毎日/毎週/毎月/毎年）・時刻・曜日・日付を細かく設定可能に', 'ルーティンからプランへワンタップ追加', 'タスク詳細の構造化ステップ表示（チェックリスト+ツール連携）', '担当者フィールドを削除（@メンション方式へ移行予定）', '「入力候補」ラベルを「テンプレート」に統一', '改善履歴一覧を追加（この画面）'] },
                  { ver: 'v2.4', date: '2026-02-27', items: ['AIワークハブにタブ制導入（STEPS / AI TOOLS）', 'ワークフローウィザード（Q&A方式）を実装', 'タスクにワークフロー回答を保存（JSONB）', '顧客別・カテゴリ別サマリ表示を追加', 'テンプレート（ワンタップ追加）機能'] },
                  { ver: 'v2.3', date: '2026-02-26', items: ['Supabase統合（bp-erp基幹DB）', 'リアルタイム同期（タスク・習慣）', 'Gmail/カレンダー連携', 'Google OAuth認証', 'メール→タスク変換', '日報メール自動生成'] },
                  { ver: 'v2.0', date: '2026-02-25', items: ['ZenWork Mini 初回リリース', '本日の業務・週次計画・タイムライン', '業務分析ダッシュボード', 'AIアシスタント（Gemini）', '受信トレイ・設定画面'] },
                ].map(release => (
                  <div key={release.ver} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg">{release.ver}</span>
                      <span className="text-xs font-bold text-gray-400">{release.date}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {release.items.map((item, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-emerald-500 mt-0.5 shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                          </span>
                          <span className="text-xs font-bold text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
           </section>

           <section>
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">ユーザーインターフェース</h3>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-sm font-semibold text-gray-700">ダークモード</span>
                    <button
                      onClick={() => updateSetting('dark_mode', !settings.dark_mode)}
                      className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${settings.dark_mode ? 'bg-gray-800' : 'bg-gray-100'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.dark_mode ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">サイケデリック</span>
                      <p className="text-xs text-gray-400 font-bold mt-1">虹色・回転・グラデーション効果</p>
                    </div>
                    <button
                      onClick={() => updateSetting('psychedelic_mode', !settings.psychedelic_mode)}
                      className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${settings.psychedelic_mode ? 'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400' : 'bg-gray-100'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.psychedelic_mode ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-sm font-semibold text-gray-700">時間の表示形式</span>
                    <select
                      value={settings.time_format}
                      onChange={(e) => updateSetting('time_format', e.target.value)}
                      className="bg-gray-50 border-2 border-gray-100 text-xs p-2.5 rounded-xl outline-none font-bold text-gray-900"
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
