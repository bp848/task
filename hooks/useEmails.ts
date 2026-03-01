import { useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, gws } from '../lib/gws';
import { Email } from '../types';

interface DbEmail {
  id: string;
  user_id: string;
  sender: string;
  subject: string;
  snippet: string | null;
  received_at: string;
  is_read: boolean;
  customer_name: string | null;
  project_name: string | null;
  customer_id: string | null;
  created_at: string;
}

function dbToEmail(row: DbEmail): Email {
  return {
    id: row.id,
    sender: row.sender,
    subject: row.subject,
    snippet: row.snippet || '',
    date: new Date(row.received_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    isRead: row.is_read,
    customerName: row.customer_name || undefined,
    projectName: row.project_name || undefined,
  };
}

export type GmailFetchResult = 'success' | 'token_error' | 'cache_fallback';

export function useEmails(session: Session | null) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = session?.user?.id;

  const fetchFromGmail = useCallback(async (): Promise<GmailFetchResult> => {
    if (!session) return 'token_error';
    setLoading(true);

    try {
      const gmailData = await gws.gmail.listMessages({
        maxResults: 10,
        labelIds: ['INBOX'],
      });

      if (gmailData && Array.isArray(gmailData)) {
        const mapped: Email[] = gmailData.map((m: { id: string; from?: string; subject?: string; snippet?: string; date?: string; labelIds?: string[] }) => ({
          id: m.id,
          sender: m.from || '',
          subject: m.subject || '',
          snippet: m.snippet || '',
          date: m.date || new Date().toISOString(),
          isRead: !(m.labelIds ?? []).includes('UNREAD'),
        }));
        setEmails(mapped);

        if (userId && mapped.length > 0) {
          const dbRows = mapped.map(e => ({
            id: e.id,
            user_id: userId,
            sender: e.sender,
            subject: e.subject,
            snippet: e.snippet,
            received_at: new Date().toISOString(),
            is_read: e.isRead,
            customer_name: e.customerName || null,
            project_name: e.projectName || null,
          }));

          await supabase
            .from('emails')
            .upsert(dbRows, { onConflict: 'id' });
        }
      }
      setLoading(false);
      return 'success';
    } catch (err: any) {
      console.error('Failed to fetch Gmail:', err);

      const msg = String(err?.message || '');
      const isTokenError = msg.includes('token') || msg.includes('auth') || msg.includes('401') || msg.includes('403') || err?.reauthenticate;

      if (isTokenError) {
        setLoading(false);
        return 'token_error';
      }

      // Network error: fallback to cache
      if (userId) {
        const { data } = await supabase
          .from('emails')
          .select('*')
          .eq('user_id', userId)
          .order('received_at', { ascending: false })
          .limit(50);

        if (data) {
          setEmails((data as DbEmail[]).map(dbToEmail));
        }
      }

      setLoading(false);
      return 'cache_fallback';
    }
  }, [session, userId]);

  const markAsRead = useCallback(async (emailId: string) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isRead: true } : e));

    if (userId) {
      await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('id', emailId)
        .eq('user_id', userId);
    }
  }, [userId]);

  const clearEmails = useCallback(() => {
    setEmails([]);
  }, []);

  return { emails, loading, fetchFromGmail, markAsRead, setEmails, clearEmails };
}
