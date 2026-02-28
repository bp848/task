
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Task, Project } from '../../types';
import GeminiSummary from '../GeminiSummary';
import { commonTaskSuggestions, extractCategories, extractSoftware, extractActionShortcuts } from '../../constants';

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
  customerSuggestions?: string[];
  emailFormat?: { recipient?: string; senderName?: string; senderCompany?: string; signature?: string };
}

const formatStopwatch = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TodayView: React.FC<TodayViewProps> = ({
  tasks, projects, onAddTask, onToggleTask, activeTaskId, onToggleTimer, targetDate, selectedTaskId, onSelectTask, onUpdateTask, customerSuggestions = [], emailFormat
}) => {
  const [inputValue, setInputValue] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [projectInput, setProjectInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showRoutines, setShowRoutines] = useState(true);
  const [celebrateTrigger, setCelebrateTrigger] = useState(0);
  const [routineFreqPicker, setRoutineFreqPicker] = useState<string | null>(null);

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

  const handleSaveAsRoutine = (taskId: string, frequency?: string) => {
    const tags = frequency ? [frequency] : [];
    onUpdateTask(taskId, { isRoutine: true, tags });
    setRoutineFreqPicker(null);
  };

  // 過去のタスク名からユニーク候補を生成
  const pastTaskTitles = useMemo(() => {
    const seen = new Set<string>();
    return tasks
      .map(t => t.title)
      .filter(title => {
        const key = title.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  }, [tasks]);

  // 入力候補: isRoutineタスクを優先表示（全フィールド補完）、次に過去タイトル
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [] as { title: string; isRoutineMatch: boolean; task?: Task }[];
    const q = inputValue.toLowerCase();
    const result: { title: string; isRoutineMatch: boolean; task?: Task }[] = [];
    const seen = new Set<string>();

    // 1. 入力候補登録済み（isRoutine）タスクを最優先: タイトル・詳細・顧客名で部分一致
    routineTemplates.forEach(t => {
      const matchText = `${t.title} ${t.details || ''} ${t.customerName || ''}`.toLowerCase();
      if (matchText.includes(q) && !seen.has(t.title.toLowerCase())) {
        seen.add(t.title.toLowerCase());
        result.push({ title: t.title, isRoutineMatch: true, task: t });
      }
    });

    // 2. 過去タイトル
    pastTaskTitles.forEach(title => {
      if (title.toLowerCase().includes(q) && !seen.has(title.toLowerCase())) {
        seen.add(title.toLowerCase());
        result.push({ title, isRoutineMatch: false });
      }
    });

    // 3. 静的候補
    commonTaskSuggestions.forEach(s => {
      if (s.toLowerCase().includes(q) && !seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase());
        result.push({ title: s, isRoutineMatch: false });
      }
    });

    return result.slice(0, 12);
  }, [inputValue, pastTaskTitles, routineTemplates]);

  // 顧客名フィルタリング
  const filteredCustomers = useMemo(() => {
    if (!customerInput.trim()) return customerSuggestions.slice(0, 10);
    const q = customerInput.toLowerCase();
    return customerSuggestions.filter(c => c.toLowerCase().includes(q)).slice(0, 10);
  }, [customerInput, customerSuggestions]);

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
                  className="bg-white text-zinc-900 hover:bg-red-600 hover:text-white px-10 py-4 rounded-2xl font-black text-base transition-all shadow-xl active:scale-95 cursor-pointer border-2 border-zinc-700 hover:border-red-600"
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
                 className="text-[10px] font-black text-zinc-600 bg-zinc-100 hover:bg-zinc-800 hover:text-white px-3 py-1.5 rounded-full transition-all cursor-pointer border border-zinc-200 hover:border-zinc-800"
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
                     <div className="absolute left-0 right-0 top-full mt-3 bg-white border-2 border-zinc-100 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                       {filteredSuggestions.map((s, i) => (
                         <button
                           key={i}
                           className={`w-full text-left px-5 py-3 hover:bg-zinc-800 hover:text-white border-b border-zinc-50 last:border-0 transition-all cursor-pointer ${
                             s.isRoutineMatch ? 'bg-blue-50/50' : ''
                           }`}
                           onClick={() => {
                             setInputValue(s.title);
                             if (s.isRoutineMatch && s.task) {
                               // 入力候補: 全フィールドを補完
                               setCustomerInput(s.task.customerName || '');
                               setProjectInput(s.task.projectName || '');
                             }
                             setShowSuggestions(false);
                           }}
                         >
                           <div className="flex justify-between items-center">
                             <span className="text-sm font-black truncate mr-3">{s.title}</span>
                             <span className={`text-[9px] px-2.5 py-1 rounded-full shrink-0 font-black ${
                               s.isRoutineMatch ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-500'
                             }`}>
                               {s.isRoutineMatch ? '入力候補' : '過去入力'}
                             </span>
                           </div>
                           {s.isRoutineMatch && s.task && (
                             <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-zinc-400">
                               {s.task.customerName && <span>@{s.task.customerName}</span>}
                               {s.task.details && <span className="truncate max-w-[200px]">| {s.task.details}</span>}
                             </div>
                           )}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
                 <div className="flex space-x-4">
                    <div className="flex-1 relative">
                      <label className="text-[11px] font-black text-blue-300 tracking-widest mb-2 block">顧客名 <span className="text-blue-200">任意</span></label>
                      <input
                        value={customerInput}
                        onChange={(e) => { setCustomerInput(e.target.value); setShowCustomerSuggestions(true); }}
                        onFocus={() => setShowCustomerSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                        placeholder="例: 全美"
                        className={`w-full text-sm p-4 rounded-2xl outline-none font-black ${optionalInputStyle(customerInput)}`}
                      />
                      {showCustomerSuggestions && filteredCustomers.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-zinc-100 rounded-2xl shadow-2xl z-50 py-2 max-h-[200px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          {filteredCustomers.map((c, i) => (
                            <button
                              key={i}
                              className="w-full text-left px-5 py-2.5 text-xs text-zinc-700 hover:bg-blue-50 font-black flex justify-between items-center"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setCustomerInput(c); setShowCustomerSuggestions(false); }}
                            >
                              <span className="truncate">{c}</span>
                              <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full shrink-0 ml-2">顧客DB</span>
                            </button>
                          ))}
                        </div>
                      )}
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
                 className={`px-10 py-3.5 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 cursor-pointer ${bulkText.trim() ? 'bg-zinc-800 text-white hover:bg-blue-600 shadow-zinc-200' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
               >
                 一括追加
               </button>
             ) : (
               <button 
                 onClick={handleAddTask} 
                 disabled={!inputValue.trim()}
                 className={`px-10 py-3.5 rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95 cursor-pointer ${inputValue.trim() ? 'bg-zinc-800 text-white hover:bg-blue-600 shadow-zinc-200' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
               >
                 タスクを追加
               </button>
             )}
          </div>
        </div>
      </div>

      {/* 入力候補（ワンタップ追加） */}
      {routineTemplates.length > 0 && (
        <div className="w-full max-w-3xl mb-8">
          <button
            onClick={() => setShowRoutines(!showRoutines)}
            className="flex items-center space-x-2 mb-4 px-3 group"
          >
            <svg className={`w-3 h-3 text-blue-500 transition-transform ${showRoutines ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <span className="text-[11px] font-black text-blue-600 tracking-widest group-hover:text-blue-800 transition-colors">入力候補（ワンタップ追加）</span>
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black">{routineTemplates.length}</span>
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
                        ? 'border-green-200 bg-green-50 text-green-400 cursor-default'
                        : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md shadow-sm cursor-pointer'
                    }`}
                  >
                    {alreadyAdded ? (
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round"/></svg>
                    )}
                    <span>{tmpl.title}</span>
                    {tmpl.tags.includes('daily') && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">毎日</span>}
                    {tmpl.tags.includes('weekly') && <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">毎週</span>}
                    {tmpl.tags.includes('monthly') && <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">毎月</span>}
                    {tmpl.customerName && <span className="text-zinc-400">@{tmpl.customerName}</span>}
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
             <h3 className="text-sm font-black text-slate-800 tracking-[0.2em]">本日のタスク</h3>
             <span className="text-[11px] bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-black">{filteredTasks.length}</span>
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
            <div key={task.id} className={`rounded-2xl border p-4 sm:p-6 flex flex-col transition-all ${
              task.completed
                ? 'opacity-50 bg-slate-50 border-slate-200'
                : isActive
                  ? 'bg-white border-indigo-600 ring-4 ring-indigo-100 shadow-2xl scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-lg'
            }`}>
              <div className="flex items-center w-full">
                <button
                  onClick={() => handleToggleWithCelebration(task.id)}
                  className={`w-8 h-8 rounded-xl border-[3px] flex items-center justify-center shrink-0 mr-4 sm:mr-6 transition-all cursor-pointer ${
                    task.completed
                      ? `text-white shadow-lg ${isRainbow ? 'rainbow-check-done' : 'bg-indigo-700 border-indigo-700'}`
                      : `hover:border-indigo-500 hover:bg-indigo-50 hover:scale-110 ${isRainbow ? 'rainbow-check' : 'border-slate-300'}`
                  }`}
                >
                  {task.completed && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
                </button>
                
                <div
                  className="flex-1 min-w-0 cursor-pointer group hover:bg-slate-50 rounded-xl px-2 py-1 -mx-2 -my-1 transition-all"
                  onClick={() => onSelectTask(task.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                    {task.startTime && <span className="text-[10px] bg-indigo-900 text-white px-2 sm:px-3 py-1 rounded-full font-black tracking-tighter shadow-sm whitespace-nowrap">{task.startTime}</span>}
                    <span className={`text-base sm:text-lg font-black truncate group-hover:text-indigo-700 transition-colors ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-black text-slate-400">
                    {task.customerName && <span className="text-slate-500 tracking-tighter">@{task.customerName}</span>}
                    {task.projectName && <span className="text-slate-300 hidden sm:inline">|</span>}
                    {task.projectName && <span className="text-slate-400 tracking-tighter">{task.projectName}</span>}
                    {task.assignees && task.assignees.length > 0 && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">|</span>
                        {task.assignees.map(a => (
                          <span key={a} className="text-indigo-600 tracking-tighter">@{a}</span>
                        ))}
                      </>
                    )}
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
                        className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-800 hover:text-white transition-all cursor-pointer"
                        title={`${sw.name} を開く`}
                      >
                        {sw.icon} {sw.name}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 sm:space-x-8 ml-2 sm:ml-8 shrink-0">
                  <div className="text-right hidden sm:block">
                    {(task.timerStartedAt || task.timerStoppedAt) && (
                      <div className="text-[11px] font-mono font-black text-indigo-700 mb-0.5 flex items-center justify-end gap-1">
                        {task.timerStartedAt && <span>{task.timerStartedAt}</span>}
                        <span className="text-slate-300">→</span>
                        {task.timerStoppedAt ? <span>{task.timerStoppedAt}</span> : isActive ? <span className="text-indigo-500 animate-pulse">計測中</span> : <span className="text-slate-300">--:--</span>}
                      </div>
                    )}
                    <div className={`text-xl font-mono font-black ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{formatStopwatch(task.timeSpent)}</div>
                    <div className="text-[9px] text-slate-400 font-black tracking-widest">実績時間</div>
                  </div>
                  {!task.completed && (
                    <button 
                      onClick={() => onToggleTimer(task.id)}
                      className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 border cursor-pointer ${isActive ? 'bg-white text-indigo-800 border-indigo-600 shadow-indigo-100 hover:bg-indigo-50' : 'bg-indigo-800 text-white hover:bg-indigo-700 border-indigo-800 shadow-slate-200'}`}
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
                <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    {/* 担当者・登場人物 */}
                    <div className="mb-3">
                      <h4 className="text-[10px] font-black text-indigo-700 tracking-widest mb-1.5">担当者・登場人物</h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(task.assignees || []).map(a => (
                          <span key={a} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-lg">
                            @{a}
                            <button
                              onClick={() => onUpdateTask(task.id, { assignees: (task.assignees || []).filter(x => x !== a) })}
                              className="text-indigo-400 hover:text-red-500 ml-0.5 cursor-pointer"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </span>
                        ))}
                        <input
                          placeholder="@名前を追加..."
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 w-28 placeholder:text-slate-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.replace(/^@/, '').trim();
                              if (val) {
                                const current = task.assignees || [];
                                if (!current.includes(val)) {
                                  onUpdateTask(task.id, { assignees: [...current, val] });
                                }
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    <h4 className="text-[10px] font-black text-indigo-700 tracking-widest mb-1.5">プロセス・詳細メモ</h4>
                    <textarea
                      value={task.details || ''}
                      onChange={(e) => onUpdateTask(task.id, { details: e.target.value })}
                      placeholder="タスクの詳細やプロセスを入力..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 min-h-[80px] resize-y placeholder:text-slate-400"
                    />

                    {/* 検出されたアクションショートカット */}
                    {(() => {
                      const shortcuts = extractActionShortcuts(task.title, task.details);
                      if (shortcuts.length === 0) return null;
                      return (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {shortcuts.map(sc => (
                            <a
                              key={sc.name}
                              href={sc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[10px] font-black text-indigo-700 hover:bg-indigo-700 hover:text-white hover:border-indigo-700 transition-all cursor-pointer shadow-sm"
                              title={`${sc.name} を開く`}
                            >
                              <span>{sc.icon}</span>
                              <span>{sc.name}</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="mt-3 flex justify-between items-center">
                       <div className="text-left sm:hidden">
                         <div className="text-[9px] text-slate-400 font-black tracking-widest mb-1">実績時間</div>
                         <div className={`text-lg font-mono font-black ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{formatStopwatch(task.timeSpent)}</div>
                       </div>
                       {!task.isRoutine ? (
                         routineFreqPicker === task.id ? (
                           <div className="flex items-center gap-2 ml-auto animate-in fade-in">
                             <span className="text-[10px] font-black text-slate-500">頻度:</span>
                             {[
                               { label: '毎日', value: 'daily', color: 'bg-blue-600 hover:bg-blue-700' },
                               { label: '毎週', value: 'weekly', color: 'bg-green-600 hover:bg-green-700' },
                               { label: '毎月', value: 'monthly', color: 'bg-purple-600 hover:bg-purple-700' },
                             ].map(f => (
                               <button
                                 key={f.value}
                                 onClick={() => handleSaveAsRoutine(task.id, f.value)}
                                 className={`px-4 py-1.5 text-[10px] font-black text-white rounded-full ${f.color} transition-all active:scale-95 shadow-sm cursor-pointer`}
                               >
                                 {f.label}
                               </button>
                             ))}
                             <button
                               onClick={() => setRoutineFreqPicker(null)}
                               className="text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-full font-black transition-all cursor-pointer"
                             >
                               Cancel
                             </button>
                           </div>
                         ) : (
                           <button
                             onClick={() => setRoutineFreqPicker(task.id)}
                             className="text-[10px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-700 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ml-auto border border-indigo-200 hover:border-indigo-700 cursor-pointer active:scale-95 shadow-sm"
                           >
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                             <span>入力候補に登録</span>
                           </button>
                         )
                       ) : (
                         <span className="text-[10px] font-black text-indigo-600 flex items-center space-x-1 ml-auto bg-indigo-50 px-2 py-1 rounded-lg">
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                           <span>入力候補{task.tags.includes('daily') ? ' (毎日)' : task.tags.includes('weekly') ? ' (毎週)' : task.tags.includes('monthly') ? ' (毎月)' : ''}</span>
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
            <svg className="w-20 h-20 mb-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="1.5"/></svg>
            <p className="text-lg font-black text-slate-300 tracking-[0.3em]">タスクが見つかりません</p>
          </div>
        )}
      </div>

      {/* === 3カテゴリ分析セクション === */}
      {filteredTasks.length > 0 && (() => {
        const CUST_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444'];

        // タスクカテゴリ集計
        const catStats: Record<string, { count: number; time: number; color: string; icon: string; tasks: typeof filteredTasks }> = {};
        filteredTasks.forEach(t => {
          extractCategories(t.title, t.details).forEach(cat => {
            if (!catStats[cat.name]) catStats[cat.name] = { count: 0, time: 0, color: cat.color, icon: cat.icon, tasks: [] };
            catStats[cat.name].count++;
            catStats[cat.name].time += t.timeSpent;
            catStats[cat.name].tasks.push(t);
          });
        });
        const catEntries = Object.entries(catStats).sort((a, b) => b[1].count - a[1].count);
        const totalCatTime = catEntries.reduce((s, [, v]) => s + v.time, 0);

        // 顧客別集計
        const custGroups: Record<string, { tasks: typeof filteredTasks; totalTime: number; completed: number }> = {};
        filteredTasks.forEach(t => {
          const cust = t.customerName || '（顧客未設定）';
          if (!custGroups[cust]) custGroups[cust] = { tasks: [], totalTime: 0, completed: 0 };
          custGroups[cust].tasks.push(t);
          custGroups[cust].totalTime += t.timeSpent;
          if (t.completed) custGroups[cust].completed++;
        });
        const custEntries = Object.entries(custGroups).sort((a, b) => b[1].tasks.length - a[1].tasks.length);

        // ソフトウェア集計
        const swStats: Record<string, { count: number; time: number; icon: string; tasks: string[] }> = {};
        filteredTasks.forEach(t => {
          extractSoftware(t.title, t.details).forEach(sw => {
            if (!swStats[sw.name]) swStats[sw.name] = { count: 0, time: 0, icon: sw.icon, tasks: [] };
            swStats[sw.name].count++;
            swStats[sw.name].time += t.timeSpent;
            swStats[sw.name].tasks.push(t.title);
          });
        });
        const swEntries = Object.entries(swStats).sort((a, b) => b[1].count - a[1].count);

        return (
          <div className="mt-10 w-full max-w-3xl space-y-6">
            {/* タスクカテゴリ */}
            {catEntries.length > 0 && (
              <div>
                <h3 className="text-[11px] font-black text-zinc-500 tracking-widest mb-3 px-3">タスクカテゴリ</h3>
                <div className="bg-white rounded-2xl border-2 border-zinc-200 p-5 shadow-sm">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {catEntries.map(([name, stat]) => (
                      <div key={name} className="flex items-center space-x-2 px-3 py-2 rounded-xl border-2" style={{ borderColor: stat.color + '60' }}>
                        <span className="text-lg">{stat.icon}</span>
                        <div>
                          <div className="text-[11px] font-black" style={{ color: stat.color }}>{name}</div>
                          <div className="text-[10px] text-zinc-500 font-bold">{stat.count}件 / {Math.floor(stat.time / 60)}分</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalCatTime > 0 && (
                    <div className="h-3 rounded-full overflow-hidden flex bg-zinc-100">
                      {catEntries.map(([name, stat]) => (
                        <div key={name} className="h-full" style={{ width: `${(stat.time / totalCatTime) * 100}%`, backgroundColor: stat.color }} title={`${name}: ${Math.floor(stat.time / 60)}分`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 顧客カテゴリ */}
            <div>
              <h3 className="text-[11px] font-black text-zinc-500 tracking-widest mb-3 px-3">顧客カテゴリ</h3>
              <div className="bg-white rounded-2xl border-2 border-zinc-200 p-5 shadow-sm space-y-3">
                {custEntries.map(([name, data], i) => {
                  const color = CUST_COLORS[i % CUST_COLORS.length];
                  return (
                    <details key={name} className="group">
                      <summary className="flex items-center gap-3 cursor-pointer list-none hover:bg-zinc-50 rounded-xl px-2 py-1.5 transition-all">
                        <div className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-zinc-800">{name}</div>
                          <div className="text-[10px] text-zinc-500 font-bold">
                            {data.tasks.length}件 ({data.completed}完了) / {Math.floor(data.totalTime / 60)}分
                          </div>
                        </div>
                        <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                          <div className="h-full rounded-full" style={{ width: `${data.tasks.length > 0 ? (data.completed / data.tasks.length) * 100 : 0}%`, backgroundColor: color }} />
                        </div>
                        <svg className="w-4 h-4 text-zinc-400 group-open:rotate-90 transition-transform shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </summary>
                      <div className="ml-6 mt-2 space-y-1.5 border-l-2 pl-3 pb-1" style={{ borderColor: color + '40' }}>
                        {data.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-[11px]">
                            <span className={`font-black ${t.completed ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>{t.title}</span>
                            <span className="text-zinc-400 font-bold shrink-0">{Math.floor(t.timeSpent / 60)}分</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>

            {/* ソフトウェアカテゴリ */}
            {swEntries.length > 0 && (
              <div>
                <h3 className="text-[11px] font-black text-zinc-500 tracking-widest mb-3 px-3">ソフトウェアカテゴリ</h3>
                <div className="bg-white rounded-2xl border-2 border-zinc-200 p-5 shadow-sm">
                  <div className="flex flex-wrap gap-3">
                    {swEntries.map(([name, stat]) => (
                      <div key={name} className="flex items-center space-x-2 px-4 py-3 rounded-xl border-2 border-zinc-200 bg-zinc-50">
                        <span className="text-xl">{stat.icon}</span>
                        <div>
                          <div className="text-xs font-black text-zinc-800">{name}</div>
                          <div className="text-[10px] text-zinc-500 font-bold">{stat.count}件 / {Math.floor(stat.time / 60)}分</div>
                          <div className="text-[9px] text-zinc-400 font-medium truncate max-w-[180px]">{stat.tasks.join(', ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="mt-10 w-full max-w-2xl">
        <GeminiSummary tasks={tasks} targetDate={targetDate} emailFormat={emailFormat} />
      </div>
    </div>
  );
};

export default TodayView;
