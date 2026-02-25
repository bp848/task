
import React, { useState, useEffect } from 'react';
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
import { initialTasks, initialProjects, mockEmails } from './constants';
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [projects] = useState<Project[]>(initialProjects);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  const [user] = useState({
    name: '三神 杏友',
    role: 'CSG 第一制作部',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80'
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('tasks').select('*').limit(1);
        if (error) {
          console.warn('Supabase connection test (table might not exist yet):', error.message);
        } else {
          console.log('Supabase connected successfully!');
        }
      } catch (err) {
        console.error('Supabase connection error:', err);
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    let interval: number;
    if (activeTaskId) {
      interval = window.setInterval(() => {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === activeTaskId 
              ? { ...task, timeSpent: task.timeSpent + 1 } 
              : task
          )
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleViewChange = (view: ViewType, projectId?: string) => {
    setCurrentView(view);
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
  };

  const addTask = (
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
    setTasks(prev => [newTask, ...prev]);
  };

  const convertEmailToTask = (email: Email) => {
    addTask(email.subject, 'p3', ['Gmail', 'MCP'], 1800, targetDate, undefined, false, email.customerName, email.projectName);
    setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
  };

  const toggleTask = (id: string) => {
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isCompleting = !t.completed;
        const endTimeStr = isCompleting ? new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : undefined;
        return { 
          ...t, 
          completed: isCompleting, 
          completedAt: isCompleting ? now : undefined,
          endTime: endTimeStr || t.endTime
        };
      }
      return t;
    }));
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
            onAddTask={addTask} 
            onToggleTask={toggleTask} 
            onUpdateTask={(id, updates) => setTasks(tasks.map(t => t.id === id ? {...t, ...updates} : t))}
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
        return <PlannerView tasks={tasks} onAddTask={addTask} />;
      case 'schedule':
        return <ScheduleView tasks={tasks} targetDate={targetDate} />;
      case 'project-detail':
        const project = projects.find(p => p.id === selectedProjectId);
        return project ? <ProjectDetailView project={project} tasks={tasks} onToggleTask={toggleTask} /> : null;
      case 'metrics':
        return <MetricsView tasks={tasks} />;
      case 'habits':
        return <HabitsView />;
      case 'settings':
        return <SettingsView />;
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
             <div className="text-[11px] font-black text-zinc-200 tracking-widest uppercase">ZenWork Mini v1.6.0</div>
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
