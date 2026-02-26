
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

const Sidebar: React.FC<SidebarProps> = ({ currentView, selectedProjectId, onViewChange, isOpen, toggleSidebar, user, onLogout }) => {
  const mainItems = [
    { id: 'today', label: '本日の業務', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'inbox', label: '受信トレイ', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'planner', label: '週次計画', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'schedule', label: 'タイムライン', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'metrics', label: '業務分析', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'habits', label: '習慣管理', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'settings', label: '設定', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  const projects = [
    { id: 'p1', name: '制作・デザイン', color: 'bg-zinc-400' },
    { id: 'p2', name: '進行管理・MTG', color: 'bg-zinc-500' },
  ];

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside className={`bg-zinc-50/90 backdrop-blur-md flex flex-col h-full border-r border-zinc-100 transition-all duration-300 fixed md:relative z-50 ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-16 md:translate-x-0'}`}>
        <div className={`p-4 border-b border-zinc-100 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen ? (
            <div className="flex items-center space-x-3">
              <img src={user.avatar} className="w-8 h-8 rounded-full border border-zinc-200" alt="User" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-700">{user.name}</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{user.role}</span>
              </div>
            </div>
          ) : (
            <img src={user.avatar} className="w-8 h-8 rounded-full border border-zinc-200 hidden md:block" alt="User" />
          )}
          {/* モバイル用閉じるボタン */}
          <button onClick={toggleSidebar} className="md:hidden p-2 text-zinc-400 hover:text-zinc-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-2">
            {mainItems.map(item => (
              <li key={item.id}>
                <button 
                  onClick={() => {
                    onViewChange(item.id as ViewType);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${
                    currentView === item.id 
                      ? 'bg-zinc-800 text-white shadow-lg shadow-zinc-200' 
                      : 'text-zinc-600 hover:bg-zinc-100/50'
                  }`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d={item.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isOpen && <span className="ml-3 text-sm font-bold">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>

          {isOpen && (
            <div className="mt-8 px-4">
              <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-4">プロジェクト</h3>
              <ul className="space-y-1">
                {projects.map(p => (
                  <li key={p.id}>
                    <button 
                      onClick={() => {
                        onViewChange('project-detail', p.id);
                        if (window.innerWidth < 768) toggleSidebar();
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all ${
                        currentView === 'project-detail' && selectedProjectId === p.id
                          ? 'bg-zinc-50 text-zinc-900 font-bold border border-zinc-100'
                          : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${p.color} mr-3`}></div>
                      <span className="truncate">{p.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-100 hidden md:block space-y-2">
          {isOpen && onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-xs font-bold text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ログアウト
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 hover:bg-zinc-100 rounded-lg text-zinc-300 transition-all"
          >
            <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
