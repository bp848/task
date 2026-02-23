
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
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, selectedProjectId, onViewChange, isOpen, toggleSidebar, user }) => {
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
    { id: 'p1', name: '制作・デザイン', color: 'bg-rose-400' },
    { id: 'p2', name: '進行管理・MTG', color: 'bg-emerald-400' },
  ];

  return (
    <aside className={`bg-rose-50/30 flex flex-col h-full border-r border-rose-100 transition-all duration-200 ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className={`p-4 border-b border-rose-100 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen ? (
          <div className="flex items-center space-x-3">
            <img src={user.avatar} className="w-8 h-8 rounded-full border border-rose-200" alt="User" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">{user.name}</span>
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-tight">{user.role}</span>
            </div>
          </div>
        ) : (
          <img src={user.avatar} className="w-8 h-8 rounded-full border border-rose-200" alt="User" />
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1 px-2">
          {mainItems.map(item => (
            <li key={item.id}>
              <button 
                onClick={() => onViewChange(item.id as ViewType)}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${
                  currentView === item.id 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
                    : 'text-slate-600 hover:bg-rose-100/50'
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
            <h3 className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-4">プロジェクト</h3>
            <ul className="space-y-1">
              {projects.map(p => (
                <li key={p.id}>
                  <button 
                    onClick={() => onViewChange('project-detail', p.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all ${
                      currentView === 'project-detail' && selectedProjectId === p.id
                        ? 'bg-rose-50 text-rose-600 font-bold border border-rose-100'
                        : 'text-slate-600 hover:bg-rose-50'
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

      <div className="p-4 border-t border-rose-100">
        <button 
          onClick={toggleSidebar} 
          className="w-full flex items-center justify-center p-2 hover:bg-rose-100 rounded-lg text-rose-300 transition-all"
        >
          <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
