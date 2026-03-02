import { SupabaseClient } from '@supabase/supabase-js';
import * as react_jsx_runtime from 'react/jsx-runtime';

declare class GoogleTokenService {
    private readonly supabase;
    private readonly getTokenUrl;
    private cachedToken;
    private tokenExpiresAt;
    constructor(supabase: SupabaseClient, getTokenUrl: string);
    /**
     * 有効な Google access_token を取得する。
     * キャッシュが有効な間は再取得しない。
     */
    getAccessToken(): Promise<string>;
    /** キャッシュをクリアする */
    clearCache(): void;
}

interface GoogleAuthConfig {
    /** Google OAuth Client ID */
    clientId: string;
    /** Redirect URI after OAuth consent */
    redirectUri: string;
    /** OAuth scopes to request */
    scopes?: string[];
    /** Whether to use PKCE (recommended) */
    usePKCE?: boolean;
}
interface GoogleAuthState {
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
}
interface GoogleAccessToken {
    access_token: string;
    expires_in: number;
}
interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
    status?: string;
    htmlLink?: string;
}
interface CalendarListParams {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    calendarId?: string;
    orderBy?: "startTime" | "updated";
    singleEvents?: boolean;
}
interface GmailMessage {
    id: string;
    threadId: string;
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    snippet?: string;
    body?: string;
    labelIds?: string[];
}
interface GmailListParams {
    maxResults?: number;
    q?: string;
    labelIds?: string[];
    pageToken?: string;
}
interface GmailSendParams {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    isHtml?: boolean;
}
interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    size?: string;
    webViewLink?: string;
    iconLink?: string;
    parents?: string[];
}
interface DriveListParams {
    maxResults?: number;
    q?: string;
    orderBy?: string;
    fields?: string;
    pageToken?: string;
}
interface GeminiMessage {
    role: "user" | "model";
    parts: Array<{
        text: string;
    }>;
}
interface GeminiConfig {
    model?: string;
    systemInstruction?: string;
    thinkingConfig?: {
        thinkingBudget?: number;
    };
    tools?: unknown[];
}
interface GeminiResponse {
    text: string;
    candidates?: unknown[];
}
interface GwsKitConfig {
    /** Supabase project URL */
    supabaseUrl: string;
    /** Supabase anon key */
    supabaseAnonKey: string;
    /** Google OAuth config */
    googleAuth?: GoogleAuthConfig;
    /** Supabase Edge Function base URL (defaults to supabaseUrl/functions/v1) */
    edgeFunctionBaseUrl?: string;
}

declare class GoogleCalendarService {
    private readonly getAccessToken;
    constructor(getAccessToken: () => Promise<string>);
    private fetch;
    /** イベント一覧を取得 */
    listEvents(params?: CalendarListParams): Promise<CalendarEvent[]>;
    /** イベントを作成 */
    createEvent(event: CalendarEvent, calendarId?: string): Promise<CalendarEvent>;
    /** イベントを更新 */
    updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId?: string): Promise<CalendarEvent>;
    /** イベントを削除 */
    deleteEvent(eventId: string, calendarId?: string): Promise<void>;
    /** カレンダー一覧を取得 */
    listCalendars(): Promise<Array<{
        id: string;
        summary: string;
    }>>;
}

declare class GoogleGmailService {
    private readonly getAccessToken;
    constructor(getAccessToken: () => Promise<string>);
    private fetch;
    /** メール一覧を取得（ヘッダー付き） */
    listMessages(params?: GmailListParams): Promise<GmailMessage[]>;
    /** メール詳細を取得 */
    getMessage(messageId: string): Promise<GmailMessage>;
    /** メールを送信 */
    sendMessage(params: GmailSendParams): Promise<void>;
    /** スレッド一覧を取得 */
    listThreads(params?: GmailListParams): Promise<Array<{
        id: string;
        snippet: string;
    }>>;
}

declare class GoogleDriveService {
    private readonly getAccessToken;
    constructor(getAccessToken: () => Promise<string>);
    private fetch;
    /** ファイル一覧を取得 */
    listFiles(params?: DriveListParams): Promise<DriveFile[]>;
    /** ファイルを検索 */
    searchFiles(keyword: string, params?: Omit<DriveListParams, "q">): Promise<DriveFile[]>;
    /** ファイルのテキスト内容を取得 */
    getFileContent(fileId: string): Promise<string>;
    /** ファイル情報を取得 */
    getFile(fileId: string): Promise<DriveFile>;
    /** フォルダ一覧を取得 */
    listFolders(parentId?: string): Promise<DriveFile[]>;
}

declare class GeminiService {
    private readonly proxyUrl;
    constructor(proxyUrl: string);
    /**
     * Gemini にメッセージを送信する（Supabase Edge Function proxy 経由）
     */
    chat(messages: GeminiMessage[], config?: GeminiConfig): Promise<GeminiResponse>;
    /**
     * シンプルなテキスト補完
     */
    complete(prompt: string, config?: GeminiConfig): Promise<string>;
    /**
     * 会話履歴を維持したマルチターンチャット
     */
    createConversation(config?: GeminiConfig): {
        send(userMessage: string): Promise<string>;
        getHistory: () => GeminiMessage[];
        clearHistory: () => GeminiMessage[];
    };
}

interface UseGoogleAuthOptions {
    supabase: SupabaseClient;
    config: GoogleAuthConfig;
    /** Supabase Edge Function URL for exchange-google-code */
    exchangeCodeUrl: string;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}
declare function useGoogleAuth({ supabase, config, exchangeCodeUrl, onSuccess, onError, }: UseGoogleAuthOptions): {
    startOAuth: () => Promise<void>;
    handleCallback: (code: string) => Promise<void>;
    disconnect: () => Promise<void>;
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
};

interface GoogleLoginButtonProps {
    supabase: SupabaseClient;
    config: GoogleAuthConfig;
    exchangeCodeUrl: string;
    /** ボタンラベル（デフォルト: "Google でログイン"） */
    label?: string;
    /** 接続済み時のラベル */
    connectedLabel?: string;
    /** 初期接続状態 */
    defaultConnected?: boolean;
    /** 接続成功時 */
    onSuccess?: () => void;
    /** エラー時 */
    onError?: (error: string) => void;
    /** カスタムスタイル */
    style?: React.CSSProperties;
    className?: string;
    /** variant: "default" | "outline" | "minimal" */
    variant?: "default" | "outline" | "minimal";
}
declare function GoogleLoginButton({ supabase, config, exchangeCodeUrl, label, connectedLabel, defaultConnected, onSuccess, onError, style, className, variant, }: GoogleLoginButtonProps): react_jsx_runtime.JSX.Element;
declare function useGoogleAuthCallback({ supabase, exchangeCodeUrl, redirectUri, onSuccess, onError, }: {
    supabase: SupabaseClient;
    exchangeCodeUrl: string;
    redirectUri: string;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}): {
    handleCode: (code: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    isComplete: boolean;
};

declare class GwsKit {
    readonly supabase: SupabaseClient;
    readonly token: GoogleTokenService;
    readonly calendar: GoogleCalendarService;
    readonly gmail: GoogleGmailService;
    readonly drive: GoogleDriveService;
    readonly gemini: GeminiService;
    private readonly baseUrl;
    constructor(config: GwsKitConfig);
    /** OAuth exchange-google-code の URL */
    get exchangeCodeUrl(): string;
}

export { type CalendarEvent, type CalendarListParams, type DriveFile, type DriveListParams, type GeminiConfig, type GeminiMessage, type GeminiResponse, GeminiService, type GmailListParams, type GmailMessage, type GmailSendParams, type GoogleAccessToken, type GoogleAuthConfig, type GoogleAuthState, GoogleCalendarService, GoogleDriveService, GoogleGmailService, GoogleLoginButton, GoogleTokenService, GwsKit, type GwsKitConfig, useGoogleAuth, useGoogleAuthCallback };
