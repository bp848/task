
import { Task, Project, Email } from './types';

export const initialProjects: Project[] = [
  { id: 'inbox', name: '受信トレイ', color: '#6B7280' },
  { id: 'p1', name: '制作・デザイン', color: '#EC4899' },
  { id: 'p2', name: '進行管理・MTG', color: '#3B82F6' },
  { id: 'p3', name: '事務・見積管理', color: '#10B981' },
];

export const commonTaskSuggestions = [
  "打ち合わせ (MTG)",
  "進捗報告メール送信",
  "見積書作成・送付",
  "ZENBI 4月号 校正確認",
  "朝礼・共有事項確認",
  "データチェック・入稿準備",
  "改善書作成チェック",
  "インタビュー記事ドラフト作成",
  "スケジュール調整・アポ取り"
];

export const mockEmails: Email[] = [
  {
    id: 'em1',
    sender: '橋本社長 <hashimoto@example.com>',
    subject: '【至急】来週のZENBI 4月号の色校正について',
    snippet: '三神さん、来週の色校正ですが、私が直接確認するページをいくつか指定します。藤島さんとも調整しておいてください。',
    date: '10:45',
    isRead: false,
    customerName: '全美',
    projectName: 'ZENBI 4月号'
  },
  {
    id: 'em2',
    sender: '富士産業 担当者 <contact@fuji-ind.jp>',
    subject: '改善書の修正案をお送りします',
    snippet: '前回のMTGで指摘のあった箇所の修正が完了しました。データをご確認いただけますでしょうか。',
    date: '09:12',
    isRead: false,
    customerName: '富士産業',
    projectName: '改善書作成'
  },
  {
    id: 'em3',
    sender: '全美 藤島様 <fujishima@zenbi.org>',
    subject: 'インタビュー記事の素材送付',
    snippet: 'お世話になっております。4月号インタビューページの追加写真をお送りします。',
    date: '昨日',
    isRead: true,
    customerName: '全美',
    projectName: 'ZENBI 4月号'
  }
];

const feb6 = "2025-02-06";
const now = new Date().toISOString();

export const initialTasks: Task[] = [
  { id: 't1', title: '朝礼', completed: true, timeSpent: 1200, estimatedTime: 1200, startTime: '08:20', endTime: '08:40', projectId: 'p2', date: feb6, createdAt: now, isRoutine: true, tags: [] },
  { id: 't2', title: 'MTG', completed: true, timeSpent: 600, estimatedTime: 600, startTime: '08:40', endTime: '08:50', projectId: 'p2', date: feb6, createdAt: now, tags: [] },
  { id: 't3', title: '進捗会議', completed: true, timeSpent: 9000, estimatedTime: 9000, startTime: '09:00', endTime: '11:30', projectId: 'p2', date: feb6, createdAt: now, tags: [] },
  { id: 't4', title: 'ZENBI 4月号　手配対応', customerName: '全美', projectName: 'ZENBI 4月号', completed: true, timeSpent: 2700, estimatedTime: 2700, startTime: '11:30', endTime: '12:15', projectId: 'p1', date: feb6, createdAt: now, tags: [] },
  { id: 't5', title: '商工クラブ3-4月号　テープ起こし', customerName: '商工クラブ', projectName: '3-4月号', completed: true, timeSpent: 3600, estimatedTime: 3600, startTime: '13:00', endTime: '14:00', projectId: 'p1', date: feb6, createdAt: now, tags: [] },
  { id: 't6', title: '事務作業（メールチェック・送信含む）', completed: true, timeSpent: 5400, estimatedTime: 5400, startTime: '14:00', endTime: '15:30', projectId: 'p3', date: feb6, createdAt: now, tags: ['Gmail'] },
  { id: 't11', title: '健康経営銘柄　原稿作成用データ作成準備', customerName: '健康経営', projectName: '健康経営銘柄', completed: true, timeSpent: 3600, estimatedTime: 3600, startTime: '17:00', endTime: '18:00', projectId: 'p1', date: feb6, createdAt: now, tags: [] },
  { id: 't14', title: '健康経営銘柄　原稿作成用データ作成準備', customerName: '健康経営', projectName: '健康経営銘柄', completed: false, timeSpent: 0, estimatedTime: 5400, startTime: '19:00', endTime: '20:30', projectId: 'p1', date: feb6, createdAt: now, tags: [] },
];

export const businessMetricsData = {
  monthly: {
    pq: { target: 27.9, actual: 3.4, prevYear: 9.4 },
    mq: { target: 19.5, actual: 1.5, prevYear: 5.8 }
  },
  cumulative: {
    pq: { target: 254.8, actual: 96.9, prevYear: 98.6 },
    mq: { target: 178.4, actual: 58.2, prevYear: 59.8 }
  }
};
