
import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useState, useMemo } from 'react';
import { Task, WorkflowAnswer, WorkflowState } from '../types';
import { getWorkflowTemplate } from '../workflowTemplates';
import { extractActionShortcuts } from '../constants';

interface AiWorkHubProps {
  task: Task | null;
  tasks?: Task[];
  targetDate?: string;
  onClose: () => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  aiPersona?: string;
  autoMemo?: boolean;
}

type ToolType = 'gmail' | 'sheets' | 'slack' | 'drive' | null;
type TabType = 'workflow' | 'tools' | 'analysis';

// ペルソナ別のシステムプロンプト
const PERSONA_PROMPTS: Record<string, string> = {
  polite: 'あなたは丁寧なビジネスアシスタントです。敬語を使い、簡潔で正確に応答してください。',
  comedian: 'あなたはお笑い芸人風のアシスタントです。ボケやツッコミを交えつつ、要点はしっかり伝えてください。「なんでやねん！」「ほな」などの関西弁も使ってOK。',
  cat: 'あなたは猫のアシスタントにゃ。語尾に「にゃ」「にゃん」をつけて、猫っぽく応答するにゃ。でも仕事の内容は正確に伝えるにゃ。',
  dog: 'あなたは犬のアシスタントわん！語尾に「わん」「ワン」をつけて、元気よく応答するわん！ご主人様のタスクを全力サポートわん！',
  newscaster: 'あなたはニュースキャスター風のアシスタントです。「お伝えします」「続いてのニュースです」のように、報道調で格調高く応答してください。',
  auntie: 'あなたは世話好きなおば様のアシスタントよ。「あらまあ」「ちゃんとしなきゃダメよ」のような口調で、温かく世話を焼きながら応答してね。',
  principal: 'あなたは校長先生風のアシスタントです。「諸君」「心がけたまえ」のような堅い口調で、教訓を交えながら応答してください。',
  classmate: 'あなたは同級生のアシスタントだよ！タメ口で「マジで」「やばくない？」とかカジュアルに話しつつ、ちゃんと仕事は手伝うよ！',
  doraemon: 'あなたは未来から来た青いロボット猫のアシスタントです。「ボクに任せて！」「ひみつ道具〜！」のように、明るく頼もしく応答してください。ポケットからいろんな解決策を出す感じで。',
  pikachu: 'あなたは黄色いモンスター風のアシスタントです。「ピカ！」を時々挟みつつ、電気のようにエネルギッシュに応答してください。でも内容はしっかり伝えます。',
};

const getEndTime = (startTime: string, seconds: number): string => {
  const [h, m] = startTime.split(':').map(Number);
  const totalMins = h * 60 + m + Math.ceil(seconds / 60);
  const eh = Math.floor(totalMins / 60) % 24;
  const em = totalMins % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
};

const getTimeSlot = (startTime?: string, timeSpent?: number, estimatedTime?: number): string => {
  if (!startTime) return '??:??–??:??';
  const duration = (timeSpent && timeSpent > 0) ? timeSpent : (estimatedTime || 0);
  if (!duration) return `${startTime}–??:??`;
  return `${startTime}–${getEndTime(startTime, duration)}`;
};

const buildTimeGroupedTaskList = (tasks: Task[]): string => {
  const timeGroups: Record<string, Task[]> = {};
  tasks.forEach(t => {
    const start = t.startTime || '??:??';
    let end = t.endTime;
    if (!end && t.startTime) {
      const duration = (t.timeSpent && t.timeSpent > 0) ? t.timeSpent : (t.estimatedTime || 0);
      if (duration > 0) {
        end = getEndTime(t.startTime, duration);
      } else {
        end = '??:??';
      }
    } else if (!end) {
      end = '??:??';
    }
    const timeKey = `■${start}–${end}`;
    if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
    timeGroups[timeKey].push(t);
  });

  return Object.entries(timeGroups)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([timeKey, tasksInGroup]) => {
      const tasksStr = tasksInGroup.map(t => {
        let str = `・${t.title}`;
        if (t.details) {
          const detailsLines = t.details.split('\n').map(d => {
            if (d.startsWith('（') || d.startsWith('(')) return d;
            return `（${d}）`;
          }).join('\n');
          str += `\n${detailsLines}`;
        }
        return str;
      }).join('\n');
      return `${timeKey}\n${tasksStr}`;
    })
    .join('\n');
};

// --- Workflow Wizard sub-component ---
const WorkflowWizard: React.FC<{
  task: Task;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
}> = ({ task, onUpdateTask }) => {
  const template = useMemo(() => getWorkflowTemplate(task.title, task.details), [task.title, task.details]);
  const [answers, setAnswers] = useState<WorkflowAnswer[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [freeText, setFreeText] = useState('');

  // Load existing answers when task changes
  useEffect(() => {
    if (task.workflowAnswers?.steps?.length) {
      setAnswers(task.workflowAnswers.steps);
      const nextIdx = task.workflowAnswers.steps.length;
      setCurrentStepIndex(nextIdx >= template.steps.length ? template.steps.length : nextIdx);
    } else {
      setAnswers([]);
      setCurrentStepIndex(0);
    }
    setFreeText('');
  }, [task.id]);

  const handleAnswer = (answer: string) => {
    const step = template.steps[currentStepIndex];
    if (!step) return;

    const newAnswer: WorkflowAnswer = {
      stepId: step.stepId,
      question: step.question,
      answer,
      answeredAt: new Date().toISOString(),
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setCurrentStepIndex(currentStepIndex + 1);
    setFreeText('');

    // Persist
    const state: WorkflowState = {
      category: template.category,
      steps: updatedAnswers,
    };
    onUpdateTask?.(task.id, { workflowAnswers: state });
  };

  const handleReAnswer = (index: number) => {
    const sliced = answers.slice(0, index);
    setAnswers(sliced);
    setCurrentStepIndex(index);
    setFreeText('');

    const state: WorkflowState = {
      category: template.category,
      steps: sliced,
    };
    onUpdateTask?.(task.id, { workflowAnswers: state });
  };

  const handleReset = () => {
    setAnswers([]);
    setCurrentStepIndex(0);
    setFreeText('');
    onUpdateTask?.(task.id, { workflowAnswers: undefined });
  };

  const isComplete = currentStepIndex >= template.steps.length;
  const currentStep = template.steps[currentStepIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-black text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full">
          {template.category === 'default' ? 'General' : template.category}
        </span>
        <span className="text-[10px] text-zinc-300 font-bold">
          {answers.length}/{template.steps.length} 回答済み
        </span>
      </div>

      {/* Answered questions - scrollable history */}
      {answers.map((a, i) => (
        <button
          key={a.stepId}
          onClick={() => handleReAnswer(i)}
          className="w-full text-left group"
        >
          <div className="bg-zinc-50/50 rounded-xl p-3 border border-zinc-100 hover:border-zinc-300 transition-all">
            <div className="text-[10px] text-zinc-400 font-bold mb-1">{a.question}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-zinc-800 bg-zinc-100 px-3 py-1 rounded-full">
                {a.answer}
              </span>
              <span className="text-[9px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                click to redo
              </span>
            </div>
          </div>
        </button>
      ))}

      {/* Current question */}
      {!isComplete && currentStep && (
        <div className="bg-white rounded-2xl p-4 border-2 border-zinc-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-sm font-black text-zinc-800 mb-4">{currentStep.question}</div>
          <div className="flex flex-wrap gap-2">
            {currentStep.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-800 hover:text-white text-zinc-700 text-[11px] font-black rounded-full transition-all hover:scale-105 hover:shadow-md"
              >
                {opt}
              </button>
            ))}
          </div>
          {currentStep.allowFreeText && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && freeText.trim()) handleAnswer(freeText.trim()); }}
                placeholder="自由入力..."
                className="flex-1 text-xs border-2 border-zinc-100 rounded-xl px-3 py-2 outline-none focus:border-zinc-400 font-bold"
              />
              <button
                onClick={() => { if (freeText.trim()) handleAnswer(freeText.trim()); }}
                disabled={!freeText.trim()}
                className="px-3 py-2 bg-zinc-800 text-white text-[10px] font-black rounded-xl disabled:opacity-30 transition-all"
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completion summary */}
      {isComplete && (
        <div className="bg-zinc-50 rounded-2xl p-5 border-2 border-zinc-100 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">&#10003;</span>
            <span className="text-sm font-black text-zinc-800">ワークフロー完了</span>
          </div>
          <div className="space-y-2 mb-4">
            {answers.map(a => (
              <div key={a.stepId} className="flex items-start gap-2 text-[11px]">
                <span className="text-zinc-400 font-bold shrink-0">{a.question.replace('？', '')}</span>
                <span className="text-zinc-800 font-black">{a.answer}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2 text-[10px] font-black text-zinc-400 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-all"
            >
              やり直す
            </button>
            <button
              onClick={() => {
                const summary = answers.map(a => `${a.question.replace('？', '')}: ${a.answer}`).join('\n');
                const newDetails = task.details ? `${task.details}\n---\n${summary}` : summary;
                onUpdateTask?.(task.id, { details: newDetails });
              }}
              className="flex-1 py-2 text-[10px] font-black text-white bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all"
            >
              詳細メモに追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Evidence auto-analysis sub-component ---
const EvidenceAnalysis: React.FC<{
  task: Task;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  aiPersona: string;
}> = ({ task, onUpdateTask, aiPersona }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evidenceInput, setEvidenceInput] = useState(task.evidence || '');

  useEffect(() => {
    setEvidenceInput(task.evidence || '');
    setAnalysis('');
  }, [task.id]);

  const runAnalysis = async () => {
    const textToAnalyze = evidenceInput || task.details || '';
    if (!textToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const personaInstruction = PERSONA_PROMPTS[aiPersona] || PERSONA_PROMPTS.polite;

      const prompt = `${personaInstruction}

以下のタスクの証拠メモ・詳細を分析し、業務改善の観点からフィードバックをください。

【タスク情報】
タスク名: ${task.title}
顧客: ${task.customerName || '未設定'}
案件: ${task.projectName || '未設定'}
実績時間: ${Math.floor(task.timeSpent / 60)}分
ステータス: ${task.completed ? '完了' : '進行中'}

【証拠メモ・詳細】
${textToAnalyze}

以下の観点で分析してください：
1. 作業内容の要約（箇条書き3点以内）
2. 所要時間の妥当性（${Math.floor(task.timeSpent / 60)}分）
3. 改善ポイントや次回への提案
4. 報告書に使える一文サマリ`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAnalysis(response.text || '分析結果を取得できませんでした。');
    } catch {
      setAnalysis('分析中にエラーが発生しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEvidence = () => {
    onUpdateTask?.(task.id, { evidence: evidenceInput });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-2">証拠メモ</label>
        <textarea
          value={evidenceInput}
          onChange={(e) => setEvidenceInput(e.target.value)}
          onBlur={handleSaveEvidence}
          placeholder="作業の証拠・メモを入力...&#10;例: スクリーンショット保存済み、A案で確定、修正3回実施"
          className="w-full text-xs border-2 border-zinc-200 rounded-xl p-3 min-h-[100px] resize-y outline-none focus:border-blue-400 font-medium text-zinc-700"
        />
      </div>

      <button
        onClick={runAnalysis}
        disabled={isAnalyzing || (!evidenceInput.trim() && !task.details)}
        className="w-full py-3 bg-zinc-800 text-white text-xs font-black rounded-xl hover:bg-zinc-700 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            解析中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            AI自動解析を実行
          </>
        )}
      </button>

      {analysis && (
        <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-100 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-blue-600 tracking-widest">AI解析結果</span>
          </div>
          <div className="prose prose-sm text-zinc-700 whitespace-pre-wrap leading-relaxed text-xs font-medium">
            {analysis}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(analysis);
              }}
              className="flex-1 py-2 text-[10px] font-black text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-all"
            >
              コピー
            </button>
            <button
              onClick={() => {
                const newDetails = task.details ? `${task.details}\n---\n【AI解析】\n${analysis}` : `【AI解析】\n${analysis}`;
                onUpdateTask?.(task.id, { details: newDetails });
              }}
              className="flex-1 py-2 text-[10px] font-black text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all"
            >
              詳細に追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main component ---
const AiWorkHub: React.FC<AiWorkHubProps> = ({ task, tasks = [], targetDate, onClose, onUpdateTask, aiPersona = 'polite', autoMemo = true }) => {
  const [activeTab, setActiveTab] = useState<TabType>('workflow');
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    setActiveTab('workflow');
    setSelectedTool(null);
    setAiResponse('');
  }, [task?.id]);

  const handleToolClick = async (tool: ToolType) => {
    if (!task) return;
    setSelectedTool(tool);
    setIsThinking(true);
    setAiResponse('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const personaInstruction = PERSONA_PROMPTS[aiPersona] || PERSONA_PROMPTS.polite;
      let prompt = '';

      const isEmailTask = task.title.includes('メール') || task.title.includes('送信') || task.title.includes('チェック');
      const isMeeting = task.title.includes('打ち合わせ') || task.title.includes('MTG');

      if (tool === 'gmail') {
        const dayTasks = tasks.filter(t => t.date === targetDate);
        const timeGroupedList = dayTasks.length > 0 ? buildTimeGroupedTaskList(dayTasks) : '';

        if (isEmailTask) {
          prompt = `MCP Gmail連携機能: タスク「${task.title}」に関するメール対応を支援します。
以下の業務報告フォーマットに基づいて返信メールのドラフトを作成してください。

【現在のタスク情報】
・タスク名: ${task.title}
・顧客名: ${task.customerName || '未設定'}
・プロジェクト: ${task.projectName || '未設定'}
・詳細: ${task.details || 'なし'}
・開始時間: ${task.startTime || '未設定'}

【本日の全業務】
${timeGroupedList || '（タスク情報なし）'}

以下を提案してください：
1. 関連する未読メールのチェック概要
2. 返信が必要な場合のドラフト作成（丁寧なビジネス日本語）
3. 送信内容の最終確認項目`;
        } else if (isMeeting) {
          prompt = `タスク「${task.title}」の打ち合わせ後の報告メールを以下のフォーマットで作成してください。

橋本社長

いつもありがとうございます。
CSGの三神です。

${task.title}の報告です。

${timeGroupedList ? timeGroupedList : `■${task.startTime || '??:??'}–${getTimeSlot(task.startTime, task.timeSpent, task.estimatedTime).split('–')[1]}
・${task.title}
${task.details ? `（${task.details}）` : ''}`}

**************************************************
文唱堂印刷株式会社
三神 杏友

〒101-0025
東京都千代田区神田佐久間町3-37
Tel.03-3851-0111
**************************************************

---
上記フォーマットをベースに、打ち合わせ内容の議事要約と次回アクションも追記してください。`;
        } else {
          const timeRange = task.startTime ? `${task.startTime}時台` : '本日';
          prompt = `タスク「${task.title}」に関する業務報告メールを以下のフォーマットで作成してください。

橋本社長

いつもありがとうございます。
CSGの三神です。

${timeRange}の業務進捗をご報告いたします。

${timeGroupedList ? timeGroupedList : `■${task.startTime || '??:??'}–${getTimeSlot(task.startTime, task.timeSpent, task.estimatedTime).split('–')[1]}
・${task.title}
${task.details ? `（${task.details}）` : ''}`}

**************************************************
文唱堂印刷株式会社
三神 杏友

〒101-0025
東京都千代田区神田佐久間町3-37
Tel.03-3851-0111
**************************************************

---
上記フォーマットを忠実に守り、各タスクの詳細情報を活用して具体的な報告内容を生成してください。
顧客名: ${task.customerName || '未設定'}
プロジェクト名: ${task.projectName || '未設定'}`;
        }
      } else if (tool === 'sheets') {
        prompt = `タスク「${task.title}」の管理・進捗状況を記録するためのスプレッドシート項目案を5つ提案してください。
顧客: ${task.customerName || '未設定'}、プロジェクト: ${task.projectName || '未設定'}`;
      } else if (tool === 'slack') {
        prompt = `タスク「${task.title}」の現在のステータスをチームに周知するSlack用メッセージを3パターン作成してください。
詳細: ${task.details || 'なし'}`;
      } else if (tool === 'drive') {
        prompt = `タスク「${task.title}」に関連する資料をGoogle Driveで整理するためのフォルダ構造を提案してください。
プロジェクト: ${task.projectName || '未設定'}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${personaInstruction}\n\n${prompt}`,
      });

      setAiResponse(response.text || '応答を取得できませんでした。');
    } catch (err) {
      setAiResponse('エラーが発生しました。');
    } finally {
      setIsThinking(false);
    }
  };

  if (!task) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white border-l shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-zinc-50/30">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-white shadow-sm shadow-zinc-200">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="font-bold text-zinc-800">AI業務支援ハブ</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-300">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b bg-zinc-50/20">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex-1 py-3 text-[11px] font-black tracking-wider transition-all relative ${
            activeTab === 'workflow' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          WORKFLOW
          {activeTab === 'workflow' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-800 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-3 text-[11px] font-black tracking-wider transition-all relative ${
            activeTab === 'analysis' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          ANALYSIS
          {activeTab === 'analysis' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-800 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-3 text-[11px] font-black tracking-wider transition-all relative ${
            activeTab === 'tools' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          AI TOOLS
          {activeTab === 'tools' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-800 rounded-full" />}
        </button>
      </div>

      {/* Task info + auto-detected shortcuts */}
      <div className="px-6 pt-5 pb-3">
        <label className="text-[10px] font-bold text-zinc-300 tracking-widest block mb-1">選択中のタスク</label>
        <h4 className="text-lg font-bold text-zinc-800 leading-tight">{task.title}</h4>
        <div className="mt-1 text-[11px] text-zinc-400 font-bold">{task.customerName} / {task.projectName}</div>
        {task.details && (
          <div className="mt-2 text-[11px] text-zinc-500 bg-zinc-50 rounded-lg p-2 font-medium line-clamp-3">{task.details}</div>
        )}
        {/* Auto-detected action shortcuts from task text */}
        {(() => {
          const shortcuts = extractActionShortcuts(task.title, task.details);
          if (shortcuts.length === 0) return null;
          return (
            <div className="mt-3">
              <label className="text-[9px] font-black text-zinc-400 tracking-widest block mb-2">検出されたツール連携</label>
              <div className="flex flex-wrap gap-2">
                {shortcuts.map(sc => (
                  <a
                    key={sc.name}
                    href={sc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl text-[11px] font-black text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer shadow-sm"
                  >
                    <span>{sc.icon}</span>
                    <span>{sc.name}</span>
                  </a>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Tab content */}
      <div className="px-6 pb-6 flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'workflow' ? (
          <WorkflowWizard task={task} onUpdateTask={onUpdateTask} />
        ) : activeTab === 'analysis' ? (
          <EvidenceAnalysis task={task} onUpdateTask={onUpdateTask} aiPersona={aiPersona} />
        ) : (
          <>
            <div className="mb-8">
              <label className="text-[10px] font-bold text-zinc-300 tracking-widest mb-4 block">連携ツールを選択</label>
              {(() => {
                const detectedToolIds = new Set(
                  extractActionShortcuts(task.title, task.details).map(s => s.toolId).filter(Boolean)
                );
                const tools = [
                  { id: 'gmail', name: 'Gmail', color: 'bg-zinc-50 text-zinc-800', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                  { id: 'sheets', name: 'スプレッドシート', color: 'bg-zinc-100 text-zinc-700', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { id: 'slack', name: 'Slack', color: 'bg-zinc-100 text-zinc-700', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
                  { id: 'drive', name: 'ドライブ', color: 'bg-zinc-100 text-zinc-700', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' }
                ];
                return (
                  <div className="grid grid-cols-4 gap-3">
                    {tools.map(tool => {
                      const isDetected = detectedToolIds.has(tool.id);
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleToolClick(tool.id as ToolType)}
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                            selectedTool === tool.id
                              ? 'border-zinc-800 bg-zinc-800 text-white shadow-lg'
                              : isDetected
                                ? 'border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200 animate-pulse'
                                : 'border-zinc-100 hover:border-zinc-300 hover:shadow-sm'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                            selectedTool === tool.id
                              ? 'bg-white text-zinc-800'
                              : isDetected
                                ? 'bg-blue-500 text-white'
                                : tool.color
                          }`}>
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tool.icon} /></svg>
                          </div>
                          <span className={`text-[10px] font-bold leading-tight ${
                            selectedTool === tool.id ? 'text-white' : isDetected ? 'text-blue-700 font-black' : 'text-zinc-600'
                          }`}>{tool.name}</span>
                          {isDetected && selectedTool !== tool.id && (
                            <span className="text-[8px] font-black text-blue-500 mt-0.5">検出</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="relative">
              {selectedTool ? (
                <div className="bg-zinc-50/10 rounded-2xl p-5 border border-zinc-50 min-h-[350px] animate-in fade-in duration-500">
                   {isThinking ? (
                     <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
                        <div className="h-4 bg-zinc-100 rounded w-full"></div>
                        <div className="h-4 bg-zinc-100 rounded w-5/6"></div>
                     </div>
                   ) : (
                     <div className="prose prose-sm text-zinc-700 whitespace-pre-wrap leading-relaxed font-medium">
                       {aiResponse}
                     </div>
                   )}

                   {!isThinking && aiResponse && (
                     <button
                       onClick={() => {
                         navigator.clipboard.writeText(aiResponse);
                         alert('内容をコピーしました。');
                       }}
                       className="w-full mt-6 bg-zinc-800 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-zinc-100"
                     >
                       内容をコピーして実務に活用
                     </button>
                   )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6 border-2 border-dashed border-zinc-50 rounded-3xl opacity-60">
                   <svg className="w-12 h-12 text-zinc-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   <h5 className="text-zinc-800 font-bold mb-1">AI連携・支援機能</h5>
                   <p className="text-[11px] text-zinc-400">
                     メールチェック、返信ドラフト、資料整理などの実務支援を行います。ツールを選択してください。
                   </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AiWorkHub;
