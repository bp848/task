import React from 'react';

interface Tool {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  version: string;
  package: string;
  github: string;
  docs: string[];
  tags: string[];
  status: 'available' | 'coming_soon';
}

const TOOLS: Tool[] = [
  {
    id: 'meeting-minutes',
    name: '議事録アシスタント',
    nameEn: 'Meeting Minutes Assistant',
    description: 'リアルタイム音声認識で会議の議事録を自動生成。Gemini AIによる要約・アクションアイテム抽出・決定事項の整理を行います。Supabase連携でチーム共有も可能。',
    version: '1.0.0',
    package: '@bp848/meeting-minutes-assistant',
    github: 'https://github.com/bp848/meeting',
    docs: [
      'docs/SPECIFICATION.md',
      'docs/INTEGRATION.md',
      'docs/PROCEDURES.md',
    ],
    tags: ['AI', '音声認識', 'Gemini', 'Supabase'],
    status: 'available',
  },
];

const ToolsView: React.FC = () => {
  return (
    <div className="p-8 md:p-12 bg-white h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ツール</h2>
          <p className="text-sm text-gray-400">業務効率化ツール・npm パッケージ一覧</p>
        </div>

        <div className="space-y-6">
          {TOOLS.map(tool => (
            <div key={tool.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#0D9488' }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{tool.name}</h3>
                      <p className="text-xs text-gray-400">{tool.nameEn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">v{tool.version}</span>
                    {tool.status === 'available' ? (
                      <span className="text-xs font-medium px-3 py-1 rounded-lg" style={{ color: '#0D9488', backgroundColor: '#F0FDFA' }}>利用可能</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-lg">準備中</span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{tool.description}</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {tool.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">{tag}</span>
                  ))}
                </div>

                {/* Install command */}
                <div className="bg-gray-900 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400 tracking-wide">INSTALL</span>
                  </div>
                  <code className="text-sm font-mono" style={{ color: '#5EEAD4' }}>npm install {tool.package}</code>
                </div>

                {/* Docs */}
                <div className="mb-5">
                  <span className="text-xs font-semibold text-gray-400 tracking-wide block mb-3">ドキュメント</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {tool.docs.map(doc => {
                      const name = doc.split('/').pop()?.replace('.md', '') || doc;
                      const labels: Record<string, string> = {
                        SPECIFICATION: '仕様書',
                        INTEGRATION: '統合説明書',
                        PROCEDURES: '手順書',
                      };
                      return (
                        <a
                          key={doc}
                          href={`${tool.github}/blob/main/${doc}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all"
                        >
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <div>
                            <span className="text-sm font-semibold text-gray-700 block">{labels[name] || name}</span>
                            <span className="text-xs text-gray-400">{doc}</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <a
                    href={tool.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                  <a
                    href={`https://www.npmjs.com/package/${tool.package}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
                    style={{ backgroundColor: '#CB3837' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/>
                    </svg>
                    npm
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Coming soon placeholder */}
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <p className="text-sm font-semibold text-gray-400">新しいツールを追加予定</p>
            <p className="text-xs text-gray-300 mt-1">社内ツールやnpmパッケージをここに登録できます</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsView;
