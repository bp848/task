
import { WorkflowTemplate } from './types';
import { TASK_CATEGORY_KEYWORDS } from './constants';

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  '制作': {
    category: '制作',
    steps: [
      {
        stepId: 'purpose',
        question: '提案なのか？納品なのか？',
        options: ['提案', '納品', '修正対応', '初稿作成', 'その他'],
      },
      {
        stepId: 'fileFormat',
        question: '納品ファイル形式は？',
        options: ['AI', 'PSD', 'PDF', 'PNG', 'JPG', 'InDesign', 'Excel', 'その他'],
        allowFreeText: true,
      },
      {
        stepId: 'description',
        question: 'どんな絵（制作物）ですか？',
        options: ['チラシ', 'ポスター', 'ロゴ', '図解', 'バナー', '名刺', 'カタログ', 'その他'],
        allowFreeText: true,
      },
      {
        stepId: 'materials',
        question: '素材は？',
        options: ['写真データあり', 'イラスト素材あり', 'テキスト原稿のみ', '素材なし（要作成）', 'ストックフォト使用'],
      },
      {
        stepId: 'afterCompletion',
        question: '完了したら？',
        options: ['メール送信', 'FAX送信', 'Slack通知', 'ドライブに保存のみ', '印刷・郵送'],
      },
      {
        stepId: 'saveLocation',
        question: '保存場所は？',
        options: ['Google Drive', 'ローカル', '共有サーバー', 'メール添付のみ'],
        allowFreeText: true,
      },
    ],
  },
  'メール': {
    category: 'メール',
    steps: [
      {
        stepId: 'emailType',
        question: 'メールの種類は？',
        options: ['返信', '新規送信', '転送', '確認チェック'],
      },
      {
        stepId: 'urgency',
        question: '緊急度は？',
        options: ['至急', '本日中', '今週中', '急ぎなし'],
      },
      {
        stepId: 'recipient',
        question: '送信先は？',
        options: ['顧客', '社内', '外注先', '複数宛先'],
        allowFreeText: true,
      },
      {
        stepId: 'attachment',
        question: '添付ファイルは？',
        options: ['あり', 'なし', '準備中'],
      },
      {
        stepId: 'afterSend',
        question: '送信後のアクションは？',
        options: ['返信待ち', '電話フォロー', 'タスク完了', '別タスクに続く'],
      },
    ],
  },
  'MTG': {
    category: 'MTG',
    steps: [
      {
        stepId: 'mtgType',
        question: '打ち合わせの種類は？',
        options: ['社内MTG', '顧客訪問', 'オンライン', '電話会議', '朝礼'],
      },
      {
        stepId: 'preparation',
        question: '事前準備は？',
        options: ['資料作成済み', '議題リスト作成', 'アジェンダ共有済み', '準備不要', '要準備'],
      },
      {
        stepId: 'deliverable',
        question: 'MTG後の成果物は？',
        options: ['議事録', '報告メール', 'タスク振り分け', 'なし'],
      },
      {
        stepId: 'afterMtg',
        question: 'MTG後のアクションは？',
        options: ['報告メール送信', '議事録共有', '次回日程調整', 'タスク完了'],
      },
    ],
  },
  '見積': {
    category: '見積',
    steps: [
      {
        stepId: 'docType',
        question: '書類の種類は？',
        options: ['見積書', '請求書', '納品書', '発注書'],
      },
      {
        stepId: 'format',
        question: 'フォーマットは？',
        options: ['Excel', 'PDF', '専用システム', 'Word'],
      },
      {
        stepId: 'deliveryMethod',
        question: '送付方法は？',
        options: ['メール', 'FAX', '郵送', '手渡し'],
      },
      {
        stepId: 'afterCompletion',
        question: '送付後のアクションは？',
        options: ['確認電話', '返信待ち', 'ファイリング', 'タスク完了'],
      },
    ],
  },
  '作業': {
    category: '作業',
    steps: [
      {
        stepId: 'workType',
        question: '作業の種類は？',
        options: ['データ入力', 'チェック・確認', '整理・分類', '更新・修正'],
      },
      {
        stepId: 'tool',
        question: '使用ツールは？',
        options: ['Excel', 'ブラウザ', '専用ソフト', 'ファイルマネージャー'],
        allowFreeText: true,
      },
      {
        stepId: 'afterCompletion',
        question: '完了したら？',
        options: ['報告メール', '次の作業へ', 'ファイル保存', 'タスク完了'],
      },
    ],
  },
  '電話': {
    category: '電話',
    steps: [
      {
        stepId: 'callType',
        question: '電話の種類は？',
        options: ['架電', '折返し', '受電対応', 'アポ取り'],
      },
      {
        stepId: 'purpose',
        question: '目的は？',
        options: ['確認', '依頼', '報告', 'フォローアップ', 'クレーム対応'],
      },
      {
        stepId: 'afterCall',
        question: '通話後のアクションは？',
        options: ['メール送信', '議事メモ', 'タスク作成', 'タスク完了'],
      },
    ],
  },
  '改善': {
    category: '改善',
    steps: [
      {
        stepId: 'improvementType',
        question: '改善の対象は？',
        options: ['業務フロー', '環境整備', '書類・テンプレート', 'ツール導入'],
      },
      {
        stepId: 'scope',
        question: '影響範囲は？',
        options: ['自分のみ', 'チーム全体', '部署全体', '全社'],
      },
      {
        stepId: 'afterCompletion',
        question: '完了したら？',
        options: ['報告書作成', '共有・展開', '振り返りメモ', 'タスク完了'],
      },
    ],
  },
  '学習': {
    category: '学習',
    steps: [
      {
        stepId: 'learningType',
        question: '学習の種類は？',
        options: ['研修', '自主学習', '資格勉強', 'OJT', '読書'],
      },
      {
        stepId: 'output',
        question: 'アウトプットは？',
        options: ['ノート・メモ', 'レポート', '実践練習', '特になし'],
      },
      {
        stepId: 'afterCompletion',
        question: '完了後は？',
        options: ['振り返りメモ', '成果報告', '次回計画', 'タスク完了'],
      },
    ],
  },
};

const DEFAULT_TEMPLATE: WorkflowTemplate = {
  category: 'default',
  steps: [
    {
      stepId: 'purpose',
      question: 'このタスクの目的は？',
      options: ['作成・制作', '確認・チェック', '連絡・報告', '調査・検討'],
      allowFreeText: true,
    },
    {
      stepId: 'afterCompletion',
      question: '完了したら？',
      options: ['メール報告', '次のタスクへ', 'ファイル保存', 'タスク完了のみ'],
    },
  ],
};

export function getWorkflowTemplate(title: string, details?: string): WorkflowTemplate {
  const text = `${title} ${details || ''}`;
  for (const [categoryName, cfg] of Object.entries(TASK_CATEGORY_KEYWORDS)) {
    if (cfg.keywords.some(kw => text.includes(kw))) {
      if (WORKFLOW_TEMPLATES[categoryName]) {
        return WORKFLOW_TEMPLATES[categoryName];
      }
    }
  }
  return DEFAULT_TEMPLATE;
}
