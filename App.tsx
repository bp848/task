
import React, { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@supabase/supabase-js';
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

// supabase.auth の型定義が TS 解決バグで欠落するため any で回避
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAuth = supabase.auth as any;

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

// Supabase の zenwork_tasks レコードを Task 型に変換
const dbRowToTask = (row: Record<string, unknown>): Task => ({
  id: row.id as string,
  title: row.title as string,
  customerName: (row.customer_name as string) || undefined,
  projectName: (row.project_name as string) || undefined,
  details: (row.details as string) || undefined,
  completed: row.completed as boolean,
  timeSpent: (row.time_spent as number) || 0,
  estimatedTime: (row.estimated_time as number) || 3600,
  startTime: (row.start_time as string) || undefined,
  endTime: (row.end_time as string) || undefined,
  tags: (row.tags as string[]) || [],
  projectId: (row.project_id as string) || 'p1',
  date: row.date as string,
  createdAt: row.created_at as string,
  completedAt: (row.completed_at as string) || undefined,
  isRoutine: (row.is_routine as boolean) || false,
  sourceEmailId: (row.source_email_id as string) || undefined,
});

// Task 型を Supabase へ INSERT する形式に変換
const taskToDbRow = (task: Task) => ({
  id: task.id,
  title: task.title,
  customer_name: task.customerName || null,
  project_name: task.projectName || null,
  details: task.details || null,
  completed: task.completed,
  time_spent: task.timeSpent,
  estimated_time: task.estimatedTime,
  start_time: task.startTime || null,
  end_time: task.endTime || null,
  tags: task.tags,
  project_id: task.projectId,
  date: task.date,
  completed_at: task.completedAt || null,
  is_routine: task.isRoutine || false,
  source_email_id: task.sourceEmailId || null,
});

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [projects] = useState<Project[]>(initialProjects);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [user, setUser] = useState({
    name: '',
    role: '',
    avatar: '',
  });
  const [erpCustomers, setErpCustomers] = useState<string[]>([]);
  const [erpProjects, setErpProjects] = useState<Array<{ name: string; customerName: string }>>([]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // ── Supabase Auth 状態監視 ──
  useEffect(() => {
    supabaseAuth.getSession().then(({ data: { session } }: { data: { session: { user: AuthUser; provider_token?: string } | null } }) => {
      setAuthUser(session?.user ?? null);
      setGmailToken(session?.provider_token ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabaseAuth.onAuthStateChange((_event: unknown, session: { user: AuthUser; provider_token?: string } | null) => {
      setAuthUser(session?.user ?? null);
      setGmailToken(session?.provider_token ?? null);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── bp-erp マスタデータ取得（ユーザー・顧客・案件） ──
  useEffect(() => {
    if (!authUser) return;
    const fetchErpMasterData = async () => {
      // 認証ユーザーからユーザー情報を取得
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('name, departments(name)')
          .eq('auth_user_id', authUser.id)
          .single();
        if (userData) {
          setUser({
            name: (userData.name as string) || authUser.email || '',
            role: ((userData.departments as unknown as { name: string } | null)?.name) || '',
            avatar: authUser.user_metadata?.avatar_url || '',
          });
        } else {
          // usersテーブルに未登録の場合はGoogle情報を使用
          setUser({
            name: authUser.user_metadata?.full_name || authUser.email || '',
            role: '',
            avatar: authUser.user_metadata?.avatar_url || '',
          });
        }
      } catch (_) {
        setUser({
          name: authUser.user_metadata?.full_name || authUser.email || '',
          role: '',
          avatar: authUser.user_metadata?.avatar_url || '',
        });
      }

      // 顧客マスタ取得
      const { data: customers } = await supabase
        .from('customers')
        .select('customer_name')
        .order('customer_name');
      if (customers) {
        setErpCustomers(customers.map(c => c.customer_name).filter(Boolean) as string[]);
      }

      // 案件マスタ取得（顧客名付き）
      const { data: proj } = await supabase
        .from('projects_v2')
        .select('project_name, customers(customer_name)')
        .order('project_name');
      if (proj) {
        setErpProjects(
          proj
            .filter(p => p.project_name)
            .map(p => ({
              name: p.project_name as string,
              customerName: ((p.customers as unknown as { customer_name: string } | null)?.customer_name) || '',
            }))
        );
      }
    };
    fetchErpMasterData();
  }, [authUser]);

  // ── 初回ロード: Supabase から全タスクを取得 ──
  useEffect(() => {
    if (!authUser) return;
    const loadTasks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('zenwork_tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase load error:', error.message);
          // フォールバック: ローカル状態のみで動作
        } else if (data) {
          const loaded = data.map(dbRowToTask);
          setTasks(loaded);
          console.log(`✅ bp-erp から ${loaded.length} 件のタスクを読み込みました`);
        }
      } catch (err) {
        console.error('Supabase connection error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, [authUser]);

  // ── Gmail Edge Function 経由でメール取得 ──
  useEffect(() => {
    if (!gmailToken) return;
    const fetchGmailEmails = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('gmail-fetch', {
          body: { googleToken: gmailToken },
        });
        if (error) { console.warn('gmail-fetch error:', error); return; }

        const rawEmails: Array<{ id: string; sender: string; subject: string; snippet: string; date: string; isRead: boolean }> = data?.emails ?? [];
        if (!rawEmails.length) { setEmails([]); return; }

        // ERPマスタとのマッチング（クライアント側で処理）
        const matched: Email[] = rawEmails.map(email => {
          let customerName: string | undefined;
          let projectName: string | undefined;
          for (const c of erpCustomers) {
            if (email.sender.includes(c) || email.subject.includes(c)) { customerName = c; break; }
          }
          for (const p of erpProjects) {
            if (email.subject.includes(p.name)) {
              projectName = p.name;
              if (!customerName) customerName = p.customerName || undefined;
              break;
            }
          }
          return { ...email, customerName, projectName };
        });

        setEmails(matched);
        console.log(`✅ Gmail から ${matched.length} 件取得`);
      } catch (err) {
        console.error('Gmail fetch error:', err);
      }
    };
    fetchGmailEmails();
  }, [gmailToken, erpCustomers, erpProjects]);

  // ── タイマー: アクティブタスクの timeSpent を 1秒ごとに加算 ──
  useEffect(() => {
    let interval: number;
    if (activeTaskId) {
      interval = window.setInterval(() => {
        setTasks(prev =>
          prev.map(task =>
            task.id === activeTaskId
              ? { ...task, timeSpent: task.timeSpent + 1 }
              : task
          )
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  // ── タイマー停止時に time_spent をDBへ保存 ──
  const saveTimeSpent = useCallback(async (taskId: string, timeSpent: number) => {
    await supabase
      .from('zenwork_tasks')
      .update({ time_spent: timeSpent })
      .eq('id', taskId);
  }, []);

  const handleViewChange = (view: ViewType, projectId?: string) => {
    setCurrentView(view);
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
  };

  // ── タスク追加（Supabase に INSERT） ──
  const addTask = async (
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
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      customerName,
      projectName,
      details,
      completed: false,
      timeSpent: 0,
      estimatedTime,
      startTime: explicitStartTime || new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      tags,
      projectId,
      date,
      createdAt: new Date().toISOString(),
      isRoutine
    };

    // 楽観的更新
    setTasks(prev => [newTask, ...prev]);

    // Supabase へ保存
    const { error } = await supabase
      .from('zenwork_tasks')
      .insert(taskToDbRow(newTask));

    if (error) {
      console.error('タスク保存エラー:', error.message);
    }
  };

  // ── メールをタスクに変換 ──
  const convertEmailToTask = (email: Email) => {
    addTask(email.subject, 'p3', ['Gmail', 'MCP'], 1800, targetDate, undefined, false, email.customerName, email.projectName);
    setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
  };

  // ── タスク完了/未完了トグル（Supabase に UPDATE） ──
  const toggleTask = async (id: string) => {
    const now = new Date().toISOString();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isCompleting = !task.completed;
    const endTimeStr = isCompleting
      ? new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : undefined;

    const updates = {
      completed: isCompleting,
      completed_at: isCompleting ? now : null,
      end_time: endTimeStr || task.endTime || null,
    };

    // 楽観的更新
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, completed: isCompleting, completedAt: isCompleting ? now : undefined, endTime: endTimeStr || t.endTime }
        : t
    ));

    // Supabase へ保存
    const { error } = await supabase
      .from('zenwork_tasks')
      .update(updates)
      .eq('id', id);

    if (error) console.error('タスク更新エラー:', error.message);
    if (activeTaskId === id) setActiveTaskId(null);
  };

  // ── タスク更新（Supabase に UPDATE） ──
  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName;
    if (updates.details !== undefined) dbUpdates.details = updates.details;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;
    if (updates.estimatedTime !== undefined) dbUpdates.estimated_time = updates.estimatedTime;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.date !== undefined) dbUpdates.date = updates.date;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('zenwork_tasks')
        .update(dbUpdates)
        .eq('id', id);
      if (error) console.error('タスク更新エラー:', error.message);
    }
  };

  // ── タイマートグル ──
  const toggleTimer = async (id: string) => {
    if (activeTaskId === id) {
      // タイマー停止 → time_spent を保存
      const task = tasks.find(t => t.id === id);
      if (task) await saveTimeSpent(id, task.timeSpent);
      setActiveTaskId(null);
    } else {
      setActiveTaskId(id);
      setSelectedTaskId(id);
    }
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-black tracking-widest">bp-erpに接続中...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'today':
        return (
          <TodayView
            tasks={tasks}
            projects={projects}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onUpdateTask={updateTask}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            activeTaskId={activeTaskId}
            onToggleTimer={toggleTimer}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            onAddRoutines={() => { }}
            erpCustomers={erpCustomers}
            erpProjects={erpProjects}
          />
        );
      case 'inbox':
        return <InboxView tasks={tasks} emails={emails} onConvertToTask={convertEmailToTask} />;
      case 'planner':
        return <PlannerView tasks={tasks} onAddTask={addTask} />;
      case 'schedule':
        return <ScheduleView tasks={tasks} targetDate={targetDate} />;
      case 'project-detail':
        const project = projects.find(p => p.id === selectedProjectId);
        return project ? <ProjectDetailView project={project} tasks={tasks} onToggleTask={toggleTask} /> : null;
      case 'metrics':
        return <MetricsView tasks={tasks} userName={user.name} />;
      case 'habits':
        return <HabitsView userId={authUser.id} />;
      case 'settings':
        return <SettingsView userId={authUser.id} />;
      default:
        return null;
    }
  };

  // ── 認証チェック中 ──
  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-black tracking-widest text-zinc-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ── 未ログイン → Googleログイン画面 ──
  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-zinc-100 p-14 flex flex-col items-center w-full max-w-sm">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-1">ZenWork</h1>
          <p className="text-xs font-bold text-zinc-400 tracking-widest mb-10">bp-erp タスク管理</p>
          <button
            onClick={() => supabaseAuth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: window.location.origin,
                scopes: 'https://www.googleapis.com/auth/gmail.readonly',
              }
            })}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-zinc-200 hover:border-zinc-400 text-zinc-800 font-black py-4 px-6 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </button>
          <p className="text-[10px] text-zinc-300 font-bold mt-6 tracking-widest text-center">
            bp社のGoogleアカウントでログインしてください
          </p>
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
        onLogout={() => supabaseAuth.signOut()}
        projects={projects}
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
            {activeTaskId && (
              <div className="flex items-center space-x-3 bg-zinc-800 text-white px-4 py-1.5 rounded-full shadow-lg shadow-zinc-200">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                <span className="text-[11px] font-black tracking-widest">時間計測中...</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div className="text-[11px] font-black text-zinc-300 tracking-widest uppercase">bp-erp 接続済</div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto custom-scrollbar flex">
          <div className="flex-1">
            {renderView()}
          </div>
          <AiWorkHub
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
