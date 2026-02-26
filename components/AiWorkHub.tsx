
import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useState } from 'react';
import { Task } from '../types';

interface AiWorkHubProps {
  task: Task | null;
  onClose: () => void;
}

type ToolType = 'gmail' | 'sheets' | 'slack' | 'drive' | null;

const AiWorkHub: React.FC<AiWorkHubProps> = ({ task, onClose }) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
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
      let prompt = '';

      const isEmailTask = task.title.includes('メール') || task.title.includes('送信') || task.title.includes('チェック');
      const isMeeting = task.title.includes('打ち合わせ') || task.title.includes('MTG');

      if (tool === 'gmail') {
        if (isEmailTask) {
          prompt = `MCP Gmail連携機能: タスク「${task.title}」に関するメール対応を支援します。
          1. 関連する未読メールのチェック概要
          2. 返信が必要な場合のドラフト作成（丁寧なビジネス日本語）
          3. 送信内容の最終確認項目
          を提案してください。`;
        } else if (isMeeting) {
          prompt = `タスク「${task.title}」の打ち合わせ後の「お礼と議事録」メール案を橋本社長または顧客向けに作成してください。`;
        } else {
          prompt = `タスク「${task.title}」の進捗報告メールのドラフトを作成してください。`;
        }
      } else if (tool === 'sheets') {
        prompt = `タスク「${task.title}」の管理・進捗状況を記録するためのスプレッドシート項目案を5つ提案してください。`;
      } else if (tool === 'slack') {
        prompt = `タスク「${task.title}」の現在のステータスをチームに周知するSlack用メッセージを3パターン作成してください。`;
      } else if (tool === 'drive') {
        prompt = `タスク「${task.title}」に関連する資料をGoogle Driveで整理するためのフォルダ構造を提案してください。`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
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

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <label className="text-[10px] font-bold text-zinc-300 tracking-widest block mb-1">選択中のタスク</label>
          <h4 className="text-xl font-bold text-zinc-800 leading-tight">{task.title}</h4>
          <div className="mt-2 text-[11px] text-zinc-400 font-bold">{task.customerName} / {task.projectName}</div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-bold text-zinc-300 tracking-widest mb-4 block">連携ツールを選択</label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: 'gmail', name: 'Gmail', color: 'bg-zinc-50 text-zinc-800', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { id: 'sheets', name: 'スプレッドシート', color: 'bg-zinc-100 text-zinc-700', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'slack', name: 'Slack', color: 'bg-zinc-100 text-zinc-700', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
              { id: 'drive', name: 'ドライブ', color: 'bg-zinc-100 text-zinc-700', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' }
            ].map(tool => (
              <button 
                key={tool.id}
                onClick={() => handleToolClick(tool.id as ToolType)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  selectedTool === tool.id ? 'border-zinc-800 bg-zinc-50/20 shadow-sm' : 'border-zinc-50'
                }`}
              >
                <div className={`w-10 h-10 ${tool.color} rounded-lg flex items-center justify-center mb-2`}>
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tool.icon} /></svg>
                </div>
                <span className="text-[10px] font-bold text-zinc-600 leading-tight">{tool.name}</span>
              </button>
            ))}
          </div>
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
      </div>
    </div>
  );
};

export default AiWorkHub;
