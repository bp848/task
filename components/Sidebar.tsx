
import React from 'react';
import { ViewType } from '../types';

interface User {
  name: string;
  role: string;
  avatar: string;
}

interface SidebarProps {
  currentView: ViewType;
  selectedProjectId?: string;
  onViewChange: (view: ViewType, projectId?: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  user: User;
  onLogout?: () => void;
}

const NAV_ITEMS = [
  { id: 'today',    label: '本日の業務',    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'inbox',    label: '受信トレイ',    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'planner',  label: '週次計画',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'schedule', label: 'カレンダー',    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'metrics',  label: '業務分析',      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'habits',   label: 'ルーティン',    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { id: 'tools',    label: 'ツール',        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { id: 'settings', label: '設定',          icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
];

const VIEW_ITEMS = [
  { id: 'task-view',     label: '作業ベース', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'customer-view', label: '顧客ベース', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
];

const PROJECTS = [
  { id: 'p1', name: '制作・デザイン',   color: '#0D9488' },
  { id: 'p2', name: '進行管理・MTG',    color: '#6366F1' },
];

const Sidebar: React.FC<SidebarProps> = ({
  currentView, selectedProjectId, onViewChange, isOpen, toggleSidebar, user, onLogout
}) => {
  const handleNav = (view: ViewType, projectId?: string) => {
    onViewChange(view, projectId);
    if (window.innerWidth < 768) toggleSidebar();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        flex flex-col h-full
        bg-white border-r border-gray-200
        transition-all duration-250 ease-in-out
        fixed md:relative z-50
        ${isOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full md:w-14 md:translate-x-0'}
      `}>
        {/* ユーザー情報 */}
        <div className={`h-16 border-b border-gray-200 flex items-center shrink-0 ${isOpen ? 'px-5 gap-3' : 'px-0 justify-center'}`}>
          {user.avatar ? (
            <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200 shrink-0" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-teal-100 shrink-0 flex items-center justify-center text-sm font-semibold text-teal-700">
              {user.name?.[0] || 'U'}
            </div>
          )}
          {isOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
              {user.role && <div className="text-xs text-gray-400 truncate mt-0.5">{user.role}</div>}
            </div>
          )}
          {isOpen && (
            <button onClick={toggleSidebar} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map(item => {
              const active = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNav(item.id as ViewType)}
                    title={!isOpen ? item.label : undefined}
                    className={`sidebar-item w-full ${active ? 'sidebar-item-active' : ''} ${!isOpen ? 'justify-center px-0' : ''}`}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d={item.icon} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isOpen && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {isOpen && (
            <div className="mt-8 px-3">
              <div className="px-4 mb-2">
                <span className="label-xs">プロジェクト</span>
              </div>
              <ul className="space-y-1">
                {VIEW_ITEMS.map(item => {
                  const active = currentView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNav(item.id as ViewType)}
                        className={`sidebar-item w-full ${active ? 'sidebar-item-active' : ''}`}
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d={item.icon} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
                {PROJECTS.map(p => {
                  const active = currentView === 'project-detail' && selectedProjectId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => handleNav('project-detail', p.id)}
                        className={`sidebar-item w-full ${active ? 'sidebar-item-active' : ''}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* フッター */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          {isOpen && onLogout && (
            <button
              onClick={onLogout}
              className="sidebar-item w-full text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>ログアウト</span>
            </button>
          )}
          <button
            onClick={toggleSidebar}
            title={isOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
            className={`sidebar-item w-full hidden md:flex ${!isOpen ? 'justify-center px-0' : ''}`}
          >
            <svg className={`w-5 h-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
