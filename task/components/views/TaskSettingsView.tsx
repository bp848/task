import React, { useState } from 'react';

interface TaskPreset {
  id: string;
  name: string;
  slug: string;
  duration: number;
  category: string;
  description: string;
  enabled: boolean;
  color: string;
}

const INITIAL_PRESETS: TaskPreset[] = [
  { id: '1', name: 'クイックタスク', slug: '15min', duration: 15, category: 'general', description: '短時間で完了する簡易タスク', enabled: true, color: '#0D9488' },
  { id: '2', name: '定例ミーティング', slug: '30min-mtg', duration: 30, category: 'meeting', description: '社内定例・進捗確認会議', enabled: true, color: '#6366F1' },
  { id: '3', name: 'クライアント打合せ', slug: '60min-client', duration: 60, category: 'meeting', description: '顧客との商談・レビュー会議', enabled: true, color: '#F59E0B' },
  { id: '4', name: 'ディープワーク', slug: '120min-deep', duration: 120, category: 'focus', description: '集中作業（コーディング・デザイン・執筆）', enabled: true, color: '#EC4899' },
  { id: '5', name: '日報作成', slug: 'report', duration: 15, category: 'admin', description: '業務日報の作成・送信', enabled: false, color: '#8B5CF6' },
];

const CATEGORIES: Record<string, string> = {
  general: '一般',
  meeting: '会議',
  focus: '集中',
  admin: '管理',
};

const TaskSettingsView: React.FC = () => {
  const [presets, setPresets] = useState<TaskPreset[]>(INITIAL_PRESETS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const togglePreset = (id: string) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const filtered = presets.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 md:p-12 bg-white h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">タスク設定</h2>
          <button
            onClick={() => {
              const newId = String(Date.now());
              setPresets(prev => [...prev, {
                id: newId, name: '新しいタスク', slug: 'new-task', duration: 30,
                category: 'general', description: '', enabled: true, color: '#0D9488',
              }]);
              setEditingId(newId);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
            style={{ backgroundColor: '#0D9488' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新規
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-8">タスクのテンプレートを管理します。ワンタップで業務に追加できます。</p>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="検索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-300 transition-all bg-gray-50"
            />
          </div>
        </div>

        {/* Preset list */}
        <div className="space-y-3">
          {filtered.map(preset => (
            <div
              key={preset.id}
              className={`bg-white rounded-xl border transition-all ${editingId === preset.id ? 'border-gray-300 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{preset.name}</span>
                      <span className="text-xs text-gray-400">/{preset.slug}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {preset.duration}m
                      </span>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{CATEGORIES[preset.category] || preset.category}</span>
                    </div>
                    {preset.description && <p className="text-xs text-gray-400 mt-1 truncate">{preset.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => togglePreset(preset.id)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${preset.enabled ? '' : 'bg-gray-200'}`}
                    style={preset.enabled ? { backgroundColor: '#0D9488' } : {}}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${preset.enabled ? 'right-1' : 'left-1'}`} />
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingId(editingId === preset.id ? null : preset.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all" title="複製">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all" title="リンクをコピー">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all" title="その他">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit panel */}
              {editingId === preset.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50 animate-fade-in-up">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">タスク名</label>
                      <input
                        value={preset.name}
                        onChange={e => setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, name: e.target.value } : p))}
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">スラッグ</label>
                      <input
                        value={preset.slug}
                        onChange={e => setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, slug: e.target.value } : p))}
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">所要時間（分）</label>
                      <input
                        type="number"
                        value={preset.duration}
                        onChange={e => setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, duration: Number(e.target.value) } : p))}
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">カテゴリ</label>
                      <select
                        value={preset.category}
                        onChange={e => setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, category: e.target.value } : p))}
                        className="input-base"
                      >
                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">カラー</label>
                      <input
                        type="color"
                        value={preset.color}
                        onChange={e => setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, color: e.target.value } : p))}
                        className="w-full h-[46px] rounded-lg border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">説明</label>
                    <textarea
                      value={preset.description}
                      onChange={e => setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, description: e.target.value } : p))}
                      className="input-base min-h-[80px] resize-y"
                    />
                  </div>
                  <div className="flex justify-end mt-4 gap-2">
                    <button
                      onClick={() => setPresets(prev => prev.filter(p => p.id !== preset.id))}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn-primary"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskSettingsView;
