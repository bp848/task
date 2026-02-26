
import React, { useState, useEffect, useCallback } from 'react';
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
const taskToDbRow = (task: Task, userId: string) => ({
  id: task.id,
  user_id: userId,
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

// URLパラメータからユーザー情報を取得
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    userId: params.get('userId') || params.get('user_id') || 'anonymous',
    userName: params.get('userName') || params.get('user_name') || '',
    userRole: params.get('userRole') || params.get('role') || '',
    userAvatar: params.get('avatar') || '',
  };
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails] = useState<Email[]>([]);
  const [projects] = useState<Project[]>(initialProjects);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  // URLパラメータからユーザー情報を取得
  const urlParams = getUrlParams();
  const userId = urlParams.userId;
  const [user, setUser] = useState({
    name: urlParams.userName,
    role: urlParams.userRole,
    avatar: urlParams.userAvatar,
  });

  const [erpCustomers, setErpCustomers] = useState<string[]>([]);
  const [erpProjects, setErpProjects] = useState<Array<{ name: string; customerName: string }>>([]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // ── bp-erp マスタデータ取得（ユーザー・顧客・案件） ──
  useEffect(() => {
    const fetchErpMasterData = async () => {
      // ユーザー情報（URLパラメータにない場合のみDBから取得）
      if (!user.name) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('name, departments(name)')
            .eq('id', userId)
            .single();
          if (userData) {
            setUser(prev => ({
              ...prev,
              name: (userData.name as string) || userId,
              role: ((userData.departments as unknown as { name: string } | null)?.name) || '',
            }));
          }
        } catch (_) {
          // ユーザーが見つからない場合はURLパラメータの値をそのまま使用
        }
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
  }, [userId]);

  // ── 初回ロード: Supabase から自分のタスクを取得 ──
  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('zenwork_tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase load error:', error.message);
        } else if (data) {
          setTasks(data.map(dbRowToTask));
          console.log(`✅ ${data.length} 件のタスクを読み込みました`);
        }
      } catch (err) {
        console.error('Supabase connection error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, [userId]);

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
      id: crypto.randomUUID(),
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

    setTasks(prev => [newTask, ...prev]);

    const { error } = await supabase
      .from('zenwork_tasks')
      .insert(taskToDbRow(newTask, userId));

    if (error) {
      console.error('タスク保存エラー:', error.message);
    }
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

    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, completed: isCompleting, completedAt: isCompleting ? now : undefined, endTime: endTimeStr || t.endTime }
        : t
    ));

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
            <p className="text-xs font-black tracking-widest">読み込み中...</p>
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
        return <InboxView tasks={tasks} emails={emails} onConvertToTask={() => {}} />;
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
        return <HabitsView userId={userId} />;
      case 'settings':
        return <SettingsView userId={userId} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50/20 text-zinc-900 font-sans">
      <Sidebar
        currentView={currentView}
        selectedProjectId={selectedProjectId}
        onViewChange={handleViewChange}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogout={() => {}}
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
              <div className="text-[11px] font-black text-zinc-300 tracking-widest uppercase">接続済</div>
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
