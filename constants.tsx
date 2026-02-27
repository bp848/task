
import { Task, Project, Email } from './types';

export const initialProjects: Project[] = [
  { id: 'inbox', name: '受信トレイ', color: '#6B7280' },
  { id: 'p1', name: '制作・デザイン', color: '#EC4899' },
  { id: 'p2', name: '進行管理・MTG', color: '#3B82F6' },
  { id: 'p3', name: '事務・見積管理', color: '#10B981' },
  { id: 'p4', name: 'メール・連絡', color: '#F59E0B' },
  { id: 'p5', name: '営業・提案', color: '#8B5CF6' },
  { id: 'p6', name: '学習・研修', color: '#06B6D4' },
  { id: 'p7', name: '環境整備', color: '#F97316' },
];

// タスクカテゴリ自動判定キーワード
export const TASK_CATEGORY_KEYWORDS: Record<string, { keywords: string[]; color: string; icon: string }> = {
  'メール': { keywords: ['メール', '送信', '返信', '受信', '連絡'], color: '#F59E0B', icon: '✉️' },
  '制作': { keywords: ['制作', 'デザイン', 'イラスト', '配置', '作成', 'ドラフト', '校正', '入稿', 'レイアウト'], color: '#EC4899', icon: '🎨' },
  '作業': { keywords: ['作業', 'チェック', 'データ', '入力', '整理', '準備', '処理'], color: '#10B981', icon: '🔧' },
  '電話': { keywords: ['電話', 'TEL', 'tel', '架電', '通話'], color: '#EF4444', icon: '📞' },
  'MTG': { keywords: ['MTG', '打ち合わせ', '会議', 'ミーティング', '朝礼', '部署'], color: '#3B82F6', icon: '🤝' },
  '見積': { keywords: ['見積', '請求', '納品', '発注'], color: '#8B5CF6', icon: '💰' },
  '改善': { keywords: ['改善', '環境整備', '振り返り'], color: '#F97316', icon: '✨' },
  '学習': { keywords: ['学ぶ', '勉強', '研修', 'タイピング', '読書', '練習', '説明会'], color: '#06B6D4', icon: '📚' },
};

// ソフトウェアランチャーリンク
export const SOFTWARE_LAUNCHERS: Record<string, { name: string; protocol: string; icon: string }> = {
  'イラストレーター': { name: 'Illustrator', protocol: 'illustrator://', icon: '🎨' },
  'Illustrator': { name: 'Illustrator', protocol: 'illustrator://', icon: '🎨' },
  'フォトショップ': { name: 'Photoshop', protocol: 'photoshop://', icon: '🖼️' },
  'Photoshop': { name: 'Photoshop', protocol: 'photoshop://', icon: '🖼️' },
  'InDesign': { name: 'InDesign', protocol: 'indesign://', icon: '📐' },
  'インデザイン': { name: 'InDesign', protocol: 'indesign://', icon: '📐' },
  'Excel': { name: 'Excel', protocol: 'ms-excel:', icon: '📊' },
  'エクセル': { name: 'Excel', protocol: 'ms-excel:', icon: '📊' },
  'Word': { name: 'Word', protocol: 'ms-word:', icon: '📝' },
  'ワード': { name: 'Word', protocol: 'ms-word:', icon: '📝' },
  'PowerPoint': { name: 'PowerPoint', protocol: 'ms-powerpoint:', icon: '📽️' },
  'パワポ': { name: 'PowerPoint', protocol: 'ms-powerpoint:', icon: '📽️' },
  'Slack': { name: 'Slack', protocol: 'slack://', icon: '💬' },
  'Teams': { name: 'Teams', protocol: 'msteams:', icon: '💬' },
  'Chrome': { name: 'Chrome', protocol: 'https://google.com', icon: '🌐' },
  'Gmail': { name: 'Gmail', protocol: 'https://mail.google.com', icon: '📧' },
};

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
