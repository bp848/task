
import React from 'react';
import { Project, Task } from '../../types';

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  onToggleTask: (id: string) => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, tasks, onToggleTask }) => {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedCount = projectTasks.filter(t => t.completed).length;
  const totalCount = projectTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-8 h-full bg-zinc-50/10 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center space-x-4 mb-3">
            <div className={`w-4 h-4 rounded-full ${project.color} shadow-sm`}></div>
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">{project.name}</h2>
          </div>
          <p className="text-sm text-zinc-400 font-bold tracking-widest uppercase">このプロジェクトに紐づくタスクの進捗状況です</p>
        </header>

        <div className="bg-white border-2 border-zinc-50 rounded-3xl p-8 shadow-lg shadow-zinc-800/5 mb-10">
          <div className="flex justify-between items-end mb-5">
            <div>
              <span className="text-[11px] font-black text-zinc-300 tracking-widest uppercase">全体進捗率</span>
              <div className="text-4xl font-black text-zinc-800 mt-1">{Math.round(progress)}%</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-black text-zinc-300 tracking-widest uppercase">タスク完了数</span>
              <div className="text-lg font-black text-zinc-600 mt-1">{completedCount} <span className="text-sm font-bold opacity-40">/ {totalCount} 件</span></div>
            </div>
          </div>
          <div className="w-full bg-zinc-50 h-3 rounded-full overflow-hidden border border-zinc-100 shadow-inner">
            <div className={`h-full ${project.color} transition-all duration-1000 shadow-sm`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="space-y-3">
          {projectTasks.length > 0 ? (
            projectTasks.map(t => (
              <div key={t.id} className="bg-white border-2 border-zinc-50 rounded-2xl p-5 flex items-center justify-between hover:border-zinc-400 transition-all shadow-sm group">
                <div className="flex items-center space-x-5">
                  <button onClick={() => onToggleTask(t.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${t.completed ? 'bg-zinc-700 border-zinc-700 text-white' : 'border-zinc-100 hover:border-zinc-400'}`}>
                    {t.completed && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
                  </button>
                  <span className={`text-base font-black ${t.completed ? 'line-through text-zinc-300' : 'text-zinc-700'}`}>{t.title}</span>
                </div>
                {t.customerName && <span className="text-[10px] font-black text-zinc-400 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100 uppercase tracking-tighter">@{t.customerName}</span>}
              </div>
            ))
          ) : (
            <div className="text-center py-24 bg-zinc-50/20 border-4 border-dashed border-zinc-100 rounded-[3rem] text-zinc-200 text-sm font-black tracking-widest uppercase opacity-40">
              タスクが登録されていません
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;
