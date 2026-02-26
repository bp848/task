
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

export const mockEmails: Email[] = [];

const now = new Date().toISOString();

export const initialTasks: Task[] = [];

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
