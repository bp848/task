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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [projects] = useState<Project[]>(initialProjects);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [showGoogleLoginMock, setShowGoogleLoginMock] = useState(false);

  const [user] = useState({
    name: '三神 杏友',
    role: 'CSG 第一制作部',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80'
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        setIsGoogleConnected(data.authenticated);
        if (data.authenticated) {
          fetchGoogleData();
        }
      } catch (err) {
        console.error('Failed to check auth status', err);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
        fetchGoogleData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchGoogleData = async () => {
    // Mockup data for Google Workspace integration
    setEmails([
      {
        id: 'mock_g1',
        sender: 'Google Calendar <calendar@google.com>',
        subject: '【予定】デザイン定例MTG',
        snippet: '本日のデザイン定例MTGのアジェンダです。',
        date: '09:00',
        isRead: false,
        customerName: '社内',
        projectName: 'MTG'
      },
      {
        id: 'mock_g2',
        sender: 'Google Drive <drive-shares-noreply@google.com>',
        subject: '「Q3_マーケティング資料.pdf」が共有されました',
        snippet: '鈴木さんがあなたとファイルを共有しました。',
        date: '11:30',
        isRead: false,
        customerName: '鈴木',
        projectName: '資料確認'
      }
    ]);

    setTasks(prev => {
      const mockTasks: Task[] = [
        {
          id: 'mock_t1',
          title: 'デザイン定例MTG',
          customerName: '社内',
          projectName: 'MTG',
          completed: false,
          timeSpent: 0,
          estimatedTime: 3600,
          startTime: '13:00',
          tags: ['Google Calendar'],
          projectId: 'p2',
          date: targetDate,
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock_t2',
          title: 'Q3_マーケティング資料の確認',
          customerName: '鈴木',
          projectName: '資料確認',
          completed: false,
          timeSpent: 0,
          estimatedTime: 1800,
          startTime: '15:00',
          tags: ['Google Drive'],
          projectId: 'p1',
          date: targetDate,
          createdAt: new Date().toISOString()
        }
      ];
      
      const newTasks = [...prev];
      mockTasks.forEach(mt => {
        if (!newTasks.find(t => t.id === mt.id)) {
          newTasks.push(mt);
        }
      });
      return newTasks;
    });
  };

  const handleConnectGoogle = () => {
    setShowGoogleLoginMock(true);
  };

  const handleMockLoginSuccess = () => {
    setShowGoogleLoginMock(false);
    setIsGoogleConnected(true);
    fetchGoogleData();
  };

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
             {!isGoogleConnected && (
               <button 
                 onClick={handleConnectGoogle}
                 className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-md hover:bg-blue-700 transition-all text-[11px] font-black tracking-widest"
               >
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                 </svg>
                 <span>Google連携</span>
               </button>
             )}
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
