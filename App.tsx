import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import TodayView from './components/views/TodayView';
import PlannerView from './components/views/PlannerView';
import ScheduleView from './components/views/ScheduleView';
import MetricsView from './components/views/MetricsView';
import HabitsView from './components/views/HabitsView';
import SettingsView from './components/views/SettingsView';
import InboxView from './components/views/InboxView';
import ProjectDetailView from './components/views/ProjectDetailView';
import AiWorkHub from './components/AiWorkHub';
import { ViewType, Task, Project, Email } from './types';
import { initialProjects } from './constants';
import { supabase } from './lib/supabase';
import { useZenworkTasks } from './hooks/useZenworkTasks';
import { useEmails } from './hooks/useEmails';

const viewTitleMap: Record<ViewType, string> = {
  'today': '本日の業務',
  'inbox': '受信トレイ',
  'planner': '週次計画',
  'schedule': 'タイムライン',
  'metrics': '業務分析',
  'habits': '習慣管理',
  'settings': '設定',
  'project-detail': 'プロジェクト詳細'
};

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [projects] = useState<Project[]>(initialProjects);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Supabase-backed hooks
  const {
    tasks, addTask, updateTask, toggleTask, syncTimeSpent, mergeCalendarTasks,
  } = useZenworkTasks(session);
  const {
    emails, fetchFromGmail, markAsRead, setEmails, clearEmails,
  } = useEmails(session);

  const user = session ? {
    name: session.user.user_metadata?.full_name || session.user.email || 'ユーザー',
    role: session.user.user_metadata?.role || '',
    avatar: session.user.user_metadata?.avatar_url || '',
  } : { name: '', role: '', avatar: '' };

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // Supabase Auth session management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsGoogleConnected(true);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to get session:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
        setIsGoogleConnected(true);
        if (session.provider_token) {
          await saveGoogleTokens(session);
        }
        fetchGoogleData(session);
      } else if (event === 'SIGNED_OUT') {
        setIsGoogleConnected(false);
        clearEmails();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Google data when targetDate changes
  useEffect(() => {
    if (session && isGoogleConnected) {
      fetchGoogleData(session);
    }
  }, [targetDate]);

  const saveGoogleTokens = async (session: Session) => {
    if (!session.provider_token) return;
    const { error } = await supabase.from('user_google_tokens').upsert({
      user_id: session.user.id,
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token || null,
      scope: GOOGLE_SCOPES,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to save Google tokens:', error);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: GOOGLE_SCOPES,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('Google login error:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsGoogleConnected(false);
    clearEmails();
  };

  const fetchGoogleData = async (currentSession?: Session) => {
    const s = currentSession || session;
    if (!s) return;

    const token = s.access_token;

    // Fetch Gmail
    try {
      const emailRes = await fetch('/api/gmail/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmails(emailData);
      }
    } catch (err) {
      console.error('Failed to fetch Gmail:', err);
    }

    // Fetch Calendar events and merge as non-persisted tasks
    try {
      const calRes = await fetch(`/api/calendar/events?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        mergeCalendarTasks(calData);
      }
    } catch (err) {
      console.error('Failed to fetch Calendar:', err);
    }
  };

  // Timer: increment local time_spent every second, sync to DB periodically
  const activeTimeRef = useRef<number>(0);
  useEffect(() => {
    let interval: number;
    if (activeTaskId) {
      const task = tasks.find(t => t.id === activeTaskId);
      if (task) activeTimeRef.current = task.timeSpent;

      interval = window.setInterval(() => {
        activeTimeRef.current += 1;
        syncTimeSpent(activeTaskId, activeTimeRef.current);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleViewChange = (view: ViewType, projectId?: string) => {
    setCurrentView(view);
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
  };

  const handleAddTask = (
    title: string,
    projectId: string = 'p1',
    tags: string[] = [],
    estimatedTime: number = 3600,
    date: string = targetDate,
    explicitStartTime?: string,
    isRoutine: boolean = false,
    customerName?: string,
    projectName?: string,
    details?: string
  ) => {
    addTask(title, projectId, tags, estimatedTime, date, explicitStartTime, isRoutine, customerName, projectName, details);
  };

  const convertEmailToTask = (email: Email) => {
    addTask(email.subject, 'p3', ['Gmail', 'MCP'], 1800, targetDate, undefined, false, email.customerName, email.projectName);
    markAsRead(email.id);
  };

  const handleToggleTask = (id: string) => {
    toggleTask(id);
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const toggleTimer = (id: string) => {
    if (activeTaskId === id) {
      setActiveTaskId(null);
    } else {
      setActiveTaskId(id);
      setSelectedTaskId(id);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return (
          <TodayView
            tasks={tasks}
            projects={projects}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onUpdateTask={(id, updates) => updateTask(id, updates)}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            activeTaskId={activeTaskId}
            onToggleTimer={toggleTimer}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            onAddRoutines={() => {}}
          />
        );
      case 'inbox':
        return <InboxView tasks={tasks} emails={emails} onConvertToTask={convertEmailToTask} />;
      case 'planner':
        return <PlannerView tasks={tasks} onAddTask={handleAddTask} />;
      case 'schedule':
        return <ScheduleView tasks={tasks} targetDate={targetDate} />;
      case 'project-detail':
        const project = projects.find(p => p.id === selectedProjectId);
        return project ? <ProjectDetailView project={project} tasks={tasks} onToggleTask={handleToggleTask} /> : null;
      case 'metrics':
        return <MetricsView tasks={tasks} />;
      case 'habits':
        return <HabitsView session={session} />;
      case 'settings':
        return <SettingsView session={session} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50/20">
        <div className="text-zinc-400 text-sm font-bold">読み込み中...</div>
      </div>
    );
  }

  // Login screen when not authenticated
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50/20">
        <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200 p-12 max-w-md w-full mx-4 text-center">
          <h1 className="text-2xl font-black text-zinc-800 tracking-widest mb-2">ZenWork Mini</h1>
          <p className="text-xs text-zinc-400 font-bold mb-10">タスク管理 + Google Workspace 連携</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-lg hover:bg-zinc-800 transition-all text-sm font-black tracking-widest"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            <span>Googleでログイン</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50/20 text-zinc-900 font-sans">
      <Sidebar
        currentView={currentView}
        selectedProjectId={selectedProjectId}
        onViewChange={handleViewChange}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b-2 border-zinc-100 bg-white flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center space-x-8">
            <h1 className="text-base font-black text-zinc-800 tracking-widest">
              {currentView === 'project-detail' ? projects.find(p => p.id === selectedProjectId)?.name : viewTitleMap[currentView]}
            </h1>
            <div className="flex items-center space-x-3 text-[11px] font-black text-zinc-300">
               <span className="tracking-widest">表示日:</span>
               <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-zinc-50 px-4 py-1.5 rounded-full text-zinc-900 font-black outline-none cursor-pointer hover:bg-zinc-100 transition-all shadow-inner border border-zinc-100"
               />
            </div>
          </div>
          <div className="flex items-center space-x-6">
             {isGoogleConnected && (
               <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                 <span>Google 接続済み</span>
               </div>
             )}
             {activeTaskId && (
               <div className="flex items-center space-x-3 bg-zinc-800 text-white px-4 py-1.5 rounded-full shadow-lg shadow-zinc-200">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  <span className="text-[11px] font-black tracking-widest">時間計測中...</span>
               </div>
             )}
             <div className="text-[11px] font-black text-zinc-200 tracking-widest uppercase">ZenWork Mini v2.0.0</div>
          </div>
        </header>
        <div className="flex-1 overflow-auto custom-scrollbar flex">
          <div className="flex-1">
            {renderView()}
          </div>
          <AiWorkHub
            task={selectedTask}
            tasks={tasks}
            targetDate={targetDate}
            onClose={() => setSelectedTaskId(null)}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
