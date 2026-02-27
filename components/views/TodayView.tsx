
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Task, Project } from '../../types';
import GeminiSummary from '../GeminiSummary';
import { commonTaskSuggestions, TASK_CATEGORY_KEYWORDS, SOFTWARE_LAUNCHERS } from '../../constants';

// Extract categories and software from task title/details
const extractCategories = (title: string, details?: string) => {
  const text = `${title} ${details || ''}`;
  const matched: { name: string; color: string; icon: string }[] = [];
  for (const [name, cfg] of Object.entries(TASK_CATEGORY_KEYWORDS)) {
    if (cfg.keywords.some(kw => text.includes(kw))) {
      matched.push({ name, color: cfg.color, icon: cfg.icon });
    }
  }
  return matched;
};

const extractSoftware = (title: string, details?: string) => {
  const text = `${title} ${details || ''}`;
  const matched: { name: string; protocol: string; icon: string }[] = [];
  const seen = new Set<string>();
  for (const [keyword, cfg] of Object.entries(SOFTWARE_LAUNCHERS)) {
    if (text.includes(keyword) && !seen.has(cfg.name)) {
      seen.add(cfg.name);
      matched.push(cfg);
    }
  }
  return matched;
};

// --- Celebration system ---
const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '⭐', '🌟', '👏', '🙌', '💫'];
const CAT_EMOJIS = ['🐱', '😺', '😸', '😻', '🐈', '🐈‍⬛', '😽', '🐾'];
const PRAISE_MESSAGES = ['おつかれさま！', 'ナイス！', 'すごい！', 'よくやった！', '完了！', 'えらい！', 'バッチリ！'];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
  opacity: number;
}

const CelebrationOverlay: React.FC<{ trigger: number; completedCount: number }> = ({ trigger, completedCount }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bigCat, setBigCat] = useState<{ emoji: string; x: number } | null>(null);
  const [dolphin, setDolphin] = useState<{ phase: number } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (trigger === 0) return;

    // Confetti burst from multiple points
    const burst: Particle[] = Array.from({ length: 40 }, (_, i) => {
      const originX = 20 + Math.random() * 60;
      return {
        id: Date.now() + i,
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        x: originX,
        y: 40 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 18,
        vy: -(Math.random() * 10 + 6),
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 1.2,
        opacity: 1,
      };
    });

    // Cats raining from top
    const cats: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + 100 + i,
      emoji: CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)],
      x: Math.random() * 100,
      y: -(Math.random() * 30),
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1.5,
      rotation: (Math.random() - 0.5) * 40,
      scale: 1.5 + Math.random() * 2,
      opacity: 1,
    }));

    setParticles([...burst, ...cats]);
    setMessage(PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)]);

    // Big cat walks across
    const cat = CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)];
    setBigCat({ emoji: cat, x: -15 });

    // Dolphin on milestone completions (5, 10, 15, 20...)
    if (completedCount > 0 && completedCount % 5 === 0) {
      setDolphin({ phase: 0 });
    }

    const clearTimer = setTimeout(() => {
      setParticles([]);
      setBigCat(null);
      setDolphin(null);
      setMessage('');
    }, 3500);
    return () => clearTimeout(clearTimer);
  }, [trigger]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    let frame: number;
    const animate = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx * 0.3,
        y: p.y + p.vy * 0.3,
        vy: p.vy + 0.25,
        rotation: p.rotation + p.vx * 1.5,
        opacity: Math.max(0, p.opacity - 0.005),
      })).filter(p => p.y < 130 && p.opacity > 0));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [particles.length > 0]);

  // Animate big cat walking across
  useEffect(() => {
    if (!bigCat) return;
    let frame: number;
    const animate = () => {
      setBigCat(prev => {
        if (!prev || prev.x > 110) return null;
        return { ...prev, x: prev.x + 0.8 };
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [bigCat !== null]);

  // Animate dolphin jumping
  useEffect(() => {
    if (!dolphin) return;
    let frame: number;
    const animate = () => {
      setDolphin(prev => {
        if (!prev || prev.phase > 200) return null;
        return { phase: prev.phase + 1.5 };
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [dolphin !== null]);

  if (particles.length === 0 && !bigCat && !dolphin && !message) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti & cats */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            fontSize: `${1.2 * p.scale}rem`,
            opacity: p.opacity,
            willChange: 'transform',
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Big cat walking across bottom */}
      {bigCat && (
        <div
          className="absolute bottom-8"
          style={{
            left: `${bigCat.x}%`,
            fontSize: '5rem',
            transform: `scaleX(-1)`,
            transition: 'none',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          }}
        >
          {bigCat.emoji}
        </div>
      )}

      {/* Dolphin jumping in arc */}
      {dolphin && (() => {
        const t = dolphin.phase / 200;
        const x = 10 + t * 80;
        const y = 70 - Math.sin(t * Math.PI) * 55;
        const rot = -30 + t * 60;
        return (
          <div
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: '4rem',
              transform: `rotate(${rot}deg)`,
              transition: 'none',
              filter: 'drop-shadow(0 4px 16px rgba(59,130,246,0.3))',
            }}
          >
            🐬
          </div>
        );
      })()}

      {/* Praise message */}
      {message && (
        <div className="absolute inset-0 flex items-center justify-center animate-bounce">
          <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 drop-shadow-lg select-none"
            style={{ textShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  );
};

interface TodayViewProps {
  tasks: Task[];
  projects: Project[];
  onAddTask: (title: string, projectId: string, tags: string[], estimate: number, date: string, startTime?: string, isRoutine?: boolean, customerName?: string, projectName?: string, details?: string) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  activeTaskId: string | null;
  onToggleTimer: (id: string) => void;
  targetDate: string;
  setTargetDate: (date: string) => void;
}

const formatStopwatch = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TodayView: React.FC<TodayViewProps> = ({ 
  tasks, projects, onAddTask, onToggleTask, activeTaskId, onToggleTimer, targetDate, selectedTaskId, onSelectTask, onUpdateTask
}) => {
  const [inputValue, setInputValue] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [projectInput, setProjectInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showRoutines, setShowRoutines] = useState(true);
  const [celebrateTrigger, setCelebrateTrigger] = useState(0);

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);

  const completedCount = useMemo(() =>
    tasks.filter(t => t.date === targetDate && t.completed).length
  , [tasks, targetDate]);
  const isRainbow = completedCount >= 10;

  const handleToggleWithCelebration = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      setCelebrateTrigger(prev => prev + 1);
    }
    onToggleTask(id);
  }, [tasks, onToggleTask]);

  // 過去のルーティンタスクからユニークなテンプレートを生成
  const routineTemplates = useMemo(() => {
    const seen = new Set<string>();
    return tasks
      .filter(t => t.isRoutine)
      .filter(t => {
        const key = t.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
  }, [tasks]);

  const handleAddRoutine = (template: Task) => {
    const now = new Date();
    const startTime = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    onAddTask(
      template.title, template.projectId, template.tags, template.estimatedTime,
      targetDate, startTime, true, template.customerName, template.projectName, template.details
    );
  };

  const handleSaveAsRoutine = (taskId: string) => {
    onUpdateTask(taskId, { isRoutine: true });
  };

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return commonTaskSuggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()));
  }, [inputValue]);

  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => t.date === targetDate);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.customerName?.toLowerCase().includes(q) || 
        t.projectName?.toLowerCase().includes(q)
      );
    }
    return list.sort((a,b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
    });
  }, [tasks, targetDate, searchQuery]);

  const handleAddTask = () => {
    if (!inputValue.trim()) return;
    onAddTask(inputValue, 'p1', [], 3600, targetDate, undefined, false, customerInput, projectInput);
    setInputValue('');
    setCustomerInput('');
    setProjectInput('');
    setShowSuggestions(false);
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentStartTime = '';
    let currentEstimate = 3600;
    let currentTask: any = null;
    const tasksToAdd: any[] = [];

    for (const line of lines) {
      if (line.startsWith('■')) {
        const timeMatch = line.match(/(\d{1,2}:\d{2})\s*[-–~〜]\s*(\d{1,2}:\d{2})/);
        if (timeMatch) {
          currentStartTime = timeMatch[1];
          const [sh, sm] = currentStartTime.split(':').map(Number);
          const [eh, em] = timeMatch[2].split(':').map(Number);
          let duration = (eh * 60 + em) - (sh * 60 + sm);
          if (duration < 0) duration += 24 * 60;
          currentEstimate = duration * 60;
        }
      } else if (line.startsWith('・') || line.startsWith('-') || line.startsWith('•')) {
        if (currentTask) tasksToAdd.push(currentTask);
        let title = line.replace(/^[・\-•]\s*/, '').trim();
        let customerName = '';
        const customerMatch = title.match(/^(.+?)様/);
        if (customerMatch) {
          customerName = customerMatch[1];
        }
        currentTask = {
          title,
          customerName,
          startTime: currentStartTime,
          estimatedTime: currentEstimate,
          details: ''
        };
      } else if (line.startsWith('（') || line.startsWith('(')) {
        if (currentTask) {
          const detailLine = line.replace(/^[（(]/, '').replace(/[）)]$/, '').trim();
          currentTask.details = currentTask.details ? currentTask.details + '\n' + detailLine : detailLine;
        }
      } else {
        if (currentTask) {
          currentTask.details = currentTask.details ? currentTask.details + '\n' + line : line;
        }
      }
    }
    if (currentTask) tasksToAdd.push(currentTask);

    tasksToAdd.reverse().forEach(t => {
      onAddTask(
        t.title,
        'p1',
        [],
        t.estimatedTime,
        targetDate,
        t.startTime || undefined,
        false,
        t.customerName || undefined,
        undefined,
        t.details || undefined
      );
    });

    setBulkText('');
    setIsBulkMode(false);
  };

  // 必須フィールド=濃い青ボーダー、任意=薄い青ボーダー
  const requiredInputStyle = (val: string) =>
    `transition-all duration-300 border-2 ${val.trim() ? 'border-blue-600 bg-blue-50/10' : 'border-blue-400 bg-blue-50/5'} focus:ring-4 focus:ring-blue-200`;
  const optionalInputStyle = (val: string) =>
    `transition-all duration-300 border-2 ${val.trim() ? 'border-blue-400 bg-blue-50/10' : 'border-blue-200 bg-blue-50/5'} focus:ring-4 focus:ring-blue-100`;

  return (
    <div className="flex flex-col h-full bg-zinc-50/10 overflow-y-auto items-center py-8 px-4 pb-32">
      <CelebrationOverlay trigger={celebrateTrigger} completedCount={completedCount} />

      {isRainbow && (
        <style>{`
          @keyframes rainbow-border {
            0% { border-color: #ef4444; box-shadow: 0 0 12px #ef444466; }
            16% { border-color: #f97316; box-shadow: 0 0 12px #f9731666; }
            33% { border-color: #eab308; box-shadow: 0 0 12px #eab30866; }
            50% { border-color: #22c55e; box-shadow: 0 0 12px #22c55e66; }
            66% { border-color: #3b82f6; box-shadow: 0 0 12px #3b82f666; }
            83% { border-color: #a855f7; box-shadow: 0 0 12px #a855f766; }
            100% { border-color: #ef4444; box-shadow: 0 0 12px #ef444466; }
          }
          .rainbow-check { animation: rainbow-border 3s linear infinite; }
          @keyframes rainbow-bg {
            0% { background: linear-gradient(135deg, #ef4444, #f97316); }
            25% { background: linear-gradient(135deg, #eab308, #22c55e); }
            50% { background: linear-gradient(135deg, #3b82f6, #a855f7); }
            75% { background: linear-gradient(135deg, #ec4899, #ef4444); }
            100% { background: linear-gradient(135deg, #ef4444, #f97316); }
          }
          .rainbow-check-done { animation: rainbow-bg 3s linear infinite; border-color: transparent !important; }
        `}</style>
      )}

      {/* 実行中タイマー */}
      {activeTask && (
        <div className="w-full max-w-3xl mb-10">
          <div className="bg-zinc-900 rounded-3xl p-10 shadow-2xl border-4 border-zinc-800 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-3 h-full bg-zinc-800"></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <span className="text-[12px] font-black text-zinc-400 tracking-[0.2em] mb-3 block">現在計測中</span>
                <h3 className="text-3xl font-black">{activeTask.title}</h3>
                <p className="text-base text-zinc-400 mt-2 font-bold">{activeTask.customerName} @ {activeTask.projectName}</p>
              </div>
              <div className="text-right">
                <div className="text-6xl font-mono font-black tracking-tighter mb-6">{formatStopwatch(activeTask.timeSpent)}</div>
                <button 
                  onClick={() => onToggleTimer(activeTask.id)}
                  className="bg-zinc-900 hover:bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black text-base transition-all shadow-xl shadow-zinc-950/40 active:scale-95"
                >
                  計測ストップ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="w-full max-w-3xl mb-10">
        <div className="bg-white rounded-3xl shadow-xl border-2 border-zinc-50 overflow-hidden">
          <div className="p-8 space-y-6">
             <div className="flex justify-between items-center mb-2">
               <label className="text-[11px] font-black text-blue-500 tracking-widest">新しいタスクの追加 <span className="text-blue-600">*必須</span></label>
               <button 
                 onClick={() => setIsBulkMode(!isBulkMode)} 
                 className="text-[10px] font-black text-zinc-400 hover:text-zinc-800 transition-all"
               >
                 {isBulkMode ? '通常入力に戻す' : 'テキストから一括追加'}
               </button>
             </div>
             
             {isBulkMode ? (
               <div className="space-y-4">
                 <textarea
                   value={bulkText}
                   onChange={e => setBulkText(e.target.value)}
                   placeholder="■13:00–13:15\n・GSX様依頼連絡\n（ご依頼に対するメールの返信）"
                   className="w-full p-5 rounded-2xl outline-none text-sm font-black text-zinc-800 border-2 border-zinc-100 bg-zinc-50/5 focus:ring-4 focus:ring-zinc-200 min-h-[150px]"
                 />
               </div>
             ) : (
               <>
                 <div className="relative">
                   <input 
                     value={inputValue}
                     onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                     onFocus={() => setShowSuggestions(true)}
                     placeholder="例: ZENBI 4月号 進行管理・校正依頼" 
                     className={`w-full p-5 rounded-2xl outline-none text-xl font-black text-zinc-800 ${requiredInputStyle(inputValue)}`}
                   />
                   {showSuggestions && filteredSuggestions.length > 0 && (
                     <div className="absolute left-0 right-0 top-full mt-3 bg-white border-2 border-zinc-50 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                       {filteredSuggestions.map((s, i) => (
                         <button
                           key={i}
                           className="w-full text-left px-6 py-4 text-sm text-zinc-700 hover:bg-zinc-50 font-black border-b border-zinc-50 last:border-0 flex justify-between items-center"
                           onClick={() => { setInputValue(s); setShowSuggestions(false); }}
                         >
                           <span>{s}</span>
                           <span className="text-[10px] bg-zinc-100 text-zinc-900 px-3 py-1 rounded-full">AI予測</span>
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
                 <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="text-[11px] font-black text-blue-300 tracking-widest mb-2 block">顧客名 <span className="text-blue-200">任意</span></label>
                      <input 
                        value={customerInput} 
                        onChange={(e) => setCustomerInput(e.target.value)} 
                        placeholder="例: 全美" 
                        className={`w-full text-sm p-4 rounded-2xl outline-none font-black ${optionalInputStyle(customerInput)}`} 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-black text-blue-300 tracking-widest mb-2 block">案件名 <span className="text-blue-200">任意</span></label>
                      <input 
                        value={projectInput} 
                        onChange={(e) => setProjectInput(e.target.value)} 
                        placeholder="例: 4月号" 
                        className={`w-full text-sm p-4 rounded-2xl outline-none font-black ${optionalInputStyle(projectInput)}`} 
                      />
                    </div>
                 </div>
               </>
             )}
          </div>
          <div className="bg-zinc-50/30 px-8 py-5 flex items-center justify-between border-t-2 border-zinc-50">
             <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isBulkMode ? (bulkText ? 'bg-zinc-700 shadow-lg shadow-zinc-300' : 'bg-zinc-200 animate-pulse') : (inputValue ? 'bg-zinc-700 shadow-lg shadow-zinc-300' : 'bg-zinc-200 animate-pulse')}`}></div>
                <span className="text-[11px] text-zinc-400 font-black tracking-widest">
                  {isBulkMode ? (bulkText ? '一括追加できます' : 'テキストを入力してください') : (inputValue ? '登録できます' : 'タスク名を入力してください')}
                </span>
             </div>
             {isBulkMode ? (
               <button 
                 onClick={handleBulkSubmit} 
                 disabled={!bulkText.trim()}
                 className={`px-10 py-3.5 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 ${bulkText.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-900 shadow-zinc-200' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
               >
                 一括追加
               </button>
             ) : (
               <button 
                 onClick={handleAddTask} 
                 disabled={!inputValue.trim()}
                 className={`px-10 py-3.5 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 ${inputValue.trim() ? 'bg-zinc-800 text-white hover:bg-zinc-900 shadow-zinc-200' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
               >
                 タスクを追加
               </button>
             )}
          </div>
        </div>
      </div>

      {/* 定型タスク ワンタップ追加 */}
      {routineTemplates.length > 0 && (
        <div className="w-full max-w-3xl mb-8">
          <button
            onClick={() => setShowRoutines(!showRoutines)}
            className="flex items-center space-x-2 mb-4 px-3 group"
          >
            <svg className={`w-3 h-3 text-zinc-400 transition-transform ${showRoutines ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <span className="text-[11px] font-black text-zinc-400 tracking-widest group-hover:text-zinc-600 transition-colors">定型タスク</span>
            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-black">{routineTemplates.length}</span>
          </button>
          {showRoutines && (
            <div className="flex flex-wrap gap-2 px-3 animate-in fade-in slide-in-from-top-2">
              {routineTemplates.map(tmpl => {
                const alreadyAdded = filteredTasks.some(t => t.title === tmpl.title && !t.completed);
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => !alreadyAdded && handleAddRoutine(tmpl)}
                    disabled={alreadyAdded}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl border-2 text-[11px] font-black transition-all active:scale-95 ${
                      alreadyAdded
                        ? 'border-zinc-100 bg-zinc-50 text-zinc-300 cursor-default'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-md shadow-sm'
                    }`}
                  >
                    {alreadyAdded ? (
                      <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round"/></svg>
                    )}
                    <span>{tmpl.title}</span>
                    {tmpl.customerName && <span className="text-zinc-300">@{tmpl.customerName}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* タスクリスト */}
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between px-3 mb-6">
           <div className="flex items-center space-x-4">
             <h3 className="text-sm font-black text-zinc-800 tracking-[0.2em]">本日のタスク</h3>
             <span className="text-[11px] bg-zinc-100 text-zinc-900 px-3 py-1 rounded-full font-black">{filteredTasks.length}</span>
           </div>
           <div className="flex items-center space-x-3">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タスク、顧客、案件で検索..." 
                className="bg-white border-2 border-zinc-50 text-[11px] font-black px-5 py-2.5 rounded-full outline-none focus:ring-4 ring-zinc-800/10 w-56 transition-all"
              />
           </div>
        </div>

        {filteredTasks.length > 0 ? filteredTasks.map(task => {
          const isActive = activeTaskId === task.id;
          const isSelected = selectedTaskId === task.id;
          return (
            <div key={task.id} className={`bg-white rounded-3xl border-2 p-4 sm:p-6 flex flex-col transition-all ${
              task.completed 
                ? 'opacity-60 grayscale bg-zinc-50 border-zinc-100' 
                : isActive 
                  ? 'border-zinc-800 ring-4 ring-zinc-50 shadow-2xl scale-[1.02]' 
                  : 'border-zinc-200 hover:border-zinc-400 shadow-lg'
            }`}>
              <div className="flex items-center w-full">
                <button
                  onClick={() => handleToggleWithCelebration(task.id)}
                  className={`w-8 h-8 rounded-2xl border-4 flex items-center justify-center shrink-0 mr-4 sm:mr-6 transition-all ${
                    task.completed
                      ? `text-white shadow-lg ${isRainbow ? 'rainbow-check-done' : 'bg-zinc-800 border-zinc-800'}`
                      : `hover:border-zinc-800 ${isRainbow ? 'rainbow-check' : 'border-zinc-200'}`
                  }`}
                >
                  {task.completed && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
                </button>
                
                <div 
                  className="flex-1 min-w-0 cursor-pointer group"
                  onClick={() => onSelectTask(task.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                    {task.startTime && <span className="text-[10px] bg-zinc-800 text-white px-2 sm:px-3 py-1 rounded-full font-black tracking-tighter shadow-sm whitespace-nowrap">{task.startTime}</span>}
                    <span className={`text-base sm:text-lg font-black truncate group-hover:text-zinc-500 transition-colors ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{task.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-black text-zinc-400">
                    {task.customerName && <span className="text-zinc-400 tracking-tighter">@{task.customerName}</span>}
                    {task.projectName && <span className="text-zinc-200 hidden sm:inline">|</span>}
                    {task.projectName && <span className="tracking-tighter">{task.projectName}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {extractCategories(task.title, task.details).map(cat => (
                      <span key={cat.name} className="text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>
                        {cat.icon} {cat.name}
                      </span>
                    ))}
                    {extractSoftware(task.title, task.details).map(sw => (
                      <a
                        key={sw.name}
                        href={sw.protocol}
                        className="text-[9px] font-black px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
                        title={`${sw.name} を開く`}
                      >
                        {sw.icon} {sw.name}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 sm:space-x-8 ml-2 sm:ml-8 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className={`text-xl font-mono font-black ${isActive ? 'text-zinc-900' : 'text-zinc-600'}`}>{formatStopwatch(task.timeSpent)}</div>
                    <div className="text-[9px] text-zinc-400 font-black tracking-widest">実績時間</div>
                  </div>
                  {!task.completed && (
                    <button 
                      onClick={() => onToggleTimer(task.id)}
                      className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 ${isActive ? 'bg-white text-zinc-800 border-zinc-800 shadow-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900 shadow-zinc-200'}`}
                    >
                      {isActive ? (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* 展開される詳細エリア */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t-2 border-zinc-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-zinc-50/50 rounded-2xl p-4">
                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest mb-2">プロセス・詳細メモ</h4>
                    <textarea
                      value={task.details || ''}
                      onChange={(e) => onUpdateTask(task.id, { details: e.target.value })}
                      placeholder="タスクの詳細やプロセスを入力..."
                      className="w-full bg-white border-2 border-zinc-100 rounded-xl p-3 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-300 min-h-[80px] resize-y"
                    />
                    <div className="mt-3 flex justify-between items-center">
                       <div className="text-left sm:hidden">
                         <div className="text-[9px] text-zinc-400 font-black tracking-widest mb-1">実績時間</div>
                         <div className={`text-lg font-mono font-black ${isActive ? 'text-zinc-900' : 'text-zinc-600'}`}>{formatStopwatch(task.timeSpent)}</div>
                       </div>
                       {!task.isRoutine ? (
                         <button
                           onClick={() => handleSaveAsRoutine(task.id)}
                           className="text-[10px] font-black text-zinc-400 hover:text-zinc-700 transition-all flex items-center space-x-1 ml-auto"
                         >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                           <span>定型タスクとして保存</span>
                         </button>
                       ) : (
                         <span className="text-[10px] font-black text-zinc-300 flex items-center space-x-1 ml-auto">
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                           <span>定型タスク</span>
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
            <svg className="w-20 h-20 mb-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="1.5"/></svg>
            <p className="text-lg font-black text-zinc-300 tracking-[0.3em]">タスクが見つかりません</p>
          </div>
        )}
      </div>

      {/* カテゴリ分析 */}
      {filteredTasks.length > 0 && (() => {
        const catStats: Record<string, { count: number; time: number; color: string; icon: string }> = {};
        filteredTasks.forEach(t => {
          extractCategories(t.title, t.details).forEach(cat => {
            if (!catStats[cat.name]) catStats[cat.name] = { count: 0, time: 0, color: cat.color, icon: cat.icon };
            catStats[cat.name].count++;
            catStats[cat.name].time += t.timeSpent;
          });
        });
        const entries = Object.entries(catStats).sort((a, b) => b[1].count - a[1].count);
        if (entries.length === 0) return null;
        const totalTime = entries.reduce((s, [, v]) => s + v.time, 0);
        return (
          <div className="mt-10 w-full max-w-3xl">
            <h3 className="text-[11px] font-black text-zinc-400 tracking-widest mb-4 px-3">本日のカテゴリ分析</h3>
            <div className="bg-white rounded-2xl border-2 border-zinc-100 p-5 shadow-sm">
              <div className="flex flex-wrap gap-3 mb-4">
                {entries.map(([name, stat]) => (
                  <div key={name} className="flex items-center space-x-2 px-3 py-2 rounded-xl border" style={{ borderColor: stat.color + '40' }}>
                    <span className="text-lg">{stat.icon}</span>
                    <div>
                      <div className="text-[11px] font-black" style={{ color: stat.color }}>{name}</div>
                      <div className="text-[10px] text-zinc-400 font-bold">{stat.count}件 / {Math.floor(stat.time / 60)}分</div>
                    </div>
                  </div>
                ))}
              </div>
              {totalTime > 0 && (
                <div className="h-3 rounded-full overflow-hidden flex bg-zinc-100">
                  {entries.map(([name, stat]) => (
                    <div
                      key={name}
                      className="h-full transition-all"
                      style={{ width: `${(stat.time / totalTime) * 100}%`, backgroundColor: stat.color }}
                      title={`${name}: ${Math.floor(stat.time / 60)}分`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="mt-10 w-full max-w-2xl">
        <GeminiSummary tasks={tasks} targetDate={targetDate} />
      </div>
    </div>
  );
};

export default TodayView;
