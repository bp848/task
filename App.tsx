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
import TaskCategoryView from './components/views/TaskCategoryView';
import CustomerView from './components/views/CustomerView';
import ToolsView from './components/views/ToolsView';
import AiWorkHub from './components/AiWorkHub';
import { ViewType, Task, Project, Email } from './types';
import { initialProjects } from './constants';
import { supabase, callEdgeFunction } from './lib/gws';
import { useZenworkTasks } from './hooks/useZenworkTasks';
import { useEmails } from './hooks/useEmails';

const viewTitleMap: Record<ViewType, string> = {
  'today': '本日の業務',
  'inbox': '受信トレイ',
  'planner': '週次計画',
  'schedule': 'カレンダー',
  'metrics': '業務分析',
  'habits': 'ルーティン管理',
  'settings': '設定',
  'project-detail': 'プロジェクト詳細',
  'task-view': '作業ベース',
  'customer-view': '顧客ベース',
  'tools': 'ツール',
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
  const [appSettings, setAppSettings] = useState<{
    psychedelic_mode?: boolean; ai_persona?: string; auto_memo?: boolean;
    email_recipient?: string; email_sender_name?: string; email_sender_company?: string; email_signature?: string;
  }>({});
  const [clockTime, setClockTime] = useState(new Date());
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [plannerWeekOffset, setPlannerWeekOffset] = useState(0);
  const [plannerBulkMode, setPlannerBulkMode] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Supabase-backed hooks
  const {
    tasks, addTask, updateTask, toggleTask, deleteTask, syncTimeSpent, mergeCalendarTasks,
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
    const timeout = setTimeout(() => {
      console.warn('getSession timed out, showing login screen');
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      if (session) {
        // Load settings + customers
        supabase.from('zenwork_settings').select('*').eq('user_id', session.user.id).single()
          .then(({ data }) => { if (data) setAppSettings({
            psychedelic_mode: data.psychedelic_mode, ai_persona: data.ai_persona, auto_memo: data.auto_memo,
            email_recipient: data.email_recipient, email_sender_name: data.email_sender_name,
            email_sender_company: data.email_sender_company, email_signature: data.email_signature,
          }); });
        supabase.from('customers').select('customer_name').not('customer_name', 'is', null).order('customer_name')
          .then(({ data }) => { if (data) setCustomerSuggestions(data.map((r: { customer_name: string }) => r.customer_name).filter(Boolean)); });

        // Try to fetch Google data — token validity is determined by actual API success
        await fetchGoogleData(session);
      }
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeout);
      console.error('Failed to get session:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
        setGoogleError(null);
        // Try fetching Google data after login
        setTimeout(() => fetchGoogleData(session), 500);
      } else if (event === 'SIGNED_OUT') {
        setIsGoogleConnected(false);
        clearEmails();
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Real-time clock
  useEffect(() => {
    const id = window.setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch Google data when targetDate changes
  useEffect(() => {
    if (session && isGoogleConnected) {
      fetchCalendarEvents();
    }
  }, [targetDate]);

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

  const fetchCalendarEvents = async () => {
    try {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await callEdgeFunction('calendar-events', {
        body: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
        },
      });

      const events = result?.events || result?.items || (Array.isArray(result) ? result : []);

      if (events.length > 0) {
        const mappedEvents = events.map((event: any) => ({
          id: event.id,
          title: event.summary || event.title,
          startTime: event.start?.dateTime || event.start?.date || event.startTime,
          endTime: event.end?.dateTime || event.end?.date || event.endTime,
          description: event.description,
          tags: ['Google Calendar'],
        }));
        mergeCalendarTasks(mappedEvents);
      }
    } catch (err: any) {
      console.error('Failed to fetch Calendar:', err);
    }
  };

  const fetchGoogleData = async (currentSession?: Session) => {
    const s = currentSession || session;
    if (!s) return;

    setGoogleError(null);

    // First check if Google is connected via Edge Function
    try {
      const status = await callEdgeFunction('google-oauth-status');
      if (!status?.connected) {
        setIsGoogleConnected(false);
        setGoogleError('設定画面で「Googleと連携」を実行してください');
        return;
      }
    } catch {
      // Status check failed — try fetching data anyway
    }

    // Try Gmail
    const result = await fetchFromGmail();

    if (result === 'success') {
      setIsGoogleConnected(true);
      await fetchCalendarEvents();
    } else if (result === 'token_error') {
      setIsGoogleConnected(false);
      setGoogleError('設定画面で「Googleと連携」を実行してください');
    } else {
      setIsGoogleConnected(false);
    }
  };

  // Timer: Date.now()ベースで正確に計測
  const timerStartRef = useRef<number>(0);
  const baseTimeRef = useRef<number>(0);
  useEffect(() => {
    let interval: number;
    if (activeTaskId) {
      const task = tasks.find(t => t.id === activeTaskId);
      baseTimeRef.current = task ? task.timeSpent : 0;
      timerStartRef.current = Date.now();

      interval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
        const total = baseTimeRef.current + elapsed;
        syncTimeSpent(activeTaskId, total);
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

  const convertEmailToTask = (email: Email, date: string, startTime: string, estimatedTime: number) => {
    addTask(email.subject, 'p3', ['Gmail'], estimatedTime, date, startTime || undefined, false, email.customerName, email.projectName);
    markAsRead(email.id);
  };

  const handleToggleTask = (id: string) => {
    toggleTask(id);
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const toggleTimer = (id: string) => {
    const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (activeTaskId === id) {
      updateTask(id, { timerStoppedAt: now });
      setActiveTaskId(null);
    } else {
      updateTask(id, { timerStartedAt: now });
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
            customerSuggestions={customerSuggestions}
            emailFormat={{
              recipient: appSettings.email_recipient,
              senderName: appSettings.email_sender_name,
              senderCompany: appSettings.email_sender_company,
              signature: appSettings.email_signature,
            }}
          />
        );
      case 'inbox':
        return <InboxView tasks={tasks} emails={emails} onConvertToTask={convertEmailToTask} />;
      case 'planner':
        return <PlannerView
          tasks={tasks}
          onAddTask={handleAddTask}
          onUpdateTask={updateTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={deleteTask}
          onNavigateToDay={(date) => { setTargetDate(date); setCurrentView('today'); }}
          weekOffset={plannerWeekOffset}
          setWeekOffset={setPlannerWeekOffset}
          isBulkMode={plannerBulkMode}
          setIsBulkMode={setPlannerBulkMode}
        />;
      case 'schedule':
        return <ScheduleView tasks={tasks} targetDate={targetDate} setTargetDate={setTargetDate} />;
      case 'project-detail':
        const project = projects.find(p => p.id === selectedProjectId);
        return project ? <ProjectDetailView project={project} tasks={tasks} onToggleTask={handleToggleTask} /> : null;
      case 'task-view':
        return <TaskCategoryView tasks={tasks} targetDate={targetDate} onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)} onToggleTask={handleToggleTask} />;
      case 'customer-view':
        return <CustomerView tasks={tasks} targetDate={targetDate} onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)} onToggleTask={handleToggleTask} />;
      case 'metrics':
        return <MetricsView tasks={tasks} />;
      case 'habits':
        return <HabitsView session={session} onAddTaskToPlanner={(title: string, date: string, startTime?: string, estimatedMinutes?: number, customerName?: string, projectName?: string) => {
          handleAddTask(title, 'p1', [], (estimatedMinutes || 30) * 60, date, startTime, true, customerName, projectName);
        }} />;
      case 'settings':
        return <SettingsView
          session={session}
          onSettingsChange={(s) => setAppSettings({
            psychedelic_mode: s.psychedelic_mode, ai_persona: s.ai_persona, auto_memo: s.auto_memo,
            email_recipient: s.email_recipient, email_sender_name: s.email_sender_name,
            email_sender_company: s.email_sender_company, email_signature: s.email_signature,
          })}
          onGoogleConnected={() => fetchGoogleData(session || undefined)}
        />;
      case 'tools':
        return <ToolsView />;
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
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            <span>Googleでログイン</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-zinc-50/20 text-zinc-900 font-sans ${appSettings.psychedelic_mode ? 'psychedelic-mode' : ''}`}>
      {appSettings.psychedelic_mode && (
        <style>{`
          @keyframes psyche-hue { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
          @keyframes psyche-bg { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          .psychedelic-mode { animation: psyche-hue 8s linear infinite; }
          .psychedelic-mode main { background: linear-gradient(270deg, #ff6ec7, #7873f5, #4ade80, #facc15, #f87171, #a78bfa); background-size: 600% 600%; animation: psyche-bg 6s ease infinite; }
          .psychedelic-mode header { backdrop-filter: blur(8px) saturate(200%); background: rgba(255,255,255,0.5) !important; }
        `}</style>
      )}
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
        <header className="h-14 md:h-16 border-b-2 border-zinc-100 bg-white flex items-center justify-between px-3 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-2 md:gap-6 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-all shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <h1 className="text-sm md:text-base font-black text-zinc-800 tracking-widest truncate">
              {currentView === 'project-detail' ? projects.find(p => p.id === selectedProjectId)?.name : viewTitleMap[currentView]}
            </h1>
            {currentView === 'planner' ? (
              <div className="hidden sm:flex items-center space-x-2">
                <button onClick={() => setPlannerWeekOffset(w => w - 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all text-slate-500 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button onClick={() => setPlannerWeekOffset(() => 0)} className="px-3 py-1 rounded-lg text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-all cursor-pointer">今週</button>
                <button onClick={() => setPlannerWeekOffset(w => w + 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all text-slate-500 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </button>
                <button
                  onClick={() => setPlannerBulkMode(v => !v)}
                  className={`ml-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${plannerBulkMode ? 'bg-indigo-800 text-white border-indigo-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {plannerBulkMode ? '閉じる' : '一括追加'}
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2 text-[11px] font-black text-zinc-300">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-zinc-50 px-3 py-1.5 rounded-full text-zinc-900 font-black outline-none cursor-pointer hover:bg-zinc-100 transition-all shadow-inner border border-zinc-100 text-xs"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {googleError ? (
              <button
                onClick={() => setCurrentView('settings')}
                className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-white bg-amber-600 px-2 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-amber-700 transition-all cursor-pointer shadow-lg shadow-amber-200"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                <span className="hidden sm:inline">Googleと連携</span>
              </button>
            ) : isGoogleConnected ? (
              <div className="hidden md:flex items-center space-x-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>Google 接続済み</span>
              </div>
            ) : null}
            {activeTaskId && (
              <div className="flex items-center gap-2 bg-zinc-800 text-white px-3 py-1.5 rounded-full shadow-lg shadow-zinc-200">
                <div className="w-2 h-2 bg-white rounded-full animate-ping shrink-0"></div>
                <span className="text-[10px] font-black tracking-widest hidden sm:inline">計測中...</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 md:gap-3">
              <div className="hidden md:block text-[11px] font-black text-zinc-400 tracking-wider">
                {clockTime.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
              <div className="text-sm md:text-lg font-mono font-black text-zinc-800 tracking-tight tabular-nums">
                {clockTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
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
            onUpdateTask={updateTask}
            aiPersona={appSettings.ai_persona || 'polite'}
            autoMemo={appSettings.auto_memo !== false}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
